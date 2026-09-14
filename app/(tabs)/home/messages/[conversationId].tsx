import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  listMessages,
  editMessage,
  deleteMessage,
  type ChatMessage,
} from "@/services/api/messaging.api";
import { useMessaging } from "@/context/MessagingContext";
import { useAuth } from "@/context/AuthContext";
import { confirm } from "@/utils/confirm";

// A message that only exists locally until the server (or a "send failed"
// error) reconciles it - keyed by clientGeneratedId, never a real numeric id
// until then.
type PendingMessage = ChatMessage & { pending: boolean; failed: boolean };

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "TODAY";
  if (date.toDateString() === yesterday.toDateString()) return "YESTERDAY";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function newClientId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function ChatHeader({
  name,
  roleLabel,
  onBack,
}: {
  name: string;
  roleLabel: string;
  onBack: () => void;
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
      <View style={styles.headerAvatar}>
        <Text style={styles.headerAvatarText}>{initialsFromName(name)}</Text>
      </View>
      <View style={styles.headerTextWrap}>
        <Text style={styles.headerName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {roleLabel}
        </Text>
      </View>
    </LinearGradient>
  );
}

export function ConversationScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { socket, refreshUnreadCount } = useMessaging();
  const params = useLocalSearchParams<{
    conversationId: string;
    name?: string;
    roleLabel?: string;
    otherUserId?: string;
  }>();

  const conversationId = Number(params.conversationId);
  const otherUserId = params.otherUserId ? Number(params.otherUserId) : null;
  const name = params.name ?? "Conversation";
  const roleLabel = params.roleLabel ?? "";
  const myUserId = user?.id ?? null;

  // Same pattern as OnlineClassScreen/FacultyAttendanceScreen: hide the
  // shared header immediately on focus (no setTimeout - a deferred hide can
  // still lose a race against the messages-list screen's own focus effect
  // when navigating between them). Restoring only happens on a genuine exit
  // (back/swipe-back) via beforeRemove below, never on blur, since blur also
  // fires when this screen is merely covered (e.g. a modal) rather than left.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
    }, [navigation]),
  );

  useEffect(() => {
    return navigation.addListener("beforeRemove", () => {
      // Anything the other side sent while this thread was open should
      // already be marked read (see the message:new handler below) - this
      // just makes sure the header badge reflects that on the way out.
      refreshUnreadCount();
      navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
    });
  }, [navigation, refreshUnreadCount]);

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [messages, setMessages] = useState<PendingMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Long-pressing one of MY OWN bubbles opens a small Edit/Delete menu for
  // it; picking Edit switches the composer into edit mode (editingMessage)
  // instead of sending a new message.
  const [menuMessage, setMenuMessage] = useState<PendingMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<PendingMessage | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const markReadUpTo = useCallback(
    (rows: ChatMessage[]) => {
      if (!socket || !myUserId) return;
      const theirUnread = rows.filter((m) => m.senderUserId !== myUserId && m.status !== "read");
      if (theirUnread.length === 0) return;
      const upToMessageId = Math.max(...theirUnread.map((m) => m.id));
      socket.emit("message:read", { conversationId, upToMessageId });
    },
    [socket, myUserId, conversationId],
  );

  useEffect(() => {
    setStatus("loading");
    listMessages(conversationId)
      .then((rows) => {
        setMessages(rows.map((m) => ({ ...m, pending: false, failed: false })));
        setStatus("success");
        markReadUpTo(rows);
      })
      .catch(() => setStatus("error"));
    // Only reload from REST when the conversation itself changes - markReadUpTo
    // depends on `socket`, which would otherwise refire this on every
    // reconnect and reset the whole thread back to a loading spinner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (!socket) return;
    const currentSocket = socket;
    currentSocket.emit("conversation:join", { conversationId });

    function onNew({ message }: { message: ChatMessage & { clientGeneratedId?: string } }) {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => {
        const byClientId = message.clientGeneratedId
          ? prev.findIndex((m) => (m as ChatMessage & { clientGeneratedId?: string }).clientGeneratedId === message.clientGeneratedId && m.pending)
          : -1;
        if (byClientId >= 0) {
          const next = [...prev];
          next[byClientId] = { ...message, pending: false, failed: false };
          return next;
        }
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, { ...message, pending: false, failed: false }];
      });
      if (message.senderUserId !== myUserId) {
        currentSocket.emit("message:read", { conversationId, upToMessageId: message.id });
      }
    }

    function onRead({ upToMessageId, readByUserId }: { upToMessageId: number; readByUserId: number }) {
      if (readByUserId === myUserId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id <= upToMessageId && m.senderUserId === myUserId ? { ...m, status: "read" } : m)),
      );
    }

    function onEdited({ messageId, body }: { messageId: number; body: string }) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body, isEdited: true } : m)));
    }

    function onDeleted({ messageId }: { messageId: number }) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body: null, isDeleted: true } : m)));
    }

    function onError({ code, clientGeneratedId }: { code?: string; clientGeneratedId?: string; message?: string }) {
      if (clientGeneratedId) {
        setMessages((prev) =>
          prev.map((m) =>
            (m as ChatMessage & { clientGeneratedId?: string }).clientGeneratedId === clientGeneratedId
              ? { ...m, pending: false, failed: true }
              : m,
          ),
        );
      }
      if (code === "STUDENT_TO_STUDENT_BLOCKED") {
        toast.error("Students can't message other students.");
      } else if (code === "RATE_LIMITED") {
        toast.warning("Sending too fast — slow down a little.");
      } else {
        toast.error("Couldn't send that message.");
      }
    }

    socket.on("message:new", onNew);
    socket.on("message:read", onRead);
    socket.on("message:edited", onEdited);
    socket.on("message:deleted", onDeleted);
    socket.on("error", onError);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:read", onRead);
      socket.off("message:edited", onEdited);
      socket.off("message:deleted", onDeleted);
      socket.off("error", onError);
    };
  }, [socket, conversationId, myUserId]);

  function sendText(body: string) {
    const text = body.trim();
    if (!text || !socket) return;
    const clientGeneratedId = newClientId();
    const optimistic: PendingMessage & { clientGeneratedId: string } = {
      id: -Date.now(),
      conversationId,
      senderUserId: myUserId ?? -1,
      body: text,
      isDeleted: false,
      isEdited: false,
      status: "sent",
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
      pending: true,
      failed: false,
      clientGeneratedId,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);
    socket.emit("message:send", { conversationId, body: text, clientGeneratedId });
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    setTimeout(() => setSending(false), 400);
  }

  async function saveEdit() {
    const text = draft.trim();
    const original = editingMessage;
    if (!text || !original || savingEdit) return;
    setSavingEdit(true);
    try {
      await editMessage(original.id, text);
      setMessages((prev) =>
        prev.map((m) => (m.id === original.id ? { ...m, body: text, isEdited: true } : m)),
      );
      setEditingMessage(null);
      setDraft("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save that edit."));
    } finally {
      setSavingEdit(false);
    }
  }

  function cancelEdit() {
    setEditingMessage(null);
    setDraft("");
  }

  function handleSend() {
    if (editingMessage) {
      saveEdit();
      return;
    }
    sendText(draft);
  }

  function openMessageMenu(message: PendingMessage) {
    if (message.senderUserId !== myUserId || message.pending || message.failed || message.isDeleted) return;
    setMenuMessage(message);
  }

  function startEdit() {
    if (!menuMessage) return;
    setEditingMessage(menuMessage);
    setDraft(menuMessage.body ?? "");
    setMenuMessage(null);
  }

  async function confirmDelete() {
    const target = menuMessage;
    setMenuMessage(null);
    if (!target) return;
    const ok = await confirm({
      title: "Delete message?",
      message: "This will delete it for everyone in this conversation.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMessage(target.id);
      setMessages((prev) =>
        prev.map((m) => (m.id === target.id ? { ...m, body: null, isDeleted: true } : m)),
      );
      if (editingMessage?.id === target.id) cancelEdit();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't delete that message."));
    }
  }

  // Built oldest-first, then reversed for the inverted FlatList below (index
  // 0 renders at the bottom) - the double-flip cancels out, so day dividers
  // still land above the first message of their day on screen.
  const rowsWithDividers = useMemo(() => {
    const out: ({ type: "divider"; label: string; key: string } | { type: "message"; item: PendingMessage })[] = [];
    let lastDay: string | null = null;
    for (const item of messages) {
      const label = dayLabel(item.createdAt);
      if (label !== lastDay) {
        out.push({ type: "divider", label, key: `divider-${item.id}-${label}` });
        lastDay = label;
      }
      out.push({ type: "message", item });
    }
    return out.reverse();
  }, [messages]);

  const lastMineId = useMemo(() => {
    const mine = messages.filter((m) => m.senderUserId === myUserId && !m.pending);
    return mine.length > 0 ? mine[mine.length - 1].id : null;
  }, [messages, myUserId]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      // app.json has `android.edgeToEdgeEnabled: true` - under edge-to-edge,
      // Android does NOT auto-resize the window for the keyboard the way
      // "adjustResize" used to (the app draws behind the system bars and is
      // expected to react to the keyboard itself), so this component's own
      // compensation is required on Android too, not just iOS. "height" was
      // tried here before and left the input row stranded mid-screen after
      // the keyboard closed (a known flakiness with RN's "height" mode on
      // Android) - "padding" is the more reliable behavior on both
      // platforms: it just grows/shrinks bottom padding in sync with the
      // keyboard's own show/hide animation instead of resizing the view.
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.container} edges={[]}>
        <ChatHeader
          name={name}
          roleLabel={roleLabel}
          onBack={() => {
            // Dismiss first, then navigate - leaving while the keyboard is
            // still open/animating is what left this screen's own
            // KeyboardAvoidingView padding stuck mid-unwind, so the list
            // screen briefly rendered shifted instead of exactly like it
            // looked before this screen was entered.
            Keyboard.dismiss();
            router.back();
          }}
        />

        {status === "loading" ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        ) : status === "error" ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.emptyText}>Couldn't load this conversation.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.list}
            inverted
            data={rowsWithDividers}
            keyExtractor={(row) => (row.type === "divider" ? row.key : `msg-${row.item.id}`)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: row }) => {
              if (row.type === "divider") {
                return (
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{row.label}</Text>
                    <View style={styles.dividerLine} />
                  </View>
                );
              }
              const message = row.item;
              const mine = message.senderUserId === myUserId;
              const editable = mine && !message.pending && !message.failed && !message.isDeleted;
              return (
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  {!mine && (
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniAvatarText}>{initialsFromName(name)}</Text>
                    </View>
                  )}
                  {editable && (
                    <TouchableOpacity
                      style={styles.bubbleMenuButton}
                      hitSlop={8}
                      onPress={() => openMessageMenu(message)}
                    >
                      <Ionicons name="ellipsis-vertical" size={14} color="#9AA6B2" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.bubbleWrap}>
                    <TouchableOpacity
                      activeOpacity={editable ? 0.7 : 1}
                      onLongPress={() => openMessageMenu(message)}
                      delayLongPress={280}
                      style={[
                        styles.bubble,
                        mine ? styles.bubbleMine : styles.bubbleTheirs,
                        editingMessage?.id === message.id && styles.bubbleEditing,
                      ]}
                    >
                      <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                        {message.isDeleted ? "Message deleted" : message.body}
                      </Text>
                    </TouchableOpacity>
                    <View style={[styles.bubbleMetaRow, mine && styles.bubbleMetaRowMine]}>
                      <Text style={styles.bubbleMeta}>
                        {message.pending
                          ? "Sending…"
                          : message.failed
                            ? "Failed to send"
                            : message.isDeleted
                              ? clockTime(message.createdAt)
                              : message.isEdited
                                ? `${clockTime(message.createdAt)} · Edited`
                                : clockTime(message.createdAt)}
                      </Text>
                      {mine && message.id === lastMineId && message.status === "read" && (
                        <Text style={styles.seenText}> · Seen</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {editingMessage && (
          <View style={styles.editBanner}>
            <Ionicons name="pencil" size={13} color="#2F6FE0" />
            <Text style={styles.editBannerText} numberOfLines={1}>
              Editing message
            </Text>
            <TouchableOpacity onPress={cancelEdit} hitSlop={8}>
              <Ionicons name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            placeholder="Write a message"
            placeholderTextColor="#9AA6B2"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!draft.trim() || sending || savingEdit) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || sending || savingEdit}
          >
            {savingEdit ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={editingMessage ? "checkmark" : "arrow-forward"} size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal visible={!!menuMessage} transparent animationType="fade" onRequestClose={() => setMenuMessage(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuMessage(null)}>
          <Pressable style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom, 16) }]} onPress={() => {}}>
            <View style={styles.menuHandle} />
            <TouchableOpacity style={styles.menuRow} onPress={startEdit}>
              <Ionicons name="pencil-outline" size={18} color="#2F6FE0" />
              <Text style={styles.menuRowText}>Edit message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={[styles.menuRowText, styles.menuRowTextDanger]}>Delete message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuRow, styles.menuCancelRow]} onPress={() => setMenuMessage(null)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

export default ConversationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  headerTextWrap: {
    flex: 1,
  },
  headerName: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 11.5,
    fontFamily: fonts.medium,
    marginTop: 1,
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
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  bubbleRowTheirs: {
    justifyContent: "flex-start",
  },
  bubbleRowMine: {
    justifyContent: "flex-end",
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  bubbleMenuButton: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: 14,
  },
  bubbleWrap: {
    maxWidth: "75%",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleTheirs: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: "#2F6FE0",
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 13.5,
    fontFamily: fonts.regular,
    color: "#111827",
    lineHeight: 19,
  },
  bubbleTextMine: {
    color: "#fff",
  },
  bubbleMetaRow: {
    flexDirection: "row",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  bubbleMetaRowMine: {
    justifyContent: "flex-end",
  },
  bubbleMeta: {
    fontSize: 10.5,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  seenText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF0F4",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 13.5,
    fontFamily: fonts.regular,
    color: "#111827",
    backgroundColor: "#F7F8FA",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  bubbleEditing: {
    borderWidth: 2,
    borderColor: "#F5A623",
  },
  editBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#EAF0FD",
    borderTopWidth: 1,
    borderTopColor: "#DCE6FB",
  },
  editBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
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
  menuRowTextDanger: {
    color: "#DC2626",
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
