import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getMyAssignedClasses,
  getMyDepartmentFacultyTarget,
  uploadAnnouncementAttachment,
  publishAnnouncementToClasses,
  publishAnnouncementToDepartmentFaculty,
  createAnnouncementDraft,
  updateAnnouncementDraft,
  publishDraftToClasses,
  getMyDraftAnnouncements,
  deleteAnnouncement,
  type AnnouncementClass,
  type AnnouncementFacultyTarget,
  type Announcement,
} from "@/services/api/announcements.api";

const DESCRIPTION_MAX = 2000;

type Tab = "create" | "drafts";
type LoadStatus = "loading" | "success" | "error" | "unavailable";

type Attachment = { fileKey: string; fileName: string; url: string };

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

function attachmentFromAnnouncement(a: Announcement): Attachment | null {
  if (!a.file_url || !a.file_name) return null;
  // The draft/publish endpoints only need file_key back, but a draft
  // fetched from the server only carries file_url/file_name (see
  // toResponseShape) - re-deriving a usable "attachment" for the form from
  // that isn't possible without the key, so continuing to edit a draft
  // that already had a file just keeps showing it as read-only context
  // rather than something re-attachable. Simplest honest fix: treat the
  // file_url itself as the identity carried forward (the backend accepts
  // omitting file_key/file_name on further saves, which just leaves the
  // existing attachment untouched).
  return { fileKey: "", fileName: a.file_name, url: a.file_url };
}

