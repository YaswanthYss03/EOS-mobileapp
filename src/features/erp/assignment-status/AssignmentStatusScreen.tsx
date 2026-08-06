import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getHandledClasses,
  getAssignmentsFor,
  getAssignmentStudents,
  markAssignmentSubmission,
  type HandledClass,
  type Assignment,
  type AssignmentStudent,
} from "@/services/api/assignment-status.api";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// academic_year is load-bearing here, not decoration - a faculty who has
// taught the same subject to several successive batches gets one mapping
// row per batch, all sharing the same department/section/subject (confirmed
// live: one real faculty had 60 such rows). Without the year, two entries
// for a graduated batch and the current one are visually identical, and
// picking the wrong one silently shows "no assignments" for a class that
// genuinely has none, instead of the intended live one.
function classLabel(mapping: HandledClass): string {
  return `${mapping.department_name} · ${mapping.section} — ${mapping.subject_name} (${mapping.academic_year})`;
}

function assignmentLabel(assignment: Assignment): string {
  return assignment.title ?? `Assignment ${assignment.sequence_no}`;
}

// Wired to EOS-backend's assignments/student-assignment-status modules (see
// @/services/api/assignment-status.api.ts). There's no dedicated "no due"
// clearance table backing this tile - the real per-student boolean this
// screen marks is assignments/student_assignment_status.is_submitted, so
// it's built around that: pick a (class, subject) you're mapped to teach,
// pick which assignment, then mark every mapped student submitted or not.
// Reachable from the Employee dashboard's Student "Assignment Status" item
// (this tile used to be labelled "No-Due" and opened a department-wide
// clearance checklist - that screen still exists for the HoD's own
// "No-Due" item, see erp/no-due/NoDueScreen.tsx, untouched by this change).
export function AssignmentStatusScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [classes, setClasses] = useState<HandledClass[] | null>(null);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesErrored, setClassesErrored] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [classSearch, setClassSearch] = useState("");
  const [selectedMapping, setSelectedMapping] = useState<HandledClass | null>(null);

  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsErrored, setAssignmentsErrored] = useState(false);
  const [assignmentPickerOpen, setAssignmentPickerOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const [students, setStudents] = useState<AssignmentStudent[] | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsErrored, setStudentsErrored] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  useEffect(() => {
    let cancelled = false;
    setClassesLoading(true);
    setClassesErrored(false);

    getHandledClasses()
      .then((data) => {
        if (cancelled) return;
        setClasses(data);
        // A faculty who only handles one (class, subject) doesn't need to
        // tap through a picker to reach it.
        if (data.length === 1) setSelectedMapping(data[0]);
      })
      .catch((error) => {
        if (cancelled) return;
        setClassesErrored(true);
        toast.error(getApiErrorMessage(error, "Couldn't load your classes. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedMapping) {
      setAssignments(null);
      setSelectedAssignment(null);
      return;
    }
    let cancelled = false;
    setAssignmentsLoading(true);
    setAssignmentsErrored(false);
    setSelectedAssignment(null);
    setStudents(null);

    getAssignmentsFor(selectedMapping.class_id, selectedMapping.subject_id)
      .then((data) => {
        if (cancelled) return;
        setAssignments(data);
        if (data.length === 1) setSelectedAssignment(data[0]);
      })
      .catch((error) => {
        if (cancelled) return;
        setAssignmentsErrored(true);
        toast.error(getApiErrorMessage(error, "Couldn't load assignments for this class. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setAssignmentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMapping]);

  useEffect(() => {
    if (!selectedAssignment) {
      setStudents(null);
      return;
    }
    let cancelled = false;
    setStudentsLoading(true);
    setStudentsErrored(false);

    getAssignmentStudents(selectedAssignment.id)
      .then((data) => {
        if (!cancelled) setStudents(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setStudentsErrored(true);
        toast.error(getApiErrorMessage(error, "Couldn't load students for this assignment. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAssignment]);

  const submittedCount = useMemo(() => (students ?? []).filter((s) => s.is_submitted).length, [students]);

  // A faculty who has taught the same subject across several batches gets
  // one row per batch - confirmed live at 60 rows for a single faculty, all
  // sharing the same department/section/subject text - so this list needs
  // to be searchable, not just scrollable.
  const filteredClasses = useMemo(() => {
    const list = classes ?? [];
    const query = classSearch.trim().toLowerCase();
    if (!query) return list;
    return list.filter((mapping) => classLabel(mapping).toLowerCase().includes(query));
  }, [classes, classSearch]);

  function handleToggle(student: AssignmentStudent) {
    if (!selectedAssignment) return;
    setMarkingId(student.student_id);
    markAssignmentSubmission(student.status_id, selectedAssignment.id, student.student_id, !student.is_submitted)
      .then((updated) => {
        setStudents((prev) =>
          prev
            ? prev.map((s) =>
                s.student_id === student.student_id
                  ? { ...s, status_id: updated.id, is_submitted: updated.is_submitted, marked_at: updated.marked_at }
                  : s,
              )
            : prev,
        );
      })
      .catch((error) => toast.error(getApiErrorMessage(error, "Couldn't update this student. Please try again.")))
      .finally(() => setMarkingId(null));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Assignment Status</Text>
          <Text style={styles.headerSubtitle}>Submission tracking</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>Class &amp; subject</Text>
        {classesLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color="#2F6FE0" />
          </View>
        ) : classesErrored ? (
          <Text style={styles.errorText}>Couldn't load your classes.</Text>
        ) : classes && classes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={28} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>You aren't mapped to teach any class yet.</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.pickerButton} onPress={() => setClassPickerOpen(true)} activeOpacity={0.8}>
            <Ionicons name="school-outline" size={16} color="#2F6FE0" />
            <Text style={[styles.pickerButtonText, !selectedMapping && styles.pickerButtonPlaceholder]}>
              {selectedMapping ? classLabel(selectedMapping) : "Select class & subject"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9AA6B2" />
          </TouchableOpacity>
        )}

        {selectedMapping && (
          <>
            <Text style={styles.fieldLabel}>Assignment</Text>
            {assignmentsLoading ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color="#2F6FE0" />
              </View>
            ) : assignmentsErrored ? (
              <Text style={styles.errorText}>Couldn't load assignments.</Text>
            ) : assignments && assignments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={28} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No assignments created for this class yet.</Text>
              </View>
            ) : assignments && assignments.length > 1 ? (
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setAssignmentPickerOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={16} color="#2F6FE0" />
                <Text style={[styles.pickerButtonText, !selectedAssignment && styles.pickerButtonPlaceholder]}>
                  {selectedAssignment ? assignmentLabel(selectedAssignment) : "Select assignment"}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#9AA6B2" />
              </TouchableOpacity>
            ) : (
              selectedAssignment && (
                <View style={styles.staticAssignmentRow}>
                  <Ionicons name="document-text-outline" size={16} color="#2F6FE0" />
                  <Text style={styles.staticAssignmentText}>{assignmentLabel(selectedAssignment)}</Text>
                </View>
              )
            )}
          </>
        )}

        {selectedAssignment && (
          <>
            {studentsLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="small" color="#2F6FE0" />
                <Text style={styles.centerStateText}>Loading students...</Text>
              </View>
            ) : studentsErrored ? (
              <View style={styles.centerState}>
                <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
                <Text style={styles.centerStateText}>Couldn't load students for this assignment.</Text>
              </View>
            ) : students && students.length === 0 ? (
              <View style={styles.centerState}>
                <Ionicons name="people-outline" size={32} color="#B0B7C3" />
                <Text style={styles.centerStateText}>No students mapped to this class.</Text>
              </View>
            ) : (
              students && (
                <>
                  <View style={styles.summaryBar}>
                    <Text style={styles.summaryText}>
                      {submittedCount} of {students.length} submitted
                    </Text>
                  </View>

                  {students.map((student) => (
                    <View key={student.student_id} style={styles.studentRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initialsFromName(student.name)}</Text>
                      </View>
                      <View style={styles.studentTextWrap}>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <Text style={styles.studentSubtext}>{student.student_id_no}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.submitToggle, student.is_submitted && styles.submitToggleActive]}
                        onPress={() => handleToggle(student)}
                        activeOpacity={0.8}
                        disabled={markingId === student.student_id}
                      >
                        {markingId === student.student_id ? (
                          <ActivityIndicator size="small" color={student.is_submitted ? "#fff" : "#2F6FE0"} />
                        ) : (
                          <>
                            <Ionicons
                              name={student.is_submitted ? "checkmark-circle" : "ellipse-outline"}
                              size={15}
                              color={student.is_submitted ? "#fff" : "#9AA6B2"}
                            />
                            <Text
                              style={[
                                styles.submitToggleText,
                                student.is_submitted && styles.submitToggleTextActive,
                              ]}
                            >
                              {student.is_submitted ? "Submitted" : "Not submitted"}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={classPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setClassPickerOpen(false);
          setClassSearch("");
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setClassPickerOpen(false);
            setClassSearch("");
          }}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Class &amp; subject</Text>

            {(classes ?? []).length > 8 && (
              <View style={styles.searchInputWrap}>
                <Ionicons name="search-outline" size={15} color="#9AA6B2" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by subject, section or year"
                  placeholderTextColor="#9AA6B2"
                  value={classSearch}
                  onChangeText={setClassSearch}
                  autoFocus
                />
                {classSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setClassSearch("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color="#9AA6B2" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <ScrollView style={styles.modalList}>
              {filteredClasses.length === 0 ? (
                <Text style={styles.modalEmptyText}>No class or subject matches "{classSearch}".</Text>
              ) : (
                filteredClasses.map((mapping) => (
                  <TouchableOpacity
                    key={`${mapping.class_id}-${mapping.subject_id}`}
                    style={styles.modalOptionRow}
                    onPress={() => {
                      setSelectedMapping(mapping);
                      setClassPickerOpen(false);
                      setClassSearch("");
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.modalOptionTextWrap}>
                      <Text style={styles.modalOptionName}>{classLabel(mapping)}</Text>
                      <Text style={styles.modalOptionSubtext}>{mapping.subject_code}</Text>
                    </View>
                    {selectedMapping?.class_id === mapping.class_id &&
                      selectedMapping?.subject_id === mapping.subject_id && (
                        <Ionicons name="checkmark" size={18} color="#2F6FE0" />
                      )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={assignmentPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignmentPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAssignmentPickerOpen(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Assignment</Text>
            <ScrollView style={styles.modalList}>
              {(assignments ?? []).map((assignment) => (
                <TouchableOpacity
                  key={assignment.id}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    setSelectedAssignment(assignment);
                    setAssignmentPickerOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionName}>{assignmentLabel(assignment)}</Text>
                  {selectedAssignment?.id === assignment.id && (
                    <Ionicons name="checkmark" size={18} color="#2F6FE0" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
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
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 6,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 4,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  pickerButtonPlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.regular,
  },
  staticAssignmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  staticAssignmentText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  inlineLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#DC2626",
    marginBottom: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  summaryBar: {
    backgroundColor: "#EAF0FD",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 16,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  studentTextWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  studentSubtext: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  submitToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 110,
    justifyContent: "center",
  },
  submitToggleActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  submitToggleText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  submitToggleTextActive: {
    color: "#fff",
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  centerStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
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
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  modalEmptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    paddingVertical: 20,
    textAlign: "center",
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionTextWrap: {
    flex: 1,
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  modalOptionSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
});
