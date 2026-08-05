import { useCallback, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { targetClasses, targetFacultyGroups } from "./data/mockAnnouncements";

const DESCRIPTION_MAX = 2000;

type Tab = "create" | "drafts";

type Draft = {
  id: string;
  title: string;
  description: string;
  classes: string[];
  faculty: string[];
};

function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

// TODO: this is a compose+draft UI over local state - wire to a real
// announcements backend endpoint once one exists. Reachable from the HoD
// dashboard's "Announcements" item (full view, can also target faculty
// groups) and the Employee/Faculty dashboard's "Announcements" item (opens
// with ?audience=faculty - a class advisor posting to their own classes only,
// so the faculty-targeting section is hidden).
export function AnnouncementsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { audience } = useLocalSearchParams<{ audience?: string }>();
  const isFacultyAudience = audience === "faculty";

  const [tab, setTab] = useState<Tab>("create");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens (attendance, leave, on duty, no-due, subject records, CIA marks).
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const allClassesSelected = selectedClasses.length === targetClasses.length;
  const allFacultySelected = selectedFaculty.length === targetFacultyGroups.length;

  function resetForm() {
    setTitle("");
    setDescription("");
    setSelectedClasses([]);
    setSelectedFaculty([]);
  }

  function handleTogglePublishToAll() {
    setSelectedClasses(allClassesSelected ? [] : [...targetClasses]);
  }

  function handleToggleSendToAllFaculty() {
    setSelectedFaculty(allFacultySelected ? [] : [...targetFacultyGroups]);
  }

  function handleAttachFile() {
    toast.info("File attachments are coming soon");
  }

  function handleSaveDraft() {
    if (!title.trim()) {
      toast.warning("Add a title before saving as a draft");
      return;
    }
    setDrafts((prev) => [
      {
        id: `draft-${prev.length}-${title.trim()}`,
        title: title.trim(),
        description,
        classes: selectedClasses,
        faculty: selectedFaculty,
      },
      ...prev,
    ]);
    toast.success("Draft saved");
    resetForm();
  }

  function handlePublish() {
    if (!title.trim()) {
      toast.warning("Add a title before publishing");
      return;
    }
    if (selectedClasses.length === 0 && selectedFaculty.length === 0) {
      toast.warning("Select at least one class or faculty group");
      return;
    }
    toast.success("Announcement published");
    resetForm();
  }

  function handleEditDraft(draft: Draft) {
    setTitle(draft.title);
    setDescription(draft.description);
    setSelectedClasses(draft.classes);
    setSelectedFaculty(draft.faculty);
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    setTab("create");
  }

  function handleDeleteDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
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
          <Text style={styles.headerTitle}>Announcements</Text>
          <Text style={styles.headerSubtitle}>Post to your classes</Text>
        </View>
      </LinearGradient>

      <View style={styles.tabSwitch}>
        <TouchableOpacity
          style={[styles.tabSwitchButton, tab === "create" && styles.tabSwitchButtonActive]}
          onPress={() => setTab("create")}
        >
          <Text style={[styles.tabSwitchText, tab === "create" && styles.tabSwitchTextActive]}>Create Post</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabSwitchButton, tab === "drafts" && styles.tabSwitchButtonActive]}
          onPress={() => setTab("drafts")}
        >
          <Text style={[styles.tabSwitchText, tab === "drafts" && styles.tabSwitchTextActive]}>
            Drafts{drafts.length > 0 ? ` (${drafts.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === "create" ? (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter announcement title"
              placeholderTextColor="#9AA6B2"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write your announcement..."
              placeholderTextColor="#9AA6B2"
              value={description}
              onChangeText={(text) => setDescription(text.slice(0, DESCRIPTION_MAX))}
              multiline
              maxLength={DESCRIPTION_MAX}
            />
            <Text style={styles.charCount}>
              {description.length}/{DESCRIPTION_MAX}
            </Text>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.fieldLabel}>Target classes</Text>
              <TouchableOpacity style={styles.smallPillButton} onPress={handleTogglePublishToAll}>
                <Text style={styles.smallPillButtonText}>
                  {allClassesSelected ? "Clear all" : "Publish to all"}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.checkboxGrid}>
              {targetClasses.map((item) => (
                <CheckboxOption
                  key={item}
                  label={item}
                  checked={selectedClasses.includes(item)}
                  onPress={() => setSelectedClasses((prev) => toggleItem(prev, item))}
                />
              ))}
            </View>

            {!isFacultyAudience && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.fieldLabel}>Target faculty</Text>
                  <TouchableOpacity style={styles.smallPillButton} onPress={handleToggleSendToAllFaculty}>
                    <Text style={styles.smallPillButtonText}>
                      {allFacultySelected ? "Clear all" : "Send to all faculty"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.checkboxGrid}>
                  {targetFacultyGroups.map((item) => (
                    <CheckboxOption
                      key={item}
                      label={item}
                      checked={selectedFaculty.includes(item)}
                      onPress={() => setSelectedFaculty((prev) => toggleItem(prev, item))}
                    />
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.attachButton} onPress={handleAttachFile} activeOpacity={0.8}>
              <Ionicons name="cloud-upload-outline" size={18} color="#2F6FE0" />
              <Text style={styles.attachButtonText}>Attach a file (optional)</Text>
            </TouchableOpacity>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.saveDraftButton} onPress={handleSaveDraft} activeOpacity={0.85}>
                <Text style={styles.saveDraftButtonText}>Save Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.publishButton} onPress={handlePublish} activeOpacity={0.85}>
                <Text style={styles.publishButtonText}>Publish Announcement</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : drafts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No drafts saved yet</Text>
          </View>
        ) : (
          drafts.map((draft) => (
            <View key={draft.id} style={styles.draftCard}>
              <View style={styles.draftHeader}>
                <Text style={styles.draftTitle} numberOfLines={1}>
                  {draft.title}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteDraft(draft.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
              {draft.description ? (
                <Text style={styles.draftDescription} numberOfLines={2}>
                  {draft.description}
                </Text>
              ) : null}
              <Text style={styles.draftMeta}>
                {draft.classes.length} class{draft.classes.length === 1 ? "" : "es"}
                {!isFacultyAudience
                  ? ` · ${draft.faculty.length} faculty group${draft.faculty.length === 1 ? "" : "s"}`
                  : ""}
              </Text>
              <TouchableOpacity style={styles.editDraftButton} onPress={() => handleEditDraft(draft)} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={14} color="#2F6FE0" />
                <Text style={styles.editDraftButtonText}>Continue editing</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CheckboxOption({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.checkboxOption, checked && styles.checkboxOptionChecked]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={styles.checkboxLabel} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
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
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 10,
  },
  tabSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabSwitchTextActive: {
    color: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
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
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    marginBottom: 4,
  },
  charCount: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "right",
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  smallPillButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  smallPillButtonText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  checkboxGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  checkboxOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "47%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkboxOptionChecked: {
    borderColor: "#2F6FE0",
    backgroundColor: "#F3F7FE",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#374151",
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#B7CBE6",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  attachButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  saveDraftButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
  },
  saveDraftButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  publishButton: {
    flex: 1.4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#2F6FE0",
    paddingVertical: 14,
  },
  publishButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
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
  },
  draftCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  draftHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  draftTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  draftDescription: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 4,
  },
  draftMeta: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 8,
  },
  editDraftButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  editDraftButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
});
