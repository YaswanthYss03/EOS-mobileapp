import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { confirm } from "@/utils/confirm";
import { getApiErrorMessage } from "@/services/api/client";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  getHodTimetable,
  setHodTimetableSlot,
  clearHodTimetableSlot,
  type HodTimetableOverview,
  type HodTimetableCell,
  type HodTimetableClass,
} from "@/services/api/hod-timetable.api";

type LoadStatus = "loading" | "success" | "error";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(hhmm: string): string {
  const [hourStr, minute] = hhmm.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

// Department-wide Timetable Allocation for HOD - real slot CRUD backend
// (HodTimetableService: GET/PUT/DELETE /hod/timetable*, department +
// academic-year scoped). Mirrors FacultyTimetableRosterScreen's visual
// conventions (day pills, period cards) but this one is editable: tapping
// a period opens a subject+faculty picker that writes straight back to
// timetable_slots. A period_number only exists here once some slot for it
// already exists on some day for this class (see setSlot's own
// NO_PERIOD_TIMING rejection) - there's no separate period-timing input on
// this screen, so a class with zero slots at all shows an empty state
// instead of an editable blank grid.
export function HodTimetableAllocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const todayDow = useMemo(() => new Date().getDay(), []);
  const defaultDayOfWeek = todayDow >= 1 && todayDow <= 6 ? todayDow : 1;

  const [overview, setOverview] = useState<HodTimetableOverview | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(defaultDayOfWeek);
  const [classPickerVisible, setClassPickerVisible] = useState(false);

  const [editing, setEditing] = useState<{ periodNumber: number; cell: HodTimetableCell } | null>(null);
  const [editStep, setEditStep] = useState<"subject" | "faculty">("subject");
  const [editSubjectId, setEditSubjectId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback((classId?: number) => {
    setStatus("loading");
    setError(null);
    getHodTimetable(classId)
      .then((response) => {
        setOverview(response);
        setSelectedClassId(response.selected_class_id);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load the timetable."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function selectClass(cls: HodTimetableClass) {
    setClassPickerVisible(false);
    load(cls.class_id);
  }

  const selectedClass = overview?.classes.find((c) => c.class_id === selectedClassId) ?? null;

  const selectedDayCells = useMemo(
    () => overview?.rows.find((r) => r.day_of_week === selectedDayOfWeek)?.cells ?? [],
    [overview, selectedDayOfWeek],
  );

  function openEditor(periodNumber: number, cell: HodTimetableCell) {
    setEditing({ periodNumber, cell });
    setEditStep("subject");
    setEditSubjectId(cell.type !== "free" ? cell.subject_id : null);
  }

  function closeEditor() {
    setEditing(null);
    setEditStep("subject");
    setEditSubjectId(null);
  }

  async function saveSlot(facultyId: number) {
    if (!overview || !editing || !selectedClassId || editSubjectId == null) return;
    setSaving(true);
    try {
      await setHodTimetableSlot({
        classId: selectedClassId,
        dayOfWeek: selectedDayOfWeek,
        periodNumber: editing.periodNumber,
        subjectId: editSubjectId,
        facultyId,
      });
      toast.success("Timetable updated");
      closeEditor();
      load(selectedClassId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't save this slot."));
    } finally {
      setSaving(false);
    }
  }

  async function removeSlot(slotId: number) {
    const ok = await confirm({
      title: "Remove this period?",
      message: "This clears the subject and faculty assigned to this period.",
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await clearHodTimetableSlot(slotId);
      toast.success("Period cleared");
      closeEditor();
      load(selectedClassId ?? undefined);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't clear this period."));
    } finally {
      setSaving(false);
    }
  }

  const editSubject = overview?.subjects.find((s) => s.subject_id === editSubjectId) ?? null;
  const facultyChoices = useMemo(() => {
    if (!overview) return [];
    if (editSubject && editSubject.faculty_ids.length > 0) {
      return overview.faculty_options.filter((f) => editSubject.faculty_ids.includes(f.faculty_id));
    }
    return overview.faculty_options;
  }, [overview, editSubject]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <BackHeader title="Timetable Allocation" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        {status === "loading" && <SkeletonListRows count={5} />}

        {status === "error" && (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.emptyStateText}>{error ?? "Something went wrong."}</Text>
            <TouchableOpacity onPress={() => load(selectedClassId ?? undefined)} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "success" && overview && (
          <>
            <TouchableOpacity
              style={styles.classCard}
              onPress={() => setClassPickerVisible(true)}
              activeOpacity={0.8}
              disabled={overview.classes.length === 0}
            >
              <View style={styles.classIconWrap}>
                <Ionicons name="school-outline" size={18} color="#2F6FE0" />
              </View>
              <View style={styles.classCardTextWrap}>
                <Text style={styles.classCardTitle}>
                  {selectedClass ? selectedClass.label : "No classes in this department"}
                </Text>
                <Text style={styles.classCardSubtitle}>
                  {overview.classes.length > 0 ? "Tap to change class" : "Nothing to allocate yet"}
                </Text>
              </View>
              {overview.classes.length > 0 && <Ionicons name="chevron-down" size={18} color="#9AA6B2" />}
            </TouchableOpacity>

            {overview.columns.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>
                  {selectedClass
                    ? "This class has no timetable periods yet. Periods are created from an existing period's timing, so an initial timetable must be set up first."
                    : "Select a class to view its timetable."}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.daySelector}>
                  {DAY_LABELS.map((label, index) => {
                    const dayOfWeek = index + 1;
                    const selected = dayOfWeek === selectedDayOfWeek;
                    return (
                      <TouchableOpacity
                        key={dayOfWeek}
                        style={[styles.dayPill, selected && styles.dayPillSelected]}
                        onPress={() => setSelectedDayOfWeek(dayOfWeek)}
                      >
                        <Text style={[styles.dayPillLabel, selected && styles.dayPillLabelSelected]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {selectedDayCells.map((cell) => {
                  const column = overview.columns.find((c) => c.period_number === cell.period_number);
                  return (
                    <TouchableOpacity
                      key={cell.period_number}
                      style={[styles.periodCard, cell.type === "free" && styles.periodCardFree]}
                      onPress={() => openEditor(cell.period_number, cell)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.periodTimeCol}>
                        <Text style={cell.type === "free" ? styles.periodTimeFree : styles.periodTime}>
                          {column ? formatTime(column.start_time) : "—"}
                        </Text>
                        <Text style={styles.periodLabel}>Period {cell.period_number}</Text>
                      </View>
                      <View style={styles.periodInfo}>
                        {cell.type === "free" ? (
                          <>
                            <Text style={styles.periodSubjectFree}>Free hour</Text>
                            <Text style={styles.periodMeta}>Tap to assign a subject</Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.periodSubject}>
                              {cell.subject_name}
                              {cell.type === "lab" ? " (Lab)" : ""}
                            </Text>
                            <Text style={styles.periodMeta}>
                              {cell.faculty_name}
                              {cell.venue_name ? ` · ${cell.venue_name}` : ""}
                            </Text>
                          </>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#B0B7C3" />
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Class picker */}
      <Modal
        visible={classPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setClassPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select class</Text>
              <TouchableOpacity onPress={() => setClassPickerVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {(overview?.classes ?? []).map((cls) => (
                <TouchableOpacity
                  key={cls.class_id}
                  style={styles.modalRow}
                  onPress={() => selectClass(cls)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.modalRowTitle}>{cls.label}</Text>
                  {cls.class_id === selectedClassId && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Slot editor: subject, then faculty */}
      <Modal visible={editing !== null} animationType="slide" transparent onRequestClose={closeEditor}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              {editStep === "faculty" && (
                <TouchableOpacity onPress={() => setEditStep("subject")} hitSlop={8}>
                  <Ionicons name="arrow-back" size={20} color="#111827" />
                </TouchableOpacity>
              )}
              <Text style={styles.modalTitle}>
                {editStep === "subject"
                  ? `Period ${editing?.periodNumber ?? ""} · Subject`
                  : `Period ${editing?.periodNumber ?? ""} · Faculty`}
              </Text>
              <TouchableOpacity onPress={closeEditor} hitSlop={8}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {editStep === "subject" &&
                (overview?.subjects ?? []).map((subject) => (
                  <TouchableOpacity
                    key={subject.subject_id}
                    style={styles.modalRow}
                    onPress={() => {
                      setEditSubjectId(subject.subject_id);
                      setEditStep("faculty");
                    }}
                    activeOpacity={0.75}
                  >
                    <View>
                      <Text style={styles.modalRowTitle}>{subject.name}</Text>
                      <Text style={styles.modalRowSubtitle}>{subject.code}</Text>
                    </View>
                    {subject.subject_id === editSubjectId && (
                      <Ionicons name="checkmark" size={18} color="#2F6FE0" />
                    )}
                  </TouchableOpacity>
                ))}

              {editStep === "subject" && (overview?.subjects ?? []).length === 0 && (
                <Text style={styles.modalEmptyText}>No subjects mapped to this class.</Text>
              )}

              {editStep === "faculty" &&
                facultyChoices.map((faculty) => (
                  <TouchableOpacity
                    key={faculty.faculty_id}
                    style={styles.modalRow}
                    onPress={() => saveSlot(faculty.faculty_id)}
                    activeOpacity={0.75}
                    disabled={saving}
                  >
                    <Text style={styles.modalRowTitle}>{faculty.name}</Text>
                    {editing?.cell.type !== "free" &&
                      editing?.cell.faculty_id === faculty.faculty_id && (
                        <Ionicons name="checkmark" size={18} color="#2F6FE0" />
                      )}
                  </TouchableOpacity>
                ))}

              {editStep === "faculty" && facultyChoices.length === 0 && (
                <Text style={styles.modalEmptyText}>No active faculty available in this department.</Text>
              )}
            </ScrollView>

            {editStep === "faculty" && editing && editing.cell.type !== "free" && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => editing.cell.type !== "free" && removeSlot(editing.cell.slot_id)}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={styles.removeButtonText}>Remove this period</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
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
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  classIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  classCardTextWrap: {
    flex: 1,
  },
  classCardTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  classCardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  daySelector: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dayPillSelected: {
    borderColor: "#2F6FE0",
    borderWidth: 1.5,
  },
  dayPillLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  dayPillLabelSelected: {
    color: "#2F6FE0",
  },
  periodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  periodCardFree: {
    backgroundColor: "#FAFAFB",
  },
  periodTimeCol: {
    width: 64,
  },
  periodTime: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  periodTimeFree: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
  },
  periodLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  periodInfo: {
    flex: 1,
  },
  periodSubject: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  periodSubjectFree: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
  },
  periodMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    textAlign: "center",
  },
  modalList: {
    marginTop: 4,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalRowTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  modalRowSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 3,
  },
  modalEmptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
    paddingVertical: 24,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  removeButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#DC2626",
  },
});
