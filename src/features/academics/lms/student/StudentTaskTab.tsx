import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getStudentTasks, submitLmsTask, type LmsStudentTask } from "@/services/api/lms.api";

function formatDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ task }: { task: LmsStudentTask }) {
  if (task.marks_obtained !== null) {
    return (
      <View style={[styles.badge, styles.badgeGraded]}>
        <Text style={styles.badgeGradedText}>
          {task.marks_obtained} / {task.max_marks ?? "—"}
        </Text>
      </View>
    );
  }
  if (task.is_submitted) {
    return (
      <View style={[styles.badge, styles.badgeSubmitted]}>
        <Text style={styles.badgeSubmittedText}>Submitted</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.badgePending]}>
      <Text style={styles.badgePendingText}>Pending</Text>
    </View>
  );
}

export function StudentTaskTab({ subjectId }: { subjectId: number }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [tasks, setTasks] = useState<LmsStudentTask[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    getStudentTasks(subjectId)
      .then((data) => {
        setTasks(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [subjectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function handleSubmit(task: LmsStudentTask) {
    DocumentPicker.getDocumentAsync({ type: "application/pdf" }).then((result) => {
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setSubmitting(task.id);
      submitLmsTask(task.id, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? "application/pdf" })
        .then(() => {
          toast.success("Task submitted");
          load();
        })
        .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't submit the task.")))
        .finally(() => setSubmitting(null));
    });
  }

  if (status === "loading") {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color="#2F6FE0" />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.errorText}>Couldn't load tasks.</Text>
        <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        tasks.length > 0 ? (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>ASSIGNED TASKS</Text>
            <Text style={styles.sectionHeaderCount}>{tasks.length}</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="clipboard-outline" size={30} color="#C7CDD8" />
          <Text style={styles.emptyText}>No tasks assigned yet</Text>
        </View>
      }
      renderItem={({ item }) => {
        const expanded = expandedId === item.id;
        const canSubmit = item.marks_obtained === null;
        return (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              activeOpacity={0.85}
              onPress={() => setExpandedId(expanded ? null : item.id)}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.task_type === "quiz" ? "ribbon-outline" : "clipboard-outline"} size={20} color="#2F6FE0" />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.meta}>
                  {item.due_date ? `Due ${formatDate(item.due_date)}` : "No due date"}
                  {item.max_marks ? ` · ${item.max_marks} marks` : ""}
                </Text>
              </View>
              <StatusBadge task={item} />
            </TouchableOpacity>

            {expanded && (
              <View style={styles.expandedBody}>
                {item.description && <Text style={styles.description}>{item.description}</Text>}
                {item.attachment_url && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(item.attachment_url!).catch(() => toast.error("Couldn't open the file"))}
                  >
                    <Text style={styles.linkText}>View attachment</Text>
                  </TouchableOpacity>
                )}
                {item.submission_file_url && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(item.submission_file_url!).catch(() => toast.error("Couldn't open the file"))}
                  >
                    <Text style={styles.linkText}>View your submission</Text>
                  </TouchableOpacity>
                )}
                {canSubmit && (
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => handleSubmit(item)}
                    activeOpacity={0.85}
                    disabled={submitting === item.id}
                  >
                    {submitting === item.id ? (
                      <ActivityIndicator size="small" color="#2F6FE0" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {item.is_submitted ? "Resubmit" : "Open and submit"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2F6FE0",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.6,
  },
  sectionHeaderCount: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  meta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgePending: { backgroundColor: "#FEF3C7" },
  badgePendingText: { fontSize: 11, fontFamily: fonts.bold, color: "#92400E" },
  badgeSubmitted: { backgroundColor: "#E4EBFB" },
  badgeSubmittedText: { fontSize: 11, fontFamily: fonts.bold, color: "#2F6FE0" },
  badgeGraded: { backgroundColor: "#DCFCE7" },
  badgeGradedText: { fontSize: 11, fontFamily: fonts.bold, color: "#166534" },
  expandedBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    paddingTop: 12,
    gap: 10,
  },
  description: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#374151",
    lineHeight: 19,
  },
  linkText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  submitButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
  },
  submitButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
});
