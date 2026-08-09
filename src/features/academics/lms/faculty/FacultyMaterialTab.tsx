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
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getFacultyFolders,
  createFolder,
  deleteFolder,
  getMyTeachingSubjects,
  type LmsFacultyFolder,
  type LmsTeachingSubject,
} from "@/services/api/lms.api";

// Drive-style: the faculty's own folders for this subject, each already
// showing every class it's shared to (a folder created once can cover
// several sections the caller teaches the same subject to).
export function FacultyMaterialTab({ subjectId, classId }: { subjectId: number; classId: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [folders, setFolders] = useState<LmsFacultyFolder[]>([]);
  const [allClasses, setAllClasses] = useState<{ class_id: number; label: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    Promise.all([getFacultyFolders(subjectId), getMyTeachingSubjects()])
      .then(([folderData, subjects]: [LmsFacultyFolder[], LmsTeachingSubject[]]) => {
        setFolders(folderData);
        setAllClasses(subjects.find((s) => s.subject_id === subjectId)?.classes ?? []);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [subjectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openCreate() {
    setTitle("");
    setDescription("");
    setSelectedClassIds([classId]);
    setCreateOpen(true);
  }

  function toggleClass(id: number) {
    setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function handleCreate() {
    const t = title.trim();
    if (!t) {
      toast.warning("Enter a folder title");
      return;
    }
    if (selectedClassIds.length === 0) {
      toast.warning("Select at least one class to share this folder with");
      return;
    }
    setSaving(true);
    createFolder({ subject_id: subjectId, title: t, description: description.trim() || undefined, class_ids: selectedClassIds })
      .then(() => {
        setCreateOpen(false);
        load();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't create the folder.")))
      .finally(() => setSaving(false));
  }

  function handleDelete(folder: LmsFacultyFolder) {
    Alert.alert("Delete folder", `Delete "${folder.title}" and everything inside it?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteFolder(folder.id).then(load).catch(() => toast.error("Couldn't delete the folder")),
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
        <Text style={styles.errorText}>Couldn't load your folders.</Text>
        <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={folders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <TouchableOpacity style={styles.newButton} onPress={openCreate} activeOpacity={0.9}>
              <View style={styles.newButtonIconWrap}>
                <Ionicons name="add" size={18} color="#fff" />
              </View>
              <Text style={styles.newButtonText}>Create new folder</Text>
            </TouchableOpacity>
            {folders.length > 0 && (
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderText}>YOUR FOLDERS</Text>
                <Text style={styles.sectionHeaderCount}>{folders.length}</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={30} color="#C7CDD8" />
            <Text style={styles.emptyText}>No folders yet</Text>
            <Text style={styles.emptySubtext}>Create one to share material with your class</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.85}
            onPress={() =>
              router.push({ pathname: "/(tabs)/academics/lms/folder/[folderId]", params: { folderId: String(item.id), title: item.title } })
            }
          >
            <View style={styles.iconWrap}>
              <Ionicons name="folder-outline" size={22} color="#2F6FE0" />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>{item.title}</Text>
              {item.description && (
                <Text style={styles.description} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
              <Text style={styles.meta}>
                {item.resource_count} {item.resource_count === 1 ? "item" : "items"} · Shared to{" "}
                {item.classes.map((c) => c.label).join(", ")}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={18} color="#B0B7C3" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCreateOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>New folder</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Title (e.g. Unit 1 - Introduction)"
              placeholderTextColor="#9AA6B2"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Description (optional)"
              placeholderTextColor="#9AA6B2"
              value={description}
              onChangeText={setDescription}
            />
            <Text style={styles.modalFieldLabel}>Share to</Text>
            <View style={styles.chipRow}>
              {allClasses.map((c) => {
                const selected = selectedClassIds.includes(c.class_id);
                return (
                  <TouchableOpacity
                    key={c.class_id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleClass(c.class_id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setCreateOpen(false)} activeOpacity={0.8}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleCreate} activeOpacity={0.85} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveButtonText}>Create</Text>}
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
    marginBottom: 16,
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeaderText: { fontSize: 11, fontFamily: fonts.bold, color: "#8A93A3", letterSpacing: 0.6 },
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
  emptyState: { alignItems: "center", gap: 6, marginTop: 40 },
  emptyText: { fontSize: 13, fontFamily: fonts.bold, color: "#6B7280", textAlign: "center", marginTop: 4 },
  emptySubtext: { fontSize: 12, fontFamily: fonts.regular, color: "#9AA6B2", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  iconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#EAF0FD", alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  description: { fontSize: 12, fontFamily: fonts.regular, color: "#6B7280", marginTop: 2 },
  meta: { fontSize: 11, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 3 },
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
  modalFieldLabel: { fontSize: 12, fontFamily: fonts.semibold, color: "#6B7280", marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: "#EEF0F4" },
  chipSelected: { backgroundColor: "#2F6FE0" },
  chipText: { fontSize: 12, fontFamily: fonts.semibold, color: "#6B7280" },
  chipTextSelected: { color: "#fff" },
  modalButtonRow: { flexDirection: "row", gap: 10 },
  modalCancelButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  modalCancelButtonText: { fontSize: 14, fontFamily: fonts.semibold, color: "#6B7280" },
  modalSaveButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#2F6FE0" },
  modalSaveButtonText: { fontSize: 14, fontFamily: fonts.semibold, color: "#fff" },
});
