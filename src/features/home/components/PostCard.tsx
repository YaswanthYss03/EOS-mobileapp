import { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { formatRelativeTime } from "@/utils/calendar";
import {
  getAchievement,
  addAchievementComment,
  type AchievementListItem,
  type AchievementComment,
} from "@/services/api/achievements.api";

const logoSource = require("../../../../assets/logo.png");

type Props = {
  post: AchievementListItem;
};

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Splits on hashtags (keeping them, via a capturing group) so they can be
// highlighted without touching the rest of the caption text.
function DescriptionText({ text }: { text: string }) {
  const parts = text.split(/(#[A-Za-z0-9_]+)/g);
  return (
    <Text style={styles.description}>
      {parts.map((part, index) =>
        part.startsWith("#") ? (
          <Text key={index} style={styles.hashtag}>
            {part}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        ),
      )}
    </Text>
  );
}

// Media Room posts photos of any shape - event banners tend to be wide,
// placement/poster graphics tend to be tall portraits (see the "SUPER DREAM
// OFFERS" poster this was written for). A fixed aspectRatio here would crop
// whichever shape it wasn't tuned for, so this clamps to the real image's
// own ratio instead - same idea as Twitter/Instagram's own image cards:
// respect the real shape within sane bounds, rather than force one shape
// on everything.
const MIN_IMAGE_ASPECT_RATIO = 0.55; // tall portrait floor
const MAX_IMAGE_ASPECT_RATIO = 1.91; // wide landscape ceiling
const DEFAULT_IMAGE_ASPECT_RATIO = 1; // square, while the real size is still loading

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

// Every post is from the college's own account (Media Room only - see
// AchievementsController's own doc comment), so the author header is fixed
// rather than per-post data. Comments below it are wired to the real
// backend: GET .../:id (lazy-loaded on "View comments") and POST
// .../:id/comments, each comment carrying a server-resolved
// {name, department} for whoever wrote it (see resolveCommenterDisplays).
export function PostCard({ post }: Props) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [comments, setComments] = useState<AchievementComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(DEFAULT_IMAGE_ASPECT_RATIO);

  const commentCount = comments?.length ?? post._count.achievement_comments;
  const firstMedia = post.achievement_media[0];
  const displayedImageUrl = firstMedia
    ? firstMedia.media_type === "video"
      ? firstMedia.thumbnail_url ?? firstMedia.media_url
      : firstMedia.media_url
    : null;

  useEffect(() => {
    if (!displayedImageUrl) return;
    Image.getSize(
      displayedImageUrl,
      (width, height) => setImageAspectRatio(clamp(width / height, MIN_IMAGE_ASPECT_RATIO, MAX_IMAGE_ASPECT_RATIO)),
      () => setImageAspectRatio(DEFAULT_IMAGE_ASPECT_RATIO),
    );
  }, [displayedImageUrl]);
  const mediaCount = post.achievement_media.length;

  async function handleToggleComments() {
    const expanding = !commentsExpanded;
    setCommentsExpanded(expanding);
    if (!expanding || comments !== null) return;

    setLoadingComments(true);
    try {
      const detail = await getAchievement(post.id);
      setComments(detail.achievement_comments);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't load comments"));
      setCommentsExpanded(false);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleSendComment() {
    const text = commentText.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const created = await addAchievementComment(post.id, text);
      setComments((prev) => [created, ...(prev ?? [])]);
      setCommentsExpanded(true);
      setCommentText("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't post your comment"));
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image source={logoSource} style={styles.avatar} />
        <View style={styles.headerTextWrap}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              Sri Eshwar College of Engineering
            </Text>
            <Ionicons name="checkmark-circle" size={14} color="#2F6FE0" />
          </View>
          <Text style={styles.handle}>@srieshwarncbe · {formatRelativeTime(post.created_at)}</Text>
        </View>
        <TouchableOpacity hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#9AA6B2" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{post.title}</Text>
      {post.description ? <DescriptionText text={post.description} /> : null}

      {firstMedia && displayedImageUrl && (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: displayedImageUrl }}
            style={[styles.postImage, { aspectRatio: imageAspectRatio }]}
          />
          {firstMedia.media_type === "video" && (
            <View style={styles.playBadge}>
              <Ionicons name="play" size={18} color="#fff" />
            </View>
          )}
          {mediaCount > 1 && (
            <View style={styles.pageBadge}>
              <Text style={styles.pageBadgeText}>1/{mediaCount}</Text>
            </View>
          )}
        </View>
      )}

      {commentCount > 0 && (
        <TouchableOpacity style={styles.toggleRow} onPress={handleToggleComments} hitSlop={8}>
          <Text style={styles.toggleText}>
            {commentsExpanded
              ? "Hide comments"
              : `View ${commentCount > 1 ? `all ${commentCount} comments` : "1 comment"}`}
          </Text>
          <Ionicons name={commentsExpanded ? "chevron-up" : "chevron-down"} size={14} color="#2F6FE0" />
        </TouchableOpacity>
      )}

      {commentsExpanded && (
        <View style={styles.commentsList}>
          {loadingComments ? (
            <ActivityIndicator color="#2F6FE0" style={{ paddingVertical: 8 }} />
          ) : (
            comments?.map((comment) => (
              <View key={comment.id} style={styles.commentRow}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {initialsFromName(comment.commenter?.name ?? "?")}
                  </Text>
                </View>
                <View style={styles.commentTextWrap}>
                  <View style={styles.commentAuthorRow}>
                    <Text style={styles.commentAuthor}>{comment.commenter?.name ?? "Unknown"}</Text>
                    {comment.commenter && (
                      <>
                        <Text style={styles.commentAuthorDot}>·</Text>
                        <Text style={styles.commentDepartment} numberOfLines={1}>
                          {comment.commenter.department}
                        </Text>
                      </>
                    )}
                  </View>
                  <Text style={styles.commentText}>{comment.comment_text}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.inputRow}>
        <View style={styles.inputIconWrap}>
          <Ionicons name="chatbox-outline" size={16} color="#9AA6B2" />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Write a comment..."
          placeholderTextColor="#9AA6B2"
          value={commentText}
          onChangeText={setCommentText}
          onSubmitEditing={handleSendComment}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!commentText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSendComment}
          disabled={!commentText.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={15} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  headerTextWrap: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  handle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
    paddingTop: 10,
  },
  description: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#1F2937",
    lineHeight: 19,
    paddingTop: 4,
  },
  hashtag: {
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  imageWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  postImage: {
    // aspectRatio is applied inline per-post (see imageAspectRatio) -
    // sized to the real image's own shape, clamped between
    // MIN/MAX_IMAGE_ASPECT_RATIO, rather than one fixed ratio for every
    // post regardless of whether the actual photo is portrait or landscape.
    width: "100%",
    backgroundColor: "#eee",
  },
  playBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(17,24,39,0.6)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pageBadgeText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#fff",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingTop: 10,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  commentsList: {
    paddingTop: 10,
    gap: 10,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  commentTextWrap: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  commentAuthor: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  commentAuthorDot: {
    fontSize: 12,
    color: "#B0B7C3",
  },
  commentDepartment: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  commentText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#4B5563",
    marginTop: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  inputIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#C7D3EE",
  },
});
