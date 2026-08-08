import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getTaskSubmissions, gradeSubmission, type LmsSubmission } from "@/services/api/lms.api";

export function TaskSubmissionsScreen({ taskId, title }: { taskId: number; title?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [submissions, setSubmissions] = useState<LmsSubmission[]>([]);
  const [marksDraft, setMarksDraft] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    getTaskSubmissions(taskId)
      .then((data) => {
        setSubmissions(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [taskId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function handleGrade(submission: LmsSubmission) {
    if (!submission.status_id) {
      toast.warning("This student hasn't submitted yet");
      return;
    }
    const raw = marksDraft[submission.status_id] ?? "";
    const marks = Number(raw);
    if (!raw.trim() || !Number.isInteger(marks) || marks < 0) {
      toast.warning("Enter a valid whole-number mark");
      return;
    }
    setSaving(submission.status_id);
    gradeSubmission(submission.status_id, marks)
      .then(() => {
        toast.success("Marks saved");
        load();
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title ?? "Submissions"}
        </Text>
      </LinearGradient>

      {status === "loading" && (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      )}

      {status === "error" && (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>Couldn't load submissions.</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <FlatList
          data={submissions}
          keyExtractor={(item) => String(item.student_id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.textWrap}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{item.student_id_no}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.is_submitted ? styles.statusSubmitted : styles.statusPending,
                  ]}
                >
                  <Text style={item.is_submitted ? styles.statusSubmittedText : styles.statusPendingText}>
                    {item.is_submitted ? "Submitted" : "Not submitted"}
                  </Text>
                </View>
              </View>

              {item.is_submitted && (
                <TouchableOpacity
                  style={styles.viewButton}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (!item.submission_file_url) {
                      toast.warning("No submission file was attached");
                      return;
                    }
                    Linking.openURL(item.submission_file_url).catch(() => toast.error("Couldn't open the file"));
                  }}
                >
                  <Ionicons name="document-text-outline" size={16} color="#2F6FE0" />
                  <Text style={styles.viewButtonText}>View what the student submitted</Text>
                  <Ionicons name="open-outline" size={15} color="#2F6FE0" />
                </TouchableOpacity>
              )}

              {item.is_submitted && (
                <View style={styles.gradeRow}>
                  {item.marks_obtained !== null ? (
                    <Text style={styles.gradedText}>Marks: {item.marks_obtained}</Text>
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
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
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
  headerTitle: { color: "#fff", fontSize: 18, fontFamily: fonts.bold, flex: 1 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  errorText: { fontSize: 13, fontFamily: fonts.regular, color: "#6B7280" },
  retryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: "#2F6FE0" },
  retryButtonText: { color: "#fff", fontSize: 13, fontFamily: fonts.semibold },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 10,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  textWrap: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusSubmitted: { backgroundColor: "#DCFCE7" },
  statusPending: { backgroundColor: "#FEE2E2" },
  statusSubmittedText: { fontSize: 11, fontFamily: fonts.bold, color: "#166534" },
  statusPendingText: { fontSize: 11, fontFamily: fonts.bold, color: "#991B1B" },
  linkText: { fontSize: 13, fontFamily: fonts.semibold, color: "#2F6FE0" },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#EAF0FD",
    borderRadius: 10,
    paddingVertical: 10,
  },
  viewButtonText: { fontSize: 12.5, fontFamily: fonts.bold, color: "#2F6FE0" },
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
  },
  saveButtonText: { fontSize: 13, fontFamily: fonts.bold, color: "#fff" },
  gradedText: { fontSize: 13, fontFamily: fonts.bold, color: "#166534" },
});
