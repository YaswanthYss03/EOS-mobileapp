import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { confirm } from "@/utils/confirm";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getGroupDetails,
  getEligibleStudents,
  addGroupMembers,
  removeGroupMember,
  updateGroupTitle,
  uploadGroupImage,
  deleteGroup,
  type GroupDetails,
  type MessagePerson,
} from "@/services/api/messaging.api";

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
}

// Any current member can view this screen; every mutating action here
// (add/remove member, rename, change image, delete) is owner-only in the UI
// AND re-checked server-side - never rely on this screen hiding a button as
// the real protection (see MessagingService's owner checks).
export function GroupDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversationId: conversationIdParam } = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = Number(conversationIdParam);

  const [details, setDetails] = useState<GroupDetails | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const [changingImage, setChangingImage] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [addingOpen, setAddingOpen] = useState(false);
  const [eligible, setEligible] = useState<MessagePerson[]>([]);
  const [eligibleStatus, setEligibleStatus] = useState<"loading" | "success" | "error">("loading");
  const [addFilter, setAddFilter] = useState("");
  const [addSearching, setAddSearching] = useState(false);
  const addDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addSelectedIds, setAddSelectedIds] = useState<Set<number>>(new Set());
  const [savingAdd, setSavingAdd] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    getGroupDetails(conversationId)
      .then((d) => {
        setDetails(d);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  function openAddMembers() {
    setAddingOpen(true);
    setAddSelectedIds(new Set());
    setAddFilter("");
    setEligibleStatus("loading");
    getEligibleStudents()
      .then((rows) => {
        setEligible(rows);
        setEligibleStatus("success");
      })
      .catch(() => setEligibleStatus("error"));
  }

  // Any student in the college is addable (see getEligibleStudents), not
  // just those in the faculty's own classes — the directory is too large to
  // fetch in full, so this searches server-side the same way create-group.tsx
  // does, debounced against the query typed here.
  useEffect(() => {
    if (!addingOpen) return;
    if (addDebounceRef.current) clearTimeout(addDebounceRef.current);
    const trimmed = addFilter.trim();
    if (!trimmed) return; // openAddMembers already loaded the default page
    setAddSearching(true);
    addDebounceRef.current = setTimeout(() => {
      getEligibleStudents(trimmed)
        .then((rows) => {
          setEligible(rows);
          setEligibleStatus("success");
        })
        .catch(() => setEligibleStatus("error"))
        .finally(() => setAddSearching(false));
    }, 300);
    return () => {
      if (addDebounceRef.current) clearTimeout(addDebounceRef.current);
    };
  }, [addFilter, addingOpen]);

  function toggleAddSelected(userId: number) {
    setAddSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function saveAddMembers() {
    if (addSelectedIds.size === 0) {
      setAddingOpen(false);
      return;
    }
    setSavingAdd(true);
    try {
      const selectedIds = [...addSelectedIds];
      const updated = await addGroupMembers(conversationId, selectedIds);
      setDetails(updated);
      setAddingOpen(false);
      // Faculty/HoD adds land as active members immediately; a student
      // owner's selections land as pending invitations instead (see
      // MessagingService.addGroupMembers) - tell the truth about which one
      // actually happened rather than always saying "added".
      const anyStillPending = updated.pendingInvites.some((p) => selectedIds.includes(p.userId));
      toast.success(anyStillPending ? "Invitations sent" : "Students added");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't add those students."));
    } finally {
      setSavingAdd(false);
    }
  }

  // Doubles as "cancel invitation" for a pending invitee (removeGroupMember
  // handles both cases server-side - see its own doc comment) - the confirm
  // copy is worded generically enough to cover either.
  async function handleRemove(userId: number, name: string) {
    const ok = await confirm({
      title: "Remove from group?",
      message: `${name} will no longer be able to see or send messages in this group.`,
      confirmText: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setRemovingUserId(userId);
    try {
      const updated = await removeGroupMember(conversationId, userId);
      setDetails(updated);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't remove this member."));
    } finally {
      setRemovingUserId(null);
    }
  }

  function startEditTitle() {
    if (!details) return;
    setTitleDraft(details.title ?? "");
    setEditingTitle(true);
  }

  async function saveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed || !details) return;
    setSavingTitle(true);
    try {
      const updated = await updateGroupTitle(conversationId, trimmed);
      setDetails(updated);
      setEditingTitle(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't rename this group."));
    } finally {
      setSavingTitle(false);
    }
  }

  async function handleChangeImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.warning("Allow photo library access to change the group image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setChangingImage(true);
    try {
      const updated = await uploadGroupImage(conversationId, {
        uri: asset.uri,
        name: `group-${conversationId}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
      setDetails(updated);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the group image."));
    } finally {
      setChangingImage(false);
    }
  }

  async function handleDeleteGroup() {
    const ok = await confirm({
      title: "Delete this group?",
      message: "This will remove the group for all members.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteGroup(conversationId);
      toast.success("Group deleted");
      // Pop this screen, then the conversation screen beneath it, landing
      // back on the messages list - the group no longer exists to return to.
      router.back();
      router.back();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't delete this group."));
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group info</Text>
      </LinearGradient>

      {status === "loading" ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      ) : status === "error" || !details ? (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
          <Text style={styles.emptyText}>Couldn't load this group.</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={details.members}
          keyExtractor={(item) => String(item.userId)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <TouchableOpacity
                style={styles.groupImageWrap}
                onPress={details.isOwner ? handleChangeImage : undefined}
                activeOpacity={details.isOwner ? 0.8 : 1}
                disabled={!details.isOwner || changingImage}
              >
                {changingImage ? (
                  <ActivityIndicator color="#2F6FE0" />
                ) : details.imageUrl ? (
                  <Image source={{ uri: details.imageUrl }} style={styles.groupImage} />
                ) : (
                  <Ionicons name="people" size={28} color="#2F6FE0" />
                )}
                {details.isOwner && (
                  <View style={styles.groupImageEditBadge}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {editingTitle ? (
                <View style={styles.titleEditRow}>
                  <TextInput
                    style={styles.titleInput}
                    value={titleDraft}
                    onChangeText={setTitleDraft}
                    maxLength={150}
                    autoFocus
                  />
                  <TouchableOpacity onPress={saveTitle} disabled={savingTitle} hitSlop={8}>
                    {savingTitle ? (
                      <ActivityIndicator size="small" color="#2F6FE0" />
                    ) : (
                      <Ionicons name="checkmark-circle" size={26} color="#2F6FE0" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingTitle(false)} hitSlop={8}>
                    <Ionicons name="close-circle" size={26} color="#B0B7C3" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.titleRow}
                  onPress={details.isOwner ? startEditTitle : undefined}
                  disabled={!details.isOwner}
                  activeOpacity={0.7}
                >
                  <Text style={styles.groupTitle}>{details.title ?? "Group"}</Text>
                  {details.isOwner && <Ionicons name="pencil" size={14} color="#9AA6B2" />}
                </TouchableOpacity>
              )}
              <Text style={styles.memberCountText}>
                {details.memberCount} member{details.memberCount === 1 ? "" : "s"}
              </Text>

              {details.isOwner && (
                <View style={styles.ownerActionsRow}>
                  <TouchableOpacity style={styles.ownerActionButton} onPress={openAddMembers} activeOpacity={0.8}>
                    <Ionicons name="person-add-outline" size={16} color="#2F6FE0" />
                    <Text style={styles.ownerActionText}>Add students</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ownerActionButton, styles.deleteButton]}
                    onPress={handleDeleteGroup}
                    disabled={deleting}
                    activeOpacity={0.8}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        <Text style={[styles.ownerActionText, styles.deleteButtonText]}>Delete group</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {addingOpen && (
                <View style={styles.addPanel}>
                  <Text style={styles.addPanelTitle}>Add students</Text>
                  <View style={styles.addSearchBox}>
                    <Ionicons name="search" size={14} color="#9AA6B2" />
                    <TextInput
                      style={styles.addSearchInput}
                      placeholder="Search students by name, roll no. or email"
                      placeholderTextColor="#9AA6B2"
                      value={addFilter}
                      onChangeText={setAddFilter}
                      autoCorrect={false}
                    />
                    {addSearching && <ActivityIndicator size="small" color="#9AA6B2" />}
                  </View>
                  {eligibleStatus === "loading" ? (
                    <ActivityIndicator color="#2F6FE0" style={{ marginVertical: 12 }} />
                  ) : eligibleStatus === "error" ? (
                    <Text style={styles.emptyText}>Couldn't load students.</Text>
                  ) : (
                    (() => {
                      const memberIds = new Set(details.members.map((m) => m.userId));
                      const addable = eligible.filter((s) => !memberIds.has(s.userId));
                      if (addable.length === 0) {
                        return (
                          <Text style={styles.emptyText}>
                            {eligible.length === 0
                              ? addFilter.trim()
                                ? `No students match "${addFilter.trim()}"`
                                : "No students found."
                              : "Every matching student is already in this group."}
                          </Text>
                        );
                      }
                      return addable.map((s) => {
                        const selected = addSelectedIds.has(s.userId);
                        return (
                          <TouchableOpacity
                            key={s.userId}
                            style={styles.addRow}
                            onPress={() => toggleAddSelected(s.userId)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.avatar}>
                              {s.photoUrl ? (
                                <Image source={{ uri: s.photoUrl }} style={styles.avatarImage} />
                              ) : (
                                <Text style={styles.avatarText}>{initialsFromName(s.name)}</Text>
                              )}
                            </View>
                            <Text style={styles.addRowName}>{s.name}</Text>
                            <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                              {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                            </View>
                          </TouchableOpacity>
                        );
                      });
                    })()
                  )}
                  <View style={styles.addPanelActions}>
                    <TouchableOpacity onPress={() => setAddingOpen(false)} style={styles.addPanelCancel}>
                      <Text style={styles.addPanelCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveAddMembers}
                      style={styles.addPanelSave}
                      disabled={savingAdd || addSelectedIds.size === 0}
                    >
                      {savingAdd ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.addPanelSaveText}>Add ({addSelectedIds.size})</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {details.isOwner && details.pendingInvites.length > 0 && (
                <>
                  <Text style={styles.membersSectionTitle}>
                    PENDING INVITATIONS ({details.pendingInvites.length})
                  </Text>
                  {details.pendingInvites.map((invitee) => (
                    <View key={invitee.userId} style={styles.memberRow}>
                      <View style={styles.avatar}>
                        {invitee.photoUrl ? (
                          <Image source={{ uri: invitee.photoUrl }} style={styles.avatarImage} />
                        ) : (
                          <Text style={styles.avatarText}>{initialsFromName(invitee.name)}</Text>
                        )}
                      </View>
                      <View style={styles.rowTextWrap}>
                        <Text style={styles.rowName}>{invitee.name}</Text>
                        <Text style={styles.rowSubtitle}>Invitation sent · not yet a member</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemove(invitee.userId, invitee.name)}
                        hitSlop={8}
                        disabled={removingUserId === invitee.userId}
                      >
                        {removingUserId === invitee.userId ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <Text style={styles.cancelInviteText}>Cancel</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}

              <Text style={styles.membersSectionTitle}>MEMBERS</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <View style={styles.avatar}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initialsFromName(item.name)}</Text>
                )}
              </View>
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>{item.roleLabel}</Text>
              </View>
              {item.isOwner ? (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>Owner</Text>
                </View>
              ) : (
                details.isOwner && (
                  <TouchableOpacity
                    onPress={() => handleRemove(item.userId, item.name)}
                    hitSlop={8}
                    disabled={removingUserId === item.userId}
                  >
                    {removingUserId === item.userId ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                    )}
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

export default GroupDetailsScreen;

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
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 20,
    marginBottom: 16,
  },
  groupImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  groupImage: {
    width: "100%",
    height: "100%",
  },
  groupImageEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  titleEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    width: "100%",
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
    borderBottomWidth: 1.5,
    borderBottomColor: "#2F6FE0",
    paddingVertical: 4,
    textAlign: "center",
  },
  groupTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  memberCountText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 4,
  },
  ownerActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    alignSelf: "stretch",
  },
  ownerActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    borderRadius: 12,
    paddingVertical: 10,
  },
  ownerActionText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  deleteButton: {
    borderColor: "#FCA5A5",
  },
  deleteButtonText: {
    color: "#DC2626",
  },
  addPanel: {
    alignSelf: "stretch",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  addPanelTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  addSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F7F8FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  addSearchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: "#111827",
    padding: 0,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  addRowName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  addPanelActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  addPanelCancel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
  },
  addPanelCancelText: {
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  addPanelSave: {
    flex: 1.3,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
    paddingVertical: 10,
  },
  addPanelSaveText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  membersSectionTitle: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.5,
    marginTop: 18,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  rowTextWrap: {
    flex: 1,
  },
  rowName: {
    fontSize: 13.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  rowSubtitle: {
    fontSize: 11.5,
    fontFamily: fonts.medium,
    color: "#7A828E",
    marginTop: 1,
  },
  ownerBadge: {
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ownerBadgeText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  cancelInviteText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#DC2626",
  },
  checkbox: {
    width: 20,
    height: 20,
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
});