// Reachable from the HoD dashboard's "Announcements" item (full view - can
// also target their own department's faculty) and the Employee/Faculty
// dashboard's "Announcements" item (opens with ?audience=faculty - a class
// advisor posting to their own classes only, so the faculty-targeting
// section is hidden). "Target classes" (target_audience: "students") and
// "Target faculty" (target_audience: "teachers", department-wide) are
// mutually exclusive on the backend - publishing with both selected sends
// two separate announcements sharing the same title/content. Drafts are
// real and server-persisted, but can only ever remember a class-targeted
// selection - a department target is picked fresh at publish time.
export function AnnouncementsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { audience } = useLocalSearchParams<{ audience?: string }>();
  const isFacultyAudience = audience === "faculty";

  const [tab, setTab] = useState<Tab>("create");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [selectedFacultyDeptIds, setSelectedFacultyDeptIds] = useState<number[]>([]);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);

  const [classesStatus, setClassesStatus] = useState<LoadStatus>("loading");
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classes, setClasses] = useState<AnnouncementClass[]>([]);

  const [facultyTargetsStatus, setFacultyTargetsStatus] = useState<LoadStatus>("loading");
  const [facultyTargetsError, setFacultyTargetsError] = useState<string | null>(null);
  const [facultyTargets, setFacultyTargets] = useState<AnnouncementFacultyTarget[]>([]);

  const [draftsStatus, setDraftsStatus] = useState<LoadStatus>("loading");
  const [draftsError, setDraftsError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Announcement[]>([]);

  const loadClasses = useCallback(() => {
    // Faculty (class advisors) fetch their own assigned classes. The HoD
    // path needs a batch selection this screen doesn't collect yet (see
    // GET /announcements/lookup/classes), so "Target classes" is left
    // unavailable there rather than calling an endpoint that would 403.
    if (isFacultyAudience) {
      setClassesStatus("loading");
      setClassesError(null);
      getMyAssignedClasses()
        .then((rows) => {
          setClasses(rows);
          setClassesStatus("success");
        })
        .catch((err) => {
          setClassesError(getApiErrorMessage(err, "Couldn't load your classes."));
          setClassesStatus("error");
        });
    } else {
      setClassesStatus("unavailable");
    }
  }, [isFacultyAudience]);

  const loadFacultyTargets = useCallback(() => {
    if (isFacultyAudience) {
      setFacultyTargetsStatus("unavailable");
      return;
    }
    setFacultyTargetsStatus("loading");
    setFacultyTargetsError(null);
    getMyDepartmentFacultyTarget()
      .then((rows) => {
        setFacultyTargets(rows);
        setFacultyTargetsStatus("success");
      })
      .catch((err) => {
        setFacultyTargetsError(getApiErrorMessage(err, "Couldn't load your department."));
        setFacultyTargetsStatus("error");
      });
  }, [isFacultyAudience]);

  const loadDrafts = useCallback(() => {
    setDraftsStatus("loading");
    setDraftsError(null);
    getMyDraftAnnouncements()
      .then((rows) => {
        setDrafts(rows);
        setDraftsStatus("success");
      })
      .catch((err) => {
        setDraftsError(getApiErrorMessage(err, "Couldn't load your drafts."));
        setDraftsStatus("error");
      });
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    loadFacultyTargets();
  }, [loadFacultyTargets]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

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

  const allClassesSelected = classes.length > 0 && selectedClassIds.length === classes.length;
  const allFacultyTargetsSelected =
    facultyTargets.length > 0 && selectedFacultyDeptIds.length === facultyTargets.length;

  function resetForm() {
    setTitle("");
    setDescription("");
    setSelectedClassIds([]);
    setSelectedFacultyDeptIds([]);
    setAttachment(null);
    setEditingDraftId(null);
  }

  function handleTogglePublishToAll() {
    setSelectedClassIds(allClassesSelected ? [] : classes.map((c) => c.id));
  }

  function handleToggleSendToAllFaculty() {
    setSelectedFacultyDeptIds(allFacultyTargetsSelected ? [] : facultyTargets.map((f) => f.id));
  }

  function handleAttachFile() {
    DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true })
      .then((result) => {
        if (result.canceled || result.assets.length === 0) return;
        const asset = result.assets[0];
        setAttaching(true);
        uploadAnnouncementAttachment({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType ?? "application/octet-stream",
        })
          .then((uploaded) => {
            setAttachment({ fileKey: uploaded.file_key, fileName: uploaded.file_name, url: uploaded.url });
            toast.success("File attached");
          })
          .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't upload the file.")))
          .finally(() => setAttaching(false));
      })
      .catch(() => toast.error("Couldn't open the file picker."));
  }

  function handleRemoveAttachment() {
    setAttachment(null);
  }

  function handleSaveDraft() {
    if (!title.trim()) {
      toast.warning("Add a title before saving as a draft");
      return;
    }
    setPublishing(true);
    const trimmedTitle = title.trim();
    const attachmentPayload = attachment?.fileKey
      ? { fileKey: attachment.fileKey, fileName: attachment.fileName }
      : undefined;

    const request = editingDraftId
      ? updateAnnouncementDraft(editingDraftId, trimmedTitle, description, selectedClassIds, attachmentPayload)
      : createAnnouncementDraft(trimmedTitle, description, selectedClassIds, attachmentPayload);

    request
      .then(() => {
        toast.success("Draft saved");
        resetForm();
        loadDrafts();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't save the draft.")))
      .finally(() => setPublishing(false));
  }

  function handlePublish() {
    if (publishing) return;
    if (!title.trim()) {
      toast.warning("Add a title before publishing");
      return;
    }
    if (selectedClassIds.length === 0 && selectedFacultyDeptIds.length === 0) {
      toast.warning("Select at least one class or faculty group");
      return;
    }

    setPublishing(true);
    const trimmedTitle = title.trim();
    const attachmentPayload = attachment?.fileKey
      ? { fileKey: attachment.fileKey, fileName: attachment.fileName }
      : undefined;

    // "students" (class_ids) and "teachers" (department_id) are mutually
    // exclusive per announcement on the backend - selecting both sends two
    // announcements sharing the same title/content. If we're publishing a
    // saved draft and classes are selected, that reuses the draft's own
    // row (PATCH); any faculty-department targets are always new rows,
    // since a draft can never carry a department target itself.
    const calls: Promise<Announcement>[] = [];
    if (selectedClassIds.length > 0) {
      calls.push(
        editingDraftId
          ? publishDraftToClasses(editingDraftId, trimmedTitle, description, selectedClassIds, attachmentPayload)
          : publishAnnouncementToClasses(trimmedTitle, description, selectedClassIds, attachmentPayload),
      );
    }
    for (const departmentId of selectedFacultyDeptIds) {
      calls.push(
        publishAnnouncementToDepartmentFaculty(trimmedTitle, description, departmentId, attachmentPayload),
      );
    }

    Promise.all(calls)
      .then(() => {
        toast.success("Announcement published");
        resetForm();
        loadDrafts();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't publish the announcement.")))
      .finally(() => setPublishing(false));
  }

  function handleEditDraft(draft: Announcement) {
    setTitle(draft.title);
    setDescription(draft.content);
    setSelectedClassIds(draft.class_ids);
    setSelectedFacultyDeptIds([]);
    setAttachment(attachmentFromAnnouncement(draft));
    setEditingDraftId(draft.id);
    setTab("create");
  }

  function handleDeleteDraft(id: number) {
    deleteAnnouncement(id)
      .then(() => {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
        toast.success("Draft deleted");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't delete the draft.")));
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
            {editingDraftId !== null && (
              <View style={styles.editingBanner}>
                <Ionicons name="create-outline" size={14} color="#2F6FE0" />
                <Text style={styles.editingBannerText}>Editing a saved draft</Text>
                <TouchableOpacity onPress={resetForm} hitSlop={8}>
                  <Text style={styles.editingBannerCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

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
              {classesStatus === "success" && classes.length > 0 && (
                <TouchableOpacity style={styles.smallPillButton} onPress={handleTogglePublishToAll}>
                  <Text style={styles.smallPillButtonText}>
                    {allClassesSelected ? "Clear all" : "Publish to all"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {classesStatus === "loading" && (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            )}

            {classesStatus === "error" && (
              <ErrorNotice message={classesError ?? "Something went wrong."} onRetry={loadClasses} />
            )}

            {classesStatus === "unavailable" && (
              <Text style={styles.emptyInlineText}>
                Class targeting isn't available from this view yet.
              </Text>
            )}

            {classesStatus === "success" && classes.length === 0 && (
              <Text style={styles.emptyInlineText}>No classes are assigned to you yet.</Text>
            )}

            {classesStatus === "success" && classes.length > 0 && (
              <View style={styles.checkboxGrid}>
                {classes.map((item) => (
                  <CheckboxOption
                    key={item.id}
                    label={item.label}
                    checked={selectedClassIds.includes(item.id)}
                    onPress={() => setSelectedClassIds((prev) => toggleId(prev, item.id))}
                  />
                ))}
              </View>
            )}

            {!isFacultyAudience && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.fieldLabel}>Target faculty</Text>
                  {facultyTargetsStatus === "success" && facultyTargets.length > 1 && (
                    <TouchableOpacity style={styles.smallPillButton} onPress={handleToggleSendToAllFaculty}>
                      <Text style={styles.smallPillButtonText}>
                        {allFacultyTargetsSelected ? "Clear all" : "Send to all faculty"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {facultyTargetsStatus === "loading" && (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator color="#2F6FE0" />
                  </View>
                )}

                {facultyTargetsStatus === "error" && (
                  <ErrorNotice
                    message={facultyTargetsError ?? "Something went wrong."}
                    onRetry={loadFacultyTargets}
                  />
                )}

                {facultyTargetsStatus === "success" && facultyTargets.length > 0 && (
                  <View style={styles.checkboxGrid}>
                    {facultyTargets.map((item) => (
                      <CheckboxOption
                        key={item.id}
                        label={item.label}
                        checked={selectedFacultyDeptIds.includes(item.id)}
                        onPress={() => setSelectedFacultyDeptIds((prev) => toggleId(prev, item.id))}
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            {attachment ? (
              <View style={styles.attachmentChip}>
                <Ionicons name="document-attach-outline" size={18} color="#2F6FE0" />
                <Text style={styles.attachmentChipText} numberOfLines={1}>
                  {attachment.fileName}
                </Text>
                <TouchableOpacity onPress={handleRemoveAttachment} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#9AA6B2" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.attachButton}
                onPress={handleAttachFile}
                activeOpacity={0.8}
                disabled={attaching}
              >
                {attaching ? (
                  <ActivityIndicator color="#2F6FE0" size="small" />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={18} color="#2F6FE0" />
                )}
                <Text style={styles.attachButtonText}>
                  {attaching ? "Uploading..." : "Attach a file (optional)"}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.saveDraftButton}
                onPress={handleSaveDraft}
                activeOpacity={0.85}
                disabled={publishing}
              >
                <Text style={styles.saveDraftButtonText}>Save Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.publishButton, publishing && styles.publishButtonDisabled]}
                onPress={handlePublish}
                activeOpacity={0.85}
                disabled={publishing}
              >
                {publishing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.publishButtonText}>Publish Announcement</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : draftsStatus === "loading" ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        ) : draftsStatus === "error" ? (
          <ErrorNotice message={draftsError ?? "Something went wrong."} onRetry={loadDrafts} />
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
              {draft.content ? (
                <Text style={styles.draftDescription} numberOfLines={2}>
                  {draft.content}
                </Text>
              ) : null}
              <Text style={styles.draftMeta}>
                {draft.class_ids.length} class{draft.class_ids.length === 1 ? "" : "es"}
                {draft.file_name ? ` · 1 attachment` : ""}
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

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorNotice}>
      <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
      <Text style={styles.errorNoticeText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.8}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
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
  editingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F7FE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  editingBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  editingBannerCancel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#6B7280",
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
  inlineLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },
  errorNotice: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    marginBottom: 8,
  },
  errorNoticeText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  retryButtonText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  emptyInlineText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 16,
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
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F7FE",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  attachmentChipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
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
  publishButtonDisabled: {
    backgroundColor: "#9AB3E8",
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
