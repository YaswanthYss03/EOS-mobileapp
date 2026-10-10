import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getTaskSubmissions, gradeSubmission, type LmsFacultyTask, type LmsSubmission } from "@/services/api/lms.api";

// Reached via the "Entry marks" icon on the task list (see FacultyTaskTab) -
// deliberately separate from TaskSubmissionsScreen, which only handles the
// Pending/Submitted review toggle and never shows marks at all. This screen
// is the one place marks are entered: pick an assignment from the dropdown,
// then see every student with their submission status and a marks field.
export function EntryMarksScreen({ tasks, onClose }: { tasks: LmsFacultyTask[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [selectedTask, setSelectedTask] = useState<LmsFacultyTask | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [submissions, setSubmissions] = useState<LmsSubmission[]>([]);
  const [marksDraft, setMarksDraft] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback((taskId: number) => {
    setStatus("loading");
    getTaskSubmissions(taskId)
      .then((data) => {
        setSubmissions(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  function selectTask(task: LmsFacultyTask) {
    setSelectedTask(task);
    setPickerOpen(false);
    setMarksDraft({});
    load(task.id);
  }

  function handleGrade(submission: LmsSubmission) {
    if (!submission.status_id) {
      toast.warning("This student hasn't submitted yet");
      return;
    }
    const statusId = submission.status_id;
    const raw = marksDraft[statusId] ?? "";
    const marks = Number(raw);
    if (!raw.trim() || !Number.isInteger(marks) || marks < 0) {
      toast.warning("Enter a valid whole-number mark");
      return;
    }
    if (selectedTask?.max_marks != null && marks > selectedTask.max_marks) {
      toast.warning(`Marks cannot exceed ${selectedTask.max_marks}`);
      return;
    }
    setSaving(statusId);
    gradeSubmission(statusId, marks)
      .then(() => {
        toast.success("Marks saved");
        load(selectedTask!.id);
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't save marks.")))
      .finally(() => setSaving(null));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={onClose} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entry marks</Text>
      </LinearGradient>

      <View style={styles.pickerWrap}>
        <Text style={styles.fieldLabel}>Assignment</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setPickerOpen(true)} activeOpacity={0.85}>
          <Text style={[styles.pickerButtonText, !selectedTask && styles.pickerPlaceholder]} numberOfLines={2}>
            {selectedTask ? `${selectedTask.title} · ${selectedTask.class_label}` : "Select an assignment"}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {!selectedTask && (
        <View style={styles.centerFill}>
          <Ionicons name="calculator-outline" size={30} color="#C7CDD8" />
          <Text style={styles.emptyText}>Pick an assignment above to enter marks</Text>
        </View>
      )}

      {selectedTask && status === "loading" && <SkeletonListRows count={4} style={styles.list} />}

      {selectedTask && status === "error" && (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Couldn't load submissions.</Text>
          <TouchableOpacity onPress={() => load(selectedTask.id)} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedTask && status === "success" && (
        <FlatList
          data={submissions}
          keyExtractor={(item) => String(item.student_id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const label = item.is_submitted && item.is_reviewed ? "Submitted" : "Pending";
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.textWrap}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>{item.student_id_no}</Text>
                  </View>
                  <View style={[styles.statusBadge, label === "Submitted" ? styles.statusSubmitted : styles.statusPending]}>
                    <Text style={label === "Submitted" ? styles.statusSubmittedText : styles.statusPendingText}>
                      {label}
                    </Text>
                  </View>
                </View>

                {item.is_submitted && (
                  <View style={styles.gradeRow}>
                    {item.marks_obtained !== null ? (
                      <Text style={styles.gradedText}>
                        Marks: {item.marks_obtained}
                        {selectedTask.max_marks != null ? ` / ${selectedTask.max_marks}` : ""}
                      </Text>
                    ) : (
                      <>
                        <TextInput
                          style={styles.marksInput}
                          placeholder="Marks"
                          placeholderTextColor="#9AA6B2"
                          keyboardType="number-pad"
                          value={marksDraft[item.status_id ?? -1] ?? ""}
                          onChangeText={(text) =>
                            setMarksDraft((prev) => ({ ...prev, [item.status_id ?? -1]: text }))
                          }
                        />
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => handleGrade(item)}
                          activeOpacity={0.85}
                          disabled={saving === item.status_id}
                        >
                          {saving === item.status_id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {pickerOpen && (
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={styles.pickerOverlayBg} activeOpacity={1} onPress={() => setPickerOpen(false)} />
          <View style={styles.pickerCard}>
            <Text style={styles.pickerCardTitle}>Select assignment</Text>
            <FlatList
              data={tasks}
              keyExtractor={(item) => String(item.id)}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerRow} onPress={() => selectTask(item)} activeOpacity={0.8}>
                  <Text style={styles.pickerRowTitle}>{item.title}</Text>
                  <Text style={styles.pickerRowMeta}>{item.class_label}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No assignments yet</Text>}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backButton: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontFamily: fonts.bold },
  pickerWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  fieldLabel: { fontSize: 12, fontFamily: fonts.semibold, color: "#2F6FE0", marginBottom: 6 },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerButtonText: { flex: 1, fontSize: 14, fontFamily: fonts.semibold, color: "#111827" },
  pickerPlaceholder: { color: "#9AA6B2", fontFamily: fonts.regular },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24 },
  emptyText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center" },
  errorText: { fontSize: 13, fontFamily: fonts.regular, color: "#6B7280" },
  retryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: "#2F6FE0" },
  retryButtonText: { color: "#fff", fontSize: 13, fontFamily: fonts.semibold },
  list: { padding: 16, paddingTop: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  textWrap: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, minWidth: 76, alignItems: "center" },
  statusSubmitted: { backgroundColor: "#DCFCE7" },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusSubmittedText: { fontSize: 11, fontFamily: fonts.bold, color: "#166534" },
  statusPendingText: { fontSize: 11, fontFamily: fonts.bold, color: "#92400E" },
  gradeRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  marksInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  saveButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: "#2F6FE0" },
  saveButtonText: { fontSize: 13, fontFamily: fonts.bold, color: "#fff" },
  gradedText: { fontSize: 13, fontFamily: fonts.bold, color: "#166534" },
  pickerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  pickerOverlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.5)" },
  pickerCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  pickerCardTitle: { fontSize: 16, fontFamily: fonts.bold, color: "#111827", marginBottom: 12 },
  pickerList: { marginBottom: 4 },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F3F6" },
  pickerRowTitle: { fontSize: 14, fontFamily: fonts.semibold, color: "#111827" },
  pickerRowMeta: { fontSize: 12, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
});
