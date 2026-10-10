import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonCalendarBlock, SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";
import { getApiErrorMessage } from "@/services/api/client";
import { toIsoDate } from "@/utils/calendar";
import { toast } from "@/utils/toast";
import {
  getMyAcademicCalendar,
  getMyAcademicCalendarAsFaculty,
  getInstitutionAcademicCalendar,
  type CalendarEventType,
  type MyAcademicCalendar,
  type MyCalendarEvent,
} from "@/services/api/academic-calendar.api";
import {
  listPersonalCalendarEntries,
  createPersonalCalendarEntry,
  updatePersonalCalendarEntry,
  deletePersonalCalendarEntry,
  type PersonalCalendarEntry,
  type PersonalCalendarEntryCategory,
} from "@/services/api/personal-calendar.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

const CATEGORY_LABEL: Record<PersonalCalendarEntryCategory, string> = {
  personal: "Personal",
  reminder: "Reminder",
  meeting: "Meeting",
};

// GET/POST/PATCH/DELETE /me/personal-calendar-entries only allows PRINCIPAL,
// CORRESPONDENT, STUDENT, HOD, FACULTY (see EOS-backend's
// PersonalCalendarController) - every other rawRole this shared screen
// serves (library, finance, academic_coordinator, ...) would just get a 403,
// so the "Add event" feature is hidden for them rather than shown broken.
const CAN_ADD_PERSONAL_EVENTS = new Set(["student", "faculty", "hod"]);

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// calendar_event_type_enum only has these two real values - no "review"/"exam".
const categoryStyle: Record<CalendarEventType, { bg: string; text: string; label: string }> = {
  holiday: { bg: "#E7F7EF", text: "#1E8A5A", label: "Holiday" },
  event: { bg: "#EAF0FD", text: "#2F6FE0", label: "Event" },
};

type LoadStatus = "loading" | "success" | "error";

