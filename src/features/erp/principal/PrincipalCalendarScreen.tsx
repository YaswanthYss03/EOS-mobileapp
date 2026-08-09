import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES, formatDate, toIsoDate } from "@/utils/calendar";
import {
  getInstitutionAcademicCalendar,
  type MyAcademicCalendar,
} from "@/services/api/academic-calendar.api";
import { getDrivesForCalendar, type CalendarDrive } from "@/services/api/placements.api";
import {
  listPersonalCalendarEntries,
  createPersonalCalendarEntry,
  updatePersonalCalendarEntry,
  deletePersonalCalendarEntry,
  type PersonalCalendarEntry,
  type PersonalCalendarEntryCategory,
} from "@/services/api/personal-calendar.api";

type LoadStatus = "loading" | "success" | "error";

// One shape for everything that can land on a day - the institution's real
// holidays/events (calendar_events, read-only), every real placement drive
// (placement_drives.scheduled_date, read-only, company-masking respected -
// see getDrivesForCalendar), and the Principal's own private entries
// (personal_calendar_entries, editable). Distinct `kind`s only exist to
// pick a badge color/icon and whether edit/delete applies - never a
// database value.
type MergedItem =
  | { kind: "holiday"; id: string; date: string; title: string }
  | { kind: "event"; id: string; date: string; title: string }
  | { kind: "drive"; id: string; date: string; title: string }
  | { kind: "personal"; id: string; date: string; title: string; entry: PersonalCalendarEntry };

const CATEGORY_LABEL: Record<PersonalCalendarEntryCategory, string> = {
  personal: "Personal",
  reminder: "Reminder",
  meeting: "Meeting",
};

const KIND_STYLE: Record<MergedItem["kind"], { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  holiday: { bg: "#E7F7EF", text: "#1E8A5A", icon: "sunny-outline" },
  event: { bg: "#EAF0FD", text: "#2F6FE0", icon: "megaphone-outline" },
  drive: { bg: "#FEF3C7", text: "#B45309", icon: "briefcase-outline" },
  personal: { bg: "#F3E8FF", text: "#7E22CE", icon: "person-outline" },
};

