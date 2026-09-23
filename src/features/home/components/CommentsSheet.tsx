import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { formatRelativeTime } from "@/utils/calendar";
import { useAuth } from "@/context/AuthContext";
import { getAchievement, addAchievementComment } from "@/services/api/achievements.api";
import { getAnnouncementComments, addAnnouncementComment } from "@/services/api/announcements.api";

export type CommentsSource = {
  kind: "achievement" | "announcement";
  id: number;
  // Announcement posts can have commenting turned off per-post - achievement
  // posts have no such flag (comments are always open on them).
  allowComments?: boolean;
};

// One shape both achievement comments ({commenter: {name, department}}) and
// announcement comments ({commenter_name}) get flattened into, so the sheet
// itself doesn't need to know which backing table it's rendering.
type DisplayComment = {
  id: number;
  authorName: string;
  authorSubtitle: string | null;
  text: string;
  createdAt: string;
  isMine: boolean;
};

function initialsFromName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// The logged-in user's own comment(s) first, then everyone else in their
// original (oldest-first) order - a stable partition, not a re-sort, so
// "first" among each group still reads chronologically.
function reorderMineFirst(list: DisplayComment[]): DisplayComment[] {
  const mine = list.filter((c) => c.isMine);
  const others = list.filter((c) => !c.isMine);
  return [...mine, ...others];
}

const DRAG_DISMISS_THRESHOLD = 120;