function buildMonthGrid(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function formatShortMonthYear(dateOnly: string): string {
  const date = new Date(dateOnly);
  return `${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

function formatLongDate(isoDate: string): string {
  const date = new Date(isoDate);
  return `${WEEKDAY_FULL[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function AcademicCalendarHeader({
  onBack,
  onAddEvent,
}: {
  onBack: () => void;
  onAddEvent: (() => void) | null;
}) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Academic Calendar</Text>
      {onAddEvent && (
        <TouchableOpacity style={styles.addEventButton} onPress={onAddEvent} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#2F6FE0" />
          <Text style={styles.addEventButtonText}>Add event</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

// Wired to GET /me/academic-calendar for STUDENTS (real calendar_events for
// the student's own batch + current semester), GET
// /me/faculty-academic-calendar for real Faculty (a faculty member can
// teach into several distinct batch+semester calendars at once, so their
// events are merged/deduped server-side - see
// getMergedAcademicCalendarForFaculty), and GET
// /me/academic-calendar-institution for every other staff role (HoD, HR
// Payroll, Admin, Principal, Library, IQAC, Secretary, ... - none of these
// have an "own" batch/semester to scope a calendar to, so they get the
// institution-wide merge instead - see me-faculty-timetable-roster
// .controller.ts's @Roles on that endpoint). Only "holiday"/"event" types
// exist in the schema - there is no "review"/"exam" category to show.
//
// Branches on the RAW backend role (user.role from the JWT), not the app's
// own collapsed Role enum (see useRole.ts) - that enum deliberately folds
// many distinct backend roles (library/finance/academic_coordinator/
// alumni/...) into a single "employee" bucket for dashboard purposes, which
// would wrongly route all of them into the Faculty-only endpoint here and
// 403. This screen needs to tell "actually teaches" apart from "generic
// staff" precisely, so it reads the unmapped role string directly.
export function AcademicCalendarScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const rawRole = user?.role;
  // Mapped role (not rawRole) for the back-button decision below - the
  // Class tab is hidden for the whole "employee" bucket (faculty, library,
  // finance, academic_coordinator, alumni - see useRole.ts), all of which
  // now reach this screen via the Campus tab, not just literal faculty.
  const role = useRole();

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toIsoDate(today));

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [calendar, setCalendar] = useState<MyAcademicCalendar | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canAddPersonalEvents = CAN_ADD_PERSONAL_EVENTS.has(rawRole ?? "");
  const [personalEntries, setPersonalEntries] = useState<PersonalCalendarEntry[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formEntryId, setFormEntryId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<PersonalCalendarEntryCategory>("personal");
  const categoryPicker = useDropdown();
  const [formDetails, setFormDetails] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const reloadPersonalEntries = useCallback(() => {
    if (!canAddPersonalEvents) return;
    listPersonalCalendarEntries()
      .then(setPersonalEntries)
      .catch(() => toast.error("Couldn't load your own events."));
  }, [canAddPersonalEvents]);

  const load = useCallback(() => {
    setStatus("loading");
    setLoadError(null);
    const request =
      rawRole === "student"
        ? getMyAcademicCalendar()
        : rawRole === "faculty"
          ? getMyAcademicCalendarAsFaculty()
          : getInstitutionAcademicCalendar();
    request
      .then((response) => {
        setCalendar(response);
        setStatus("success");
      })
      .catch((error) => {
        setLoadError(getApiErrorMessage(error, "Couldn't load the academic calendar."));
        setStatus("error");
      });

    reloadPersonalEntries();
  }, [rawRole, reloadPersonalEntries]);

  useEffect(() => {
    load();
  }, [load]);

  function openAddForm() {
    setFormEntryId(null);
    setFormTitle("");
    setFormCategory("personal");
    setFormDetails("");
    setFormOpen(true);
  }

  function openEditForm(entry: PersonalCalendarEntry) {
    setFormEntryId(entry.id);
    setFormTitle(entry.title);
    setFormCategory(entry.category);
    setFormDetails(entry.details ?? "");
    setFormOpen(true);
  }

  function handleSaveEntry() {
    if (!formTitle.trim()) {
      toast.warning("Add a title");
      return;
    }
    setFormSaving(true);
    const input = {
      entry_date: selectedDate,
      title: formTitle.trim(),
      category: formCategory,
      details: formDetails.trim() || undefined,
    };
    const request = formEntryId
      ? updatePersonalCalendarEntry(formEntryId, input)
      : createPersonalCalendarEntry(input);

    request
      .then(() => {
        toast.success(formEntryId ? "Entry updated" : "Event added");
        setFormOpen(false);
        reloadPersonalEntries();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't save this entry.")))
      .finally(() => setFormSaving(false));
  }

  function handleDeleteEntry(id: number) {
    deletePersonalCalendarEntry(id)
      .then(() => {
        setPersonalEntries((prev) => prev.filter((e) => e.id !== id));
        toast.success("Entry deleted");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't delete this entry.")));
  }

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        // An "employee"-mapped staff member, HoD, or HR Payroll reaches this
        // via the Class tab's own Campus grid (a separate tab's Stack) - see
        // TimetableScreen's identical comment for why router.back() alone
        // isn't reliable there. A student has their own dedicated Campus tab
        // instead (this screen's own Stack), where router.back() correctly
        // pops back to Academics. Uses the mapped role here (not rawRole,
        // which the data-fetch above still needs for its own student/
        // faculty/institution branching).
        header: () => (
          <AcademicCalendarHeader
            onBack={() =>
              role === "employee" || role === "hod" || role === "hr-payroll" ? router.replace("/(tabs)/erp") : router.back()
            }
            onAddEvent={canAddPersonalEvents ? openAddForm : null}
          />
        ),
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigation, router, calendar, canAddPersonalEvents]),
  );

  const weeks = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const eventsThisMonth = useMemo(() => {
    if (!calendar) return [];
    return calendar.events
      .filter((e) => {
        const d = new Date(e.event_date);
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
      })
      .sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [calendar, viewMonth, viewYear]);

  const personalEntriesByDate = useMemo(() => {
    const map = new Map<string, PersonalCalendarEntry[]>();
    for (const entry of personalEntries) {
      const key = entry.entry_date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [personalEntries]);

  const selectedDateEntries = personalEntriesByDate.get(selectedDate) ?? [];

  // Institution events use day-of-month numbers (scoped to the viewed
  // month/year already); personal entries carry a full date, so this also
  // filters them down to the viewed month before marking the day dot -
  // otherwise a personal entry on the 15th of a different month would light
  // up the 15th here too.
  const eventDays = useMemo(() => {
    const days = new Set(eventsThisMonth.map((e) => new Date(e.event_date).getDate()));
    for (const entry of personalEntries) {
      const d = new Date(entry.entry_date);
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
        days.add(d.getDate());
      }
    }
    return days;
  }, [eventsThisMonth, personalEntries, viewMonth, viewYear]);

  function goToMonth(delta: number) {
    let month = viewMonth + delta;
    let year = viewYear;
    if (month < 0) {
      month = 11;
      year -= 1;
    } else if (month > 11) {
      month = 0;
      year += 1;
    }
    setViewMonth(month);
    setViewYear(year);
  }

  function selectDay(day: number) {
    setSelectedDate(toIsoDate(new Date(viewYear, viewMonth, day)));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      {status === "loading" && (
        <View style={styles.content}>
          <SkeletonCalendarBlock style={{ marginBottom: 20 }} />
          <SkeletonListRows count={3} />
        </View>
      )}

      {status === "error" && (
        <View style={styles.errorNotice}>
          <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
          <Text style={styles.errorNoticeText}>{loadError ?? "Couldn't load the academic calendar."}</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.calendarCard}>
            <View style={styles.monthNavRow}>
              <TouchableOpacity style={styles.navButton} onPress={() => goToMonth(-1)}>
                <Ionicons name="chevron-back" size={18} color="#2F6FE0" />
              </TouchableOpacity>
              <View style={styles.monthNavCenter}>
                <Text style={styles.monthTitle}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
                <Text style={styles.eventCount}>{eventsThisMonth.length} EVENTS</Text>
              </View>
              <TouchableOpacity style={styles.navButton} onPress={() => goToMonth(1)}>
                <Ionicons name="chevron-forward" size={18} color="#2F6FE0" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, i) => (
                <Text key={`${label}-${i}`} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>

            {weeks.map((week, i) => (
              <View key={i} style={styles.weekRow}>
                {week.map((day, j) => {
                  if (day === null) return <View key={j} style={styles.dayCell} />;
                  const isSelected =
                    canAddPersonalEvents && selectedDate === toIsoDate(new Date(viewYear, viewMonth, day));
                  return (
                    <TouchableOpacity
                      key={j}
                      style={styles.dayCell}
                      activeOpacity={canAddPersonalEvents ? 0.7 : 1}
                      disabled={!canAddPersonalEvents}
                      onPress={() => selectDay(day)}
                    >
                      <View
                        style={[
                          styles.dayCellInner,
                          eventDays.has(day) && styles.dayCellHighlighted,
                          isSelected && styles.dayCellSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            eventDays.has(day) && styles.dayNumberHighlighted,
                            isSelected && styles.dayNumberSelected,
                          ]}
                        >
                          {day}
                        </Text>
                        {eventDays.has(day) && <View style={styles.dayDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>This month</Text>
          {eventsThisMonth.length > 0 && (
            <View style={styles.listCard}>
              {eventsThisMonth.map((event, index) => (
                <EventCard key={event.id} event={event} isFirst={index === 0} />
              ))}
            </View>
          )}
          {eventsThisMonth.length === 0 && <Text style={styles.noEvents}>No events this month.</Text>}

          {canAddPersonalEvents && (
            <View style={styles.personalCard}>
              <Text style={styles.sectionTitle}>Your events</Text>
              <Text style={styles.selectedDateLabel}>{formatLongDate(selectedDate)}</Text>

              {formOpen && (
                <View style={styles.formBlock}>
                  <Text style={styles.fieldLabel}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Project submission reminder"
                    placeholderTextColor="#9AA6B2"
                    value={formTitle}
                    onChangeText={setFormTitle}
                  />

                  <Text style={styles.fieldLabel}>Mark this as</Text>
                  <View ref={categoryPicker.anchorRef} collapsable={false}>
                    <TouchableOpacity style={styles.selectInput} onPress={categoryPicker.open} activeOpacity={0.8}>
                      <Text style={styles.selectInputText}>{CATEGORY_LABEL[formCategory]}</Text>
                      <Ionicons name="chevron-down" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.fieldLabel}>Details (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Venue, time, notes"
                    placeholderTextColor="#9AA6B2"
                    value={formDetails}
                    onChangeText={setFormDetails}
                  />

                  <TouchableOpacity
                    style={[styles.saveButton, formSaving && styles.saveButtonDisabled]}
                    onPress={handleSaveEntry}
                    disabled={formSaving}
                    activeOpacity={0.85}
                  >
                    {formSaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>{formEntryId ? "Save changes" : "Add event"}</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelFormButton} onPress={() => setFormOpen(false)}>
                    <Text style={styles.cancelFormButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedDateEntries.length === 0 ? (
                <Text style={styles.noEvents}>No events of your own for this date yet.</Text>
              ) : (
                selectedDateEntries.map((entry) => (
                  <View key={entry.id} style={styles.personalRow}>
                    <View style={styles.personalBadge}>
                      <Ionicons name="person-outline" size={14} color="#7E22CE" />
                    </View>
                    <View style={styles.personalTextWrap}>
                      <Text style={styles.personalTitle} numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text style={styles.personalMeta}>
                        {CATEGORY_LABEL[entry.category]}
                        {entry.details ? ` · ${entry.details}` : ""}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => openEditForm(entry)} hitSlop={8} style={styles.personalIconButton}>
                      <Ionicons name="create-outline" size={16} color="#2F6FE0" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteEntry(entry.id)}
                      hitSlop={8}
                      style={styles.personalIconButton}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      <AnchoredDropdown
        anchorRef={categoryPicker.anchorRef}
        visible={categoryPicker.visible}
        onClose={categoryPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Mark this as</Text>
        {(Object.keys(CATEGORY_LABEL) as PersonalCalendarEntryCategory[]).map((category) => (
          <TouchableOpacity
            key={category}
            style={styles.modalOptionRow}
            onPress={() => {
              setFormCategory(category);
              categoryPicker.close();
            }}
          >
            <Text style={styles.modalOptionName}>{CATEGORY_LABEL[category]}</Text>
            {category === formCategory && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
        ))}
      </AnchoredDropdown>
    </SafeAreaView>
  );
}

function EventCard({ event, isFirst }: { event: MyCalendarEvent; isFirst: boolean }) {
  const { bg, text, label } = categoryStyle[event.event_type];
  const date = new Date(event.event_date);

  return (
    <View style={[styles.eventCard, !isFirst && styles.rowDivider]}>
      <View style={styles.eventDateCol}>
        <Text style={styles.eventDay}>{date.getDate()}</Text>
        <Text style={styles.eventMonth}>{MONTH_NAMES[date.getMonth()].slice(0, 3).toUpperCase()}</Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventWeekday}>{WEEKDAY_FULL[date.getDay()]}</Text>
      </View>
      <View style={[styles.eventBadge, { backgroundColor: bg }]}>
        <Text style={[styles.eventBadgeText, { color: text }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  addEventButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addEventButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 20,
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavCenter: {
    alignItems: "center",
  },
  monthTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  eventCount: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#B0B7C3",
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  dayCellInner: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayCellHighlighted: {
    backgroundColor: "#EAF0FD",
  },
  dayCellSelected: {
    backgroundColor: "#2F6FE0",
  },
  dayNumber: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: "#111827",
  },
  dayNumberHighlighted: {
    fontFamily: fonts.bold,
    color: "#1A3D8F",
  },
  dayNumberSelected: {
    fontFamily: fonts.bold,
    color: "#fff",
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2F6FE0",
    position: "absolute",
    bottom: 5,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  eventDateCol: {
    width: 40,
    alignItems: "center",
  },
  eventDay: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  eventMonth: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  eventWeekday: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    marginTop: 2,
  },
  eventBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eventBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  noEvents: {
    fontFamily: fonts.regular,
    color: "#999",
    textAlign: "center",
    marginTop: 24,
  },
  personalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginTop: 8,
  },
  selectedDateLabel: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
    marginBottom: 14,
  },
  formBlock: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 14,
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  selectInputText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 12,
    paddingVertical: 13,
  },
  saveButtonDisabled: {
    backgroundColor: "#B7CBE6",
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  cancelFormButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelFormButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  personalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  personalBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  personalTextWrap: {
    flex: 1,
  },
  personalTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  personalMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    marginTop: 2,
  },
  personalIconButton: {
    padding: 4,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    maxHeight: "70%",
  },
  anchoredCard: {
    width: 220,
    maxHeight: 260,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