// Principal's academic calendar - the institution's real read-only calendar
// (holidays/events + every real placement drive date, both merged in here)
// with the Principal's own private planner entries layered on top. Never
// lets the Principal edit the institution's own entries directly (see
// PersonalCalendarService's own comment) - only their own entries. Replaces
// the earlier batch/semester CRUD editor, which edited the raw institution
// calendar_events directly - that capability still exists for Academic
// Coordinator, just no longer surfaced here.
export function PrincipalCalendarScreen() {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(toIsoDate(today));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const [calendar, setCalendar] = useState<MyAcademicCalendar | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<LoadStatus>("loading");

  const [drives, setDrives] = useState<CalendarDrive[]>([]);
  const [drivesStatus, setDrivesStatus] = useState<LoadStatus>("loading");

  const [personalEntries, setPersonalEntries] = useState<PersonalCalendarEntry[]>([]);
  const [personalStatus, setPersonalStatus] = useState<LoadStatus>("loading");

  const [formOpen, setFormOpen] = useState(false);
  const [formEntryId, setFormEntryId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<PersonalCalendarEntryCategory>("personal");
  const [formCategoryPickerOpen, setFormCategoryPickerOpen] = useState(false);
  const [formDetails, setFormDetails] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const load = useCallback(() => {
    setCalendarStatus("loading");
    getInstitutionAcademicCalendar()
      .then((response) => {
        setCalendar(response);
        setCalendarStatus("success");
      })
      .catch(() => setCalendarStatus("error"));

    setDrivesStatus("loading");
    getDrivesForCalendar()
      .then((response) => {
        setDrives(response);
        setDrivesStatus("success");
      })
      .catch(() => setDrivesStatus("error"));

    setPersonalStatus("loading");
    listPersonalCalendarEntries()
      .then((response) => {
        setPersonalEntries(response);
        setPersonalStatus("success");
      })
      .catch(() => setPersonalStatus("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reloadPersonalEntries = useCallback(() => {
    listPersonalCalendarEntries()
      .then(setPersonalEntries)
      .catch(() => toast.error("Couldn't refresh your entries."));
  }, []);

  const allItems = useMemo<MergedItem[]>(() => {
    const holidayEvents: MergedItem[] = (calendar?.events ?? []).map((e) => ({
      kind: e.event_type,
      id: `inst-${e.id}`,
      date: e.event_date.slice(0, 10),
      title: e.title,
    }));
    const driveItems: MergedItem[] = drives.map((d) => ({
      kind: "drive",
      id: `drive-${d.drive_id}`,
      date: d.scheduled_date.slice(0, 10),
      title: `${d.company_name} Drive`,
    }));
    const personalItems: MergedItem[] = personalEntries.map((entry) => ({
      kind: "personal",
      id: `personal-${entry.id}`,
      date: entry.entry_date.slice(0, 10),
      title: entry.title,
      entry,
    }));
    return [...holidayEvents, ...driveItems, ...personalItems];
  }, [calendar, drives, personalEntries]);

  const weeks = useMemo(() => getCalendarWeeks(viewYear, viewMonth), [viewYear, viewMonth]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, MergedItem[]>();
    for (const item of allItems) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [allItems]);

  const selectedDateItems = itemsByDate.get(selectedDate) ?? [];
  const selectedInstitutionItems = selectedDateItems.filter((i) => i.kind !== "personal");
  const selectedPersonalItems = selectedDateItems.filter(
    (i): i is Extract<MergedItem, { kind: "personal" }> => i.kind === "personal",
  );

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

  const rangeText =
    calendar?.start_date && calendar?.end_date
      ? `${formatDate(new Date(calendar.start_date))} – ${formatDate(new Date(calendar.end_date))}`
      : null;
  // The merged institution calendar spans every batch/semester at once, so
  // there's rarely one single semester number to show (see
  // getInstitutionAcademicCalendar's own "null when not uniform"
  // convention) - shown only when it genuinely is one value, never guessed.
  const calendarSubtitle =
    calendar?.semester != null && rangeText
      ? `Semester ${calendar.semester} · ${rangeText}`
      : rangeText;

  const isLoading = calendarStatus === "loading" || drivesStatus === "loading" || personalStatus === "loading";
  const hasError = calendarStatus === "error" || drivesStatus === "error" || personalStatus === "error";

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Events</Text>
          <Text style={styles.headerSubtitle}>
            Academic calendar · holidays, industrial talks, placement drives and examinations
          </Text>
        </View>
        <TouchableOpacity style={styles.addEventButton} onPress={openAddForm} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addEventButtonText}>Add event</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      )}

      {!isLoading && hasError && (
        <View style={styles.errorNotice}>
          <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
          <Text style={styles.errorNoticeText}>Couldn't load the calendar.</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !hasError && (
        <>
          <View style={styles.calendarCard}>
            <View style={styles.monthNavRow}>
              <TouchableOpacity style={styles.navButton} onPress={() => goToMonth(-1)}>
                <Ionicons name="chevron-back" size={18} color="#2F6FE0" />
              </TouchableOpacity>
              <View style={styles.monthNavCenter}>
                <Text style={styles.monthTitle}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>
                {calendarSubtitle && <Text style={styles.monthSubtitle}>{calendarSubtitle}</Text>}
              </View>
              <TouchableOpacity style={styles.navButton} onPress={() => goToMonth(1)}>
                <Ionicons name="chevron-forward" size={18} color="#2F6FE0" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.monthPickerButton} onPress={() => setMonthPickerOpen(true)}>
                <Text style={styles.monthPickerButtonText}>{MONTH_NAMES[viewMonth].slice(0, 3)}</Text>
                <Ionicons name="chevron-down" size={14} color="#2F6FE0" />
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
                  const dateStr = toIsoDate(new Date(viewYear, viewMonth, day));
                  const items = itemsByDate.get(dateStr) ?? [];
                  const isToday = dateStr === toIsoDate(today);
                  const isSelected = dateStr === selectedDate;
                  const first = items[0];
                  return (
                    <TouchableOpacity key={j} style={styles.dayCell} onPress={() => selectDay(day)} activeOpacity={0.7}>
                      <View
                        style={[
                          styles.dayCellInner,
                          isToday && styles.dayCellToday,
                          isSelected && styles.dayCellSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            isToday && styles.dayNumberToday,
                            isSelected && styles.dayNumberSelected,
                          ]}
                        >
                          {day}
                        </Text>
                        {first && (
                          <View style={[styles.dayChip, { backgroundColor: KIND_STYLE[first.kind].bg }]}>
                            <Text
                              style={[styles.dayChipText, { color: KIND_STYLE[first.kind].text }]}
                              numberOfLines={1}
                            >
                              {first.title}
                            </Text>
                          </View>
                        )}
                        {items.length > 1 && <Text style={styles.dayMoreText}>+{items.length - 1}</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.selectedCard}>
            <Text style={styles.selectedLabel}>SELECTED</Text>
            <Text style={styles.selectedDate}>{formatDate(new Date(selectedDate))}</Text>
            <Text style={styles.selectedHint}>
              Add your own entry for this date. Institution entries are read-only.
            </Text>

            {selectedInstitutionItems.length > 0 && (
              <View style={styles.institutionList}>
                {selectedInstitutionItems.map((item) => (
                  <View key={item.id} style={[styles.institutionRow, { backgroundColor: KIND_STYLE[item.kind].bg }]}>
                    <Ionicons name={KIND_STYLE[item.kind].icon} size={14} color={KIND_STYLE[item.kind].text} />
                    <Text style={[styles.institutionRowText, { color: KIND_STYLE[item.kind].text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Ionicons name="lock-closed" size={12} color={KIND_STYLE[item.kind].text} />
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Governing council meeting"
              placeholderTextColor="#9AA6B2"
              value={formTitle}
              onChangeText={setFormTitle}
            />

            <Text style={styles.fieldLabel}>Mark this date as</Text>
            <TouchableOpacity style={styles.selectInput} onPress={() => setFormCategoryPickerOpen(true)} activeOpacity={0.8}>
              <Text style={styles.selectInputText}>{CATEGORY_LABEL[formCategory]}</Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Venue, audience, time"
              placeholderTextColor="#9AA6B2"
              value={formDetails}
              onChangeText={setFormDetails}
            />

            <TouchableOpacity
              style={[styles.addButton, formSaving && styles.addButtonDisabled]}
              onPress={handleSaveEntry}
              disabled={formSaving}
              activeOpacity={0.85}
            >
              {formSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addButtonText}>{formEntryId ? "Save changes" : "Add event"}</Text>
              )}
            </TouchableOpacity>

            {formEntryId !== null && (
              <TouchableOpacity style={styles.cancelEditButton} onPress={openAddForm}>
                <Text style={styles.cancelEditButtonText}>Cancel editing, add a new entry instead</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.newEventSectionTitle}>New event on this date</Text>
            {selectedPersonalItems.length === 0 ? (
              <Text style={styles.emptyPersonalText}>No entries of your own yet for this date.</Text>
            ) : (
              selectedPersonalItems.map((item) => (
                <View key={item.id} style={styles.personalRow}>
                  <View style={[styles.personalBadge, { backgroundColor: KIND_STYLE.personal.bg }]}>
                    <Ionicons name={KIND_STYLE.personal.icon} size={14} color={KIND_STYLE.personal.text} />
                  </View>
                  <View style={styles.personalTextWrap}>
                    <Text style={styles.personalTitle} numberOfLines={1}>
                      {item.entry.title}
                    </Text>
                    <Text style={styles.personalMeta}>
                      {CATEGORY_LABEL[item.entry.category]}
                      {item.entry.details ? ` · ${item.entry.details}` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => openEditForm(item.entry)} hitSlop={8} style={styles.personalIconButton}>
                    <Ionicons name="create-outline" size={16} color="#2F6FE0" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteEntry(item.entry.id)} hitSlop={8} style={styles.personalIconButton}>
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {/* Month picker */}
      <Modal visible={monthPickerOpen} transparent animationType="fade" onRequestClose={() => setMonthPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMonthPickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Jump to month</Text>
            <ScrollView style={styles.modalList}>
              {MONTH_NAMES.map((name, index) => (
                <TouchableOpacity
                  key={name}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    setViewMonth(index);
                    setMonthPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalOptionName}>{name}</Text>
                  {index === viewMonth && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Category picker */}
      <Modal
        visible={formCategoryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFormCategoryPickerOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFormCategoryPickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Mark this date as</Text>
            {(Object.keys(CATEGORY_LABEL) as PersonalCalendarEntryCategory[]).map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.modalOptionRow}
                onPress={() => {
                  setFormCategory(category);
                  setFormCategoryPickerOpen(false);
                }}
              >
                <Text style={styles.modalOptionName}>{CATEGORY_LABEL[category]}</Text>
                {category === formCategory && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    marginTop: 4,
    lineHeight: 17,
  },
  addEventButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2F6FE0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addEventButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  inlineLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  retryButton: {
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
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    flex: 1,
  },
  monthTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  monthSubtitle: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 1,
  },
  monthPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  monthPickerButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#B0B7C3",
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 3,
  },
  dayCellInner: {
    width: "94%",
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    paddingTop: 4,
    gap: 2,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
  },
  dayCellSelected: {
    backgroundColor: "#EAF0FD",
  },
  dayNumber: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#111827",
  },
  dayNumberToday: {
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  dayNumberSelected: {
    fontFamily: fonts.bold,
    color: "#1A3D8F",
  },
  dayChip: {
    width: "100%",
    borderRadius: 5,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  dayChipText: {
    fontSize: 8,
    fontFamily: fonts.bold,
    textAlign: "center",
  },
  dayMoreText: {
    fontSize: 8,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  selectedCard: {
    backgroundColor: "#F7F9FE",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4EBFB",
    padding: 16,
  },
  selectedLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 1,
  },
  selectedDate: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 2,
  },
  selectedHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 17,
  },
  institutionList: {
    gap: 6,
    marginBottom: 14,
  },
  institutionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  institutionRowText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
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
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
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
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  selectInputText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  addButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    paddingVertical: 14,
  },
  addButtonDisabled: {
    backgroundColor: "#9AB3E8",
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  cancelEditButton: {
    alignItems: "center",
    marginTop: 10,
  },
  cancelEditButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  newEventSectionTitle: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyPersonalText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  personalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  personalBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    color: "#9AA6B2",
    marginTop: 1,
  },
  personalIconButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  modalList: {
    marginBottom: 4,
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
