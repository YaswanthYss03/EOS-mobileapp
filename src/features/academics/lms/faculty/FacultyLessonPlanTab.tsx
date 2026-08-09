import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getFacultyLessonPlan,
  createLessonSession,
  updateLessonSession,
  deleteLessonSession,
  type LmsLessonSession,
} from "@/services/api/lms.api";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function DateBadge({ isoDate }: { isoDate: string }) {
  const d = new Date(isoDate);
  return (
    <View style={styles.dateBadge}>
      <Text style={styles.dateDay}>{d.getDate()}</Text>
      <Text style={styles.dateMonth}>{MONTHS[d.getMonth()]}</Text>
    </View>
  );
}

export function FacultyLessonPlanTab({ subjectId, classId }: { subjectId: number; classId: number }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [sessions, setSessions] = useState<LmsLessonSession[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [unitTitle, setUnitTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    getFacultyLessonPlan(subjectId, classId)
      .then((data) => {
        setSessions(data.sessions);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [subjectId, classId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openAdd() {
    setSessionDate("");
    setUnitTitle("");
    setTopic("");
    setAddOpen(true);
  }

  function handleAdd() {
    const t = topic.trim();
    if (!sessionDate.trim() || !t) {
      toast.warning("Enter a date and a topic");
      return;
    }
    const parsed = new Date(sessionDate.trim());
    if (Number.isNaN(parsed.getTime())) {
      toast.warning("Date must look like YYYY-MM-DD");
      return;
    }
    setSaving(true);
    createLessonSession({
      subject_id: subjectId,
      class_id: classId,
      session_date: parsed.toISOString().slice(0, 10),
      unit_title: unitTitle.trim() || undefined,
      topic: t,
    })
      .then(() => {
        setAddOpen(false);
        load();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't add the session.")))
      .finally(() => setSaving(false));
  }

  function toggleCovered(session: LmsLessonSession) {
    updateLessonSession(session.id, { is_covered: !session.is_covered })
      .then(load)
      .catch(() => toast.error("Couldn't update the session"));
  }

  function handleDelete(session: LmsLessonSession) {
    Alert.alert("Remove session", `Remove "${session.topic}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteLessonSession(session.id).then(load).catch(() => toast.error("Couldn't remove the session")),
      },
    ]);
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
        <Text style={styles.errorText}>Couldn't load the lesson plan.</Text>
        <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coveredCount = sessions.filter((s) => s.is_covered).length;

  return (
    <>
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <TouchableOpacity style={styles.newButton} onPress={openAdd} activeOpacity={0.9}>
              <View style={styles.newButtonIconWrap}>
                <Ionicons name="add" size={18} color="#fff" />
              </View>
              <Text style={styles.newButtonText}>Add session</Text>
            </TouchableOpacity>
            {sessions.length > 0 && (
              <View style={styles.progressCard}>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressTitle}>Syllabus progress</Text>
                  <Text style={styles.progressCount}>
                    {coveredCount}/{sessions.length}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${sessions.length ? (coveredCount / sessions.length) * 100 : 0}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No sessions planned yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <DateBadge isoDate={item.session_date} />
            <View style={styles.textWrap}>
              <Text style={styles.title}>{item.topic}</Text>
              {item.unit_title && <Text style={styles.meta}>{item.unit_title}</Text>}
            </View>
            <TouchableOpacity
              style={[styles.badge, item.is_covered ? styles.badgeCovered : styles.badgePending]}
              onPress={() => toggleCovered(item)}
              activeOpacity={0.85}
            >
              <Text style={[styles.badgeText, item.is_covered ? styles.badgeTextCovered : styles.badgeTextPending]}>
                {item.is_covered ? "Covered" : "Pending"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={16} color="#B0B7C3" />
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Add session</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#9AA6B2"
              value={sessionDate}
              onChangeText={setSessionDate}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Unit (optional)"
              placeholderTextColor="#9AA6B2"
              value={unitTitle}
              onChangeText={setUnitTitle}
            />
            <TextInput style={styles.modalInput} placeholder="Topic" placeholderTextColor="#9AA6B2" value={topic} onChangeText={setTopic} />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setAddOpen(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleAdd} activeOpacity={0.85} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveButtonText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  errorText: { fontSize: 13, fontFamily: fonts.regular, color: "#6B7280" },
  retryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: "#2F6FE0" },
  retryButtonText: { color: "#fff", fontSize: 13, fontFamily: fonts.semibold },
  list: { padding: 16, paddingTop: 8 },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE4F5",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  newButtonIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
  },
  newButtonText: { fontSize: 13.5, fontFamily: fonts.bold, color: "#1A3D8F" },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 14,
  },
  progressTextRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  progressTitle: { fontSize: 12.5, fontFamily: fonts.bold, color: "#111827" },
  progressCount: { fontSize: 12.5, fontFamily: fonts.bold, color: "#2F6FE0" },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: "#EEF0F4", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#2F6FE0" },
  emptyText: { fontSize: 13, fontFamily: fonts.regular, color: "#9AA6B2", textAlign: "center", marginTop: 32 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  dateBadge: { width: 40, alignItems: "center" },
  dateDay: { fontSize: 16, fontFamily: fonts.bold, color: "#2F6FE0" },
  dateMonth: { fontSize: 9.5, fontFamily: fonts.semibold, color: "#9AA6B2" },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeCovered: { backgroundColor: "#DCFCE7" },
  badgePending: { backgroundColor: "#E4EBFB" },
  badgeText: { fontSize: 11, fontFamily: fonts.bold },
  badgeTextCovered: { color: "#166534" },
  badgeTextPending: { color: "#2F6FE0" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", backgroundColor: "#fff", borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 16, fontFamily: fonts.bold, color: "#111827", marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 12,
  },
  modalButtonRow: { flexDirection: "row", gap: 10 },
  modalCancelButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  modalCancelButtonText: { fontSize: 14, fontFamily: fonts.semibold, color: "#6B7280" },
  modalSaveButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#2F6FE0" },
  modalSaveButtonText: { fontSize: 14, fontFamily: fonts.semibold, color: "#fff" },
});