// Shared Instagram-style comments bottom sheet for the Home feed - replaces
// the old per-card inline expand/composer that used to live inside PostCard
// and AnnouncementPostCard. Mounted once by HomeFeedScreen; which post it's
// showing comments for is just the `source` prop, so opening a different
// post's comments while the sheet is already open (shouldn't normally
// happen since the feed is behind a dimmed overlay, but just in case) simply
// refetches for the new source rather than merging with stale state.
export function CommentsSheet({
  visible,
  source,
  onClose,
  onCountChange,
}: {
  visible: boolean;
  source: CommentsSource | null;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}) {
  const { user } = useAuth();
  const myUserId = user?.id ?? null;

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [comments, setComments] = useState<DisplayComment[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DRAG_DISMISS_THRESHOLD || gesture.vy > 0.8) {
          Animated.timing(translateY, { toValue: 600, duration: 180, useNativeDriver: true }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (!visible || !source) return;
    translateY.setValue(0);
    setStatus("loading");
    setComments([]);

    const request =
      source.kind === "achievement"
        ? getAchievement(source.id).then((detail) =>
            detail.achievement_comments.map(
              (c): DisplayComment => ({
                id: c.id,
                authorName: c.commenter?.name ?? "Unknown",
                authorSubtitle: c.commenter?.department ?? null,
                text: c.comment_text,
                createdAt: c.created_at,
                isMine: c.commented_by_user_id === myUserId,
              }),
            ),
          )
        : getAnnouncementComments(source.id).then((rows) =>
            rows.map(
              (c): DisplayComment => ({
                id: c.id,
                authorName: c.commenter_name ?? "Unknown",
                authorSubtitle: null,
                text: c.comment_text,
                createdAt: c.created_at,
                isMine: c.commented_by_user_id === myUserId,
              }),
            ),
          );

    request
      .then((list) => {
        const ordered = reorderMineFirst(list);
        setComments(ordered);
        setStatus("success");
        onCountChange?.(ordered.length);
      })
      .catch((error) => {
        setStatus("error");
        toast.error(getApiErrorMessage(error, "Couldn't load comments."));
      });
    // Only re-fetch when a different post's comments are opened, not on
    // every render - onCountChange/myUserId changing shouldn't re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, source?.kind, source?.id]);

  async function handlePost() {
    const text = draft.trim();
    if (!text || posting || !source) return;

    setPosting(true);
    try {
      const created =
        source.kind === "achievement"
          ? await addAchievementComment(source.id, text)
          : await addAnnouncementComment(source.id, text);

      const display: DisplayComment = {
        id: created.id,
        authorName:
          source.kind === "achievement"
            ? (created as { commenter: { name: string } | null }).commenter?.name ?? user?.email ?? "You"
            : (created as { commenter_name: string | null }).commenter_name ?? user?.email ?? "You",
        authorSubtitle:
          source.kind === "achievement"
            ? (created as { commenter: { department: string } | null }).commenter?.department ?? null
            : null,
        text: created.comment_text,
        createdAt: created.created_at,
        isMine: true,
      };

      // Prepended, not re-fetched - it's already the only copy of this
      // comment we have, so there's nothing to dedupe against. The next
      // time this sheet is opened fresh for this post, the server's own
      // list will already include it exactly once.
      setComments((prev) => {
        const next = [display, ...prev];
        onCountChange?.(next.length);
        return next;
      });
      setDraft("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't post your comment."));
    } finally {
      setPosting(false);
    }
  }

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  const commentsDisabled = source?.kind === "announcement" && source.allowComments === false;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View {...panResponder.panHandlers}>
              <View style={styles.dragHandle} />
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Comments</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={10} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>

            {status === "loading" ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            ) : status === "error" ? (
              <View style={styles.centerState}>
                <Ionicons name="cloud-offline-outline" size={26} color="#B0B7C3" />
                <Text style={styles.emptyText}>Couldn't load comments.</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => String(item.id)}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.centerState}>
                    <Ionicons name="chatbubble-outline" size={26} color="#B0B7C3" />
                    <Text style={styles.emptyText}>No comments yet. Be the first.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <View style={[styles.avatar, item.isMine && styles.avatarMine]}>
                      <Text style={[styles.avatarText, item.isMine && styles.avatarTextMine]}>
                        {initialsFromName(item.authorName)}
                      </Text>
                    </View>
                    <View style={styles.commentBody}>
                      <View style={styles.commentAuthorRow}>
                        <Text style={styles.commentAuthor} numberOfLines={1}>
                          {item.isMine ? "You" : item.authorName}
                        </Text>
                        {item.authorSubtitle && (
                          <Text style={styles.commentSubtitle} numberOfLines={1}>
                            · {item.authorSubtitle}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.commentText}>{item.text}</Text>
                      <Text style={styles.commentTime}>{formatRelativeTime(item.createdAt)}</Text>
                    </View>
                  </View>
                )}
              />
            )}

            {commentsDisabled ? (
              <View style={styles.disabledRow}>
                <Ionicons name="lock-closed-outline" size={14} color="#9AA1AD" />
                <Text style={styles.disabledText}>Comments are turned off for this post.</Text>
              </View>
            ) : (
              <View style={styles.composerRow}>
                <TextInput
                  style={styles.composerInput}
                  placeholder="Write a comment..."
                  placeholderTextColor="#9AA6B2"
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  maxLength={1000}
                  editable={!posting}
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!draft.trim() || posting) && styles.sendButtonDisabled]}
                  onPress={handlePost}
                  disabled={!draft.trim() || posting}
                >
                  {posting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={15} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "75%",
    overflow: "hidden",
  },
  dragHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  closeButton: {
    position: "absolute",
    right: 14,
    top: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMine: {
    backgroundColor: "#2F6FE0",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  avatarTextMine: {
    color: "#fff",
  },
  commentBody: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
    flexShrink: 1,
  },
  commentSubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    flexShrink: 1,
  },
  commentText: {
    fontSize: 13.5,
    fontFamily: fonts.regular,
    color: "#374151",
    lineHeight: 19,
    marginTop: 2,
  },
  commentTime: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA1AD",
    marginTop: 4,
  },
  disabledRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  disabledText: {
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: "#9AA1AD",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    backgroundColor: "#fff",
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
    fontSize: 13.5,
    fontFamily: fonts.regular,
    color: "#111827",
    backgroundColor: "#F3F4F6",
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
    backgroundColor: "#C7D3EE",
  },
});
