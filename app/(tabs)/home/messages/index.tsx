import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { formatRelativeTime } from "@/utils/calendar";
import {
  searchPeople,
  createConversation,
  listConversations,
  getRelationshipStatus,
  sendChatRequest,
  acceptChatRequest,
  rejectChatRequest,
  pinConversation,
  unpinConversation,
  type MessagePerson,
  type ConversationSummary,
  type RelationshipStatus,
} from "@/services/api/messaging.api";
import { useMessaging } from "@/context/MessagingContext";
import { useAuth } from "@/context/AuthContext";

// Group creation is faculty/HoD/student, gated on the raw backend role (not
// the app's collapsed useRole() bucket, same reasoning as
// AcademicCalendarScreen - this needs to tell "actually faculty-backed"
// apart from the generic "employee" bucket that also includes
// library/finance/etc). Students can create groups too now (student-owned
// groups use an invitation flow instead of Faculty/HoD's immediate add -
// see create-group.tsx/MessagingService.createGroupConversation).
const CAN_CREATE_GROUP_ROLES = new Set(["faculty", "hod", "student"]);

function isStudentLabel(roleLabel: string): boolean {
  return roleLabel.startsWith("Student");
}

// WhatsApp-style filter chips above the conversation list - purely a
// client-side view of `conversations` (already fetched in full via
// listConversations), so switching filters is instant with no refetch and
// no navigation, per spec. Pin ordering (server-sorted, pinned first) is
// preserved by every filter since they only ever .filter() the same
// already-sorted array, never re-sort it.
const CONVERSATION_FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "groups", label: "Groups" },
] as const;
type ConversationFilterKey = (typeof CONVERSATION_FILTERS)[number]["key"];

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function Header({
  onBack,
  onNewGroup,
  onRequests,
  requestsBadgeCount,
}: {
  onBack: () => void;
  onNewGroup?: () => void;
  onRequests?: () => void;
  requestsBadgeCount?: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View style={styles.headerTextWrap}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      {onRequests && (
        <TouchableOpacity onPress={onRequests} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="mail-unread-outline" size={20} color="#fff" />
          {!!requestsBadgeCount && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{requestsBadgeCount > 9 ? "9+" : requestsBadgeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      {onNewGroup && (
        <TouchableOpacity onPress={onNewGroup} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="people-outline" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

// Only rendered for a student viewer looking at another student in search
// results (see isStudentLabel below) - every other search row keeps the
// original one-tap "open chat" behavior unchanged. Each instance owns its
// own relationship-status fetch so the list itself doesn't have to fetch N
// statuses up front for every row, most of which the viewer will never look
// at closely.
function StudentSearchResultRow({
  person,
  onOpenConversation,
}: {
  person: MessagePerson;
  onOpenConversation: (conversationId: number, otherUser: MessagePerson) => void;
}) {
  const [relationship, setRelationship] = useState<RelationshipStatus | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRelationshipStatus(person.userId)
      .then((status) => {
        if (!cancelled) setRelationship(status);
      })
      .catch(() => {
        if (!cancelled) setRelationship({ status: "none" });
      });
    return () => {
      cancelled = true;
    };
  }, [person.userId]);

  async function handleSendRequest() {
    if (acting) return;
    setActing(true);
    try {
      const request = await sendChatRequest(person.userId);
      setRelationship({ status: "pending_sent", requestId: request.requestId });
      toast.success("Message request sent");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't send this message request."));
    } finally {
      setActing(false);
    }
  }

  async function handleAccept(requestId: number) {
    if (acting) return;
    setActing(true);
    try {
      const conversation = await acceptChatRequest(requestId);
      onOpenConversation(conversation.id, person);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't accept this request."));
      setActing(false);
    }
  }

  async function handleReject(requestId: number) {
    if (acting) return;
    setActing(true);
    try {
      await rejectChatRequest(requestId);
      setRelationship({ status: "none" });
      toast.success("Request rejected");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't reject this request."));
    } finally {
      setActing(false);
    }
  }

  const canOpenDirectly = relationship?.status === "accepted";

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={canOpenDirectly ? 0.7 : 1}
      disabled={!canOpenDirectly}
      onPress={() => {
        if (canOpenDirectly && relationship?.status === "accepted" && relationship.conversationId) {
          onOpenConversation(relationship.conversationId, person);
        }
      }}
    >
      <View style={styles.avatar}>
        {person.photoUrl ? (
          <Image source={{ uri: person.photoUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{initialsFromName(person.name)}</Text>
        )}
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowName}>{person.name}</Text>
        <Text style={styles.rowSubtitle}>{person.roleLabel}</Text>
      </View>

      {relationship === null ? (
        <ActivityIndicator size="small" color="#B0B7C3" />
      ) : acting ? (
        <ActivityIndicator size="small" color="#2F6FE0" />
      ) : relationship.status === "none" ? (
        <TouchableOpacity style={styles.pillButton} onPress={handleSendRequest} hitSlop={8}>
          <Text style={styles.pillButtonText}>Request</Text>
        </TouchableOpacity>
      ) : relationship.status === "pending_sent" ? (
        <Text style={styles.mutedPillText}>Requested</Text>
      ) : relationship.status === "pending_received" ? (
        <View style={styles.pillRow}>
          <TouchableOpacity
            style={[styles.pillButton, styles.pillButtonOutline]}
            onPress={() => handleReject((relationship as { requestId: number }).requestId)}
            hitSlop={6}
          >
            <Text style={styles.pillButtonOutlineText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => handleAccept((relationship as { requestId: number }).requestId)}
            hitSlop={6}
          >
            <Text style={styles.pillButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color="#B0B7C3" />
      )}
    </TouchableOpacity>
  );
}

export function MessagesListScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { refreshUnreadCount, pendingRequestsCount, refreshPendingRequestsCount } = useMessaging();
  const { user } = useAuth();
  const canCreateGroup = !!user?.role && CAN_CREATE_GROUP_ROLES.has(user.role);
  const isStudent = user?.role === "student";

  // Same pattern as OnlineClassScreen/FacultyAttendanceScreen/the
  // conversation screen: hide the shared header immediately on focus (no
  // setTimeout - a deferred hide can lose a race against the conversation
  // screen's own focus effect). Restoring only happens on a genuine exit
  // (back/swipe-back out to Home) via beforeRemove below, never on blur -
  // blur also fires when merely pushing into a conversation, which should
  // NOT restore the header since that screen keeps it hidden too.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      refreshUnreadCount();
      refreshPendingRequestsCount();
    }, [navigation, refreshUnreadCount, refreshPendingRequestsCount]),
  );

  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
    });
  }, [navigation]);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessagePerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingChatWith, setStartingChatWith] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [filter, setFilter] = useState<ConversationFilterKey>("all");
  const [menuConversation, setMenuConversation] = useState<ConversationSummary | null>(null);
  const [pinningId, setPinningId] = useState<number | null>(null);

  const loadConversations = useCallback(() => {
    setStatus("loading");
    listConversations()
      .then((rows) => {
        setConversations(rows);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      searchPeople(trimmed)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function openConversation(
    conversationId: number,
    name: string,
    roleLabel: string,
    otherUserId: number,
    photoUrl: string | null,
  ) {
    setQuery("");
    router.push({
      pathname: "/(tabs)/home/messages/[conversationId]",
      params: {
        conversationId: String(conversationId),
        name,
        roleLabel,
        otherUserId: String(otherUserId),
        ...(photoUrl ? { photoUrl } : {}),
      },
    } as never);
  }

  function openGroup(conversationId: number) {
    router.push({
      pathname: "/(tabs)/home/messages/[conversationId]",
      params: { conversationId: String(conversationId), isGroup: "true" },
    } as never);
  }

  async function handleStartConversation(person: MessagePerson) {
    if (startingChatWith !== null) return;
    setStartingChatWith(person.userId);
    try {
      const conversation = await createConversation(person.userId);
      openConversation(conversation.id, person.name, person.roleLabel, person.userId, person.photoUrl);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't start this conversation."));
    } finally {
      setStartingChatWith(null);
    }
  }

  // Pin/unpin is personal to this user only (server never broadcasts it to
  // other participants - see MessagingService.setConversationPinned) and
  // never touches lastMessage/lastMessageAt, so the update below only ever
  // swaps isPinned and re-runs the same pinned-first stable sort the backend
  // already applies - no other row's position shifts.
  async function handleTogglePin(conversation: ConversationSummary) {
    if (pinningId !== null) return;
    setMenuConversation(null);
    setPinningId(conversation.id);
    try {
      const updated = conversation.isPinned
        ? await unpinConversation(conversation.id)
        : await pinConversation(conversation.id);
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === updated.id ? { ...c, isPinned: updated.isPinned } : c));
        next.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
        return next;
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update pin."));
    } finally {
      setPinningId(null);
    }
  }

  const isSearching = query.trim().length > 0;

  const filteredConversations = useMemo(() => {
    if (filter === "unread") return conversations.filter((c) => c.unreadCount > 0);
    if (filter === "groups") return conversations.filter((c) => c.isGroup);
    return conversations;
  }, [conversations, filter]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <Header
        onBack={() => router.back()}
        onNewGroup={canCreateGroup ? () => router.push("/(tabs)/home/messages/create-group" as never) : undefined}
        onRequests={isStudent ? () => router.push("/(tabs)/home/messages/requests" as never) : undefined}
        requestsBadgeCount={pendingRequestsCount}
      />

      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#9AA6B2" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#9AA6B2"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#B0B7C3" />
          </TouchableOpacity>
        )}
      </View>

      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => String(item.userId)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            searching ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !searching ? (
              <View style={styles.centerState}>
                <Text style={styles.emptyText}>No one found matching "{query.trim()}"</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            // Two students can't just tap-to-chat - see
            // StudentSearchResultRow's own doc comment. Every other pairing
            // (student→faculty, faculty→anyone, etc.) keeps the original
            // one-tap row untouched.
            if (isStudent && isStudentLabel(item.roleLabel)) {
              return (
                <StudentSearchResultRow
                  person={item}
                  onOpenConversation={(conversationId, otherUser) =>
                    openConversation(conversationId, otherUser.name, otherUser.roleLabel, otherUser.userId, otherUser.photoUrl)
                  }
                />
              );
            }
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                disabled={startingChatWith !== null}
                onPress={() => handleStartConversation(item)}
              >
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
                {startingChatWith === item.userId ? (
                  <ActivityIndicator size="small" color="#2F6FE0" />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#B0B7C3" />
                )}
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <>
          <View style={styles.filterRow}>
            {CONVERSATION_FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setFilter(f.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshing={status === "loading"}
            onRefresh={loadConversations}
            ListEmptyComponent={
              status === "loading" ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color="#2F6FE0" />
                </View>
              ) : status === "error" ? (
                <View style={styles.centerState}>
                  <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
                  <Text style={styles.emptyText}>Couldn't load your messages.</Text>
                  <TouchableOpacity onPress={loadConversations}>
                    <Text style={styles.retryText}>Tap to retry</Text>
                  </TouchableOpacity>
                </View>
              ) : conversations.length === 0 ? (
                <View style={styles.centerState}>
                  <Ionicons name="chatbubbles-outline" size={28} color="#B0B7C3" />
                  <Text style={styles.emptyText}>No conversations yet.</Text>
                  <Text style={styles.emptySubtext}>Search above to message someone.</Text>
                </View>
              ) : (
                <View style={styles.centerState}>
                  <Ionicons
                    name={filter === "unread" ? "checkmark-done-outline" : "people-outline"}
                    size={28}
                    color="#B0B7C3"
                  />
                  <Text style={styles.emptyText}>
                    {filter === "unread" ? "No unread conversations." : "No group conversations."}
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const displayName = item.isGroup ? (item.title ?? "Group") : item.otherUser!.name;
              const displaySubtitle = item.isGroup
                ? `Group · ${item.memberCount ?? 0} member${item.memberCount === 1 ? "" : "s"}`
                : item.otherUser!.roleLabel;
              const photoUrl = item.isGroup ? item.imageUrl : item.otherUser!.photoUrl;

              return (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.7}
                  disabled={pinningId === item.id}
                  onPress={() =>
                    item.isGroup
                      ? openGroup(item.id)
                      : openConversation(
                          item.id,
                          item.otherUser!.name,
                          item.otherUser!.roleLabel,
                          item.otherUser!.userId,
                          item.otherUser!.photoUrl,
                        )
                  }
                  onLongPress={() => setMenuConversation(item)}
                  delayLongPress={280}
                >
                  <View style={styles.avatar}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                    ) : item.isGroup ? (
                      <Ionicons name="people" size={18} color="#2F6FE0" />
                    ) : (
                      <Text style={styles.avatarText}>{initialsFromName(displayName)}</Text>
                    )}
                  </View>
                  <View style={styles.rowTextWrap}>
                    <View style={styles.rowNameLine}>
                      {item.isPinned && (
                        <Ionicons name="pin" size={12} color="#2F6FE0" style={styles.pinIcon} />
                      )}
                      <Text style={styles.rowName} numberOfLines={1}>
                        {displayName}
                      </Text>
                    </View>
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                      {displaySubtitle}
                    </Text>
                    {item.lastMessage && (
                      <Text style={styles.rowPreview} numberOfLines={1}>
                        {item.lastMessage.isDeleted ? "Message deleted" : item.lastMessage.body}
                      </Text>
                    )}
                  </View>
                  <View style={styles.rowMeta}>
                    {pinningId === item.id ? (
                      <ActivityIndicator size="small" color="#2F6FE0" />
                    ) : (
                      <>
                        {item.lastMessageAt && (
                          <Text style={styles.rowTime}>{formatRelativeTime(item.lastMessageAt)}</Text>
                        )}
                        {item.unreadCount > 0 && <View style={styles.unreadDot} />}
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

      <Modal
        visible={!!menuConversation}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuConversation(null)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuConversation(null)}>
          <Pressable style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={() => {}}>
            <View style={styles.menuHandle} />
            {menuConversation && (
              <TouchableOpacity style={styles.menuRow} onPress={() => handleTogglePin(menuConversation)}>
                <Ionicons
                  name={menuConversation.isPinned ? "pin" : "pin-outline"}
                  size={18}
                  color="#2F6FE0"
                />
                <Text style={styles.menuRowText}>
                  {menuConversation.isPinned ? "Unpin chat" : "Pin chat"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.menuRow, styles.menuCancelRow]}
              onPress={() => setMenuConversation(null)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

export default MessagesListScreen;

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
  headerBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#1A3D8F",
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: fonts.bold,
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
  headerTextWrap: {
    flex: 1,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#111827",
    padding: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  filterPillActive: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  filterPillText: {
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  filterPillTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  row: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  rowTextWrap: {
    flex: 1,
  },
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  pinIcon: {
    marginRight: 4,
  },
  rowName: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#7A828E",
    marginTop: 1,
  },
  rowPreview: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 3,
  },
  rowMeta: {
    alignItems: "flex-end",
    gap: 6,
  },
  rowTime: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2F6FE0",
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#B0B7C3",
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  pillRow: {
    flexDirection: "row",
    gap: 6,
  },
  pillButton: {
    backgroundColor: "#2F6FE0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillButtonText: {
    fontSize: 11.5,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  pillButtonOutline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillButtonOutlineText: {
    fontSize: 11.5,
    fontFamily: fonts.bold,
    color: "#6B7280",
  },
  mutedPillText: {
    fontSize: 11.5,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.4)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  menuHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuRowText: {
    fontSize: 14.5,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  menuCancelRow: {
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F2F4",
    marginTop: 4,
  },
  menuCancelText: {
    fontSize: 14.5,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
});
