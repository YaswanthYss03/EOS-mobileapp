import { useState } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Linking,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { formatRelativeTime } from "@/utils/calendar";
import { PostMediaCarousel } from "./PostMediaCarousel";
import {
  getAnnouncementComments,
  addAnnouncementComment,
  type Announcement,
  type AnnouncementComment,
} from "@/services/api/announcements.api";

const logoSource = require("../../../../assets/logo.png");

// Category colours mirror the announcement_category_enum values the backend
// actually stores - there is no "social" category, so a Media Room post shows
// whichever real category it was published under.
const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  academic: { bg: "#EAF0FD", text: "#2F6FE0" },
  department: { bg: "#F3E8FF", text: "#7C3AED" },
  emergency: { bg: "#FDECEA", text: "#C0392B" },
  event: { bg: "#E7F7EF", text: "#1E8A5A" },
  general: { bg: "#EEF0F4", text: "#4B5563" },
};

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Same hashtag highlighting the achievement PostCard uses, so a Media Room
// caption reads identically whichever table it came from.
function CaptionText({ text }: { text: string }) {
  const parts = text.split(/(#[A-Za-z0-9_]+)/g);
  return (
    <Text style={styles.caption}>
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

const MIN_IMAGE_ASPECT_RATIO = 0.55;
const MAX_IMAGE_ASPECT_RATIO = 1.91;
const DEFAULT_IMAGE_ASPECT_RATIO = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * A published announcement rendered as a feed post.
 *
 * This is what a Media Room social post looks like in the app: the same shape
 * as an achievement post, but sourced from `announcements` +
 * `social_post_details` rather than `achievements`. Everything shown here is
 * real server data - author, category, attachment, pin state, external link
 * and comments.
 *
 * Only the attachment is rendered as an image. `file_url` can legitimately be
 * a PDF or document, so it is only treated as an image when the URL looks like
 * one; anything else is offered as an "Open attachment" link instead of a
 * broken image box.
 */
export function AnnouncementPostCard({ post }: { post: Announcement }) {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_IMAGE_ASPECT_RATIO);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<AnnouncementComment[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const author = post.posted_by;
  // A Media Room post is published in the college's own name, not an
  // individual's - so it shows the official logo and the institution as the
  // author, the way a brand account works on any social feed. Keyed on the
  // real role string the API returns.
  const isOfficial = author?.role === "media_room" || author === undefined;
  const authorName = isOfficial ? "EOS College" : (author?.name ?? "Media Room");
  const authorLine = isOfficial
    ? "Media Room"
    : [author?.designation, author?.department].filter(Boolean).join(" · ");
  const isPinned = post.social?.is_pinned === true;
  const allowComments = post.social?.allow_comments !== false;
  const linkUrl = post.social?.link_url ?? null;
  const category = post.category;

  const carousel = post.media ?? [];
  const attachment = post.file_url;
  const looksLikeImage =
    attachment != null && /\.(png|jpe?g|gif|webp|bmp|heic)(\?|$)/i.test(attachment);

  async function toggleComments() {
    const opening = !commentsOpen;
    setCommentsOpen(opening);
    if (!opening || comments !== null) return;

    setLoadingComments(true);
    try {
      setComments(await getAnnouncementComments(post.id));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't load comments."));
      setCommentsOpen(false);
    } finally {
      setLoadingComments(false);
    }
  }

  async function submitComment() {
    const text = draft.trim();
    if (!text) return;
    setPosting(true);
    try {
      const created = await addAnnouncementComment(post.id, text);
      // Appended locally rather than refetching the whole thread - the server
      // returned the created row, so a round trip would tell us nothing new.
      setComments((current) => [...(current ?? []), created]);
      setDraft("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't post your comment."));
    } finally {
      setPosting(false);
    }
  }

  async function openLink() {
    if (!linkUrl) return;
    const ok = await Linking.canOpenURL(linkUrl);
    if (!ok) {
      toast.error("That link can't be opened.");
      return;
    }
    await Linking.openURL(linkUrl);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, isOfficial && styles.avatarOfficial]}>
          {isOfficial ? (
            <Image source={logoSource} style={styles.avatarLogo} resizeMode="contain" />
          ) : (
            <Text style={styles.avatarText}>{initialsFromName(authorName)}</Text>
          )}
        </View>
        <View style={styles.headerText}>
          <View style={styles.headerTopRow}>
            <Text style={styles.authorName} numberOfLines={1}>
              {authorName}
            </Text>
            {isPinned && (
              <View style={styles.pinnedChip}>
                <Ionicons name="pin" size={10} color="#B26A00" />
                <Text style={styles.pinnedChipText}>Pinned</Text>
              </View>
            )}
          </View>
          <Text style={styles.metaLine} numberOfLines={1}>
            {authorLine ? `${authorLine} · ` : ""}
            {formatRelativeTime(post.created_at)}
          </Text>
        </View>
        {category && CATEGORY_STYLE[category] && (
          <View style={[styles.categoryChip, { backgroundColor: CATEGORY_STYLE[category].bg }]}>
            <Text style={[styles.categoryChipText, { color: CATEGORY_STYLE[category].text }]}>
              {category}
            </Text>
          </View>
        )}
      </View>

      {post.title.trim().length > 0 && <Text style={styles.title}>{post.title}</Text>}
      {post.content.trim().length > 0 && <CaptionText text={post.content} />}

      {/* Multi-photo/video carousel (announcement_media). Takes precedence
          over the legacy single `file_url`, which older posts still use. */}
      {carousel.length > 0 && <PostMediaCarousel media={carousel} />}

      {carousel.length === 0 && looksLikeImage && attachment && (
        <Image
          source={{ uri: attachment }}
          style={[styles.image, { aspectRatio }]}
          resizeMode="cover"
          onLoad={(event) => {
            const { width, height } = event.nativeEvent.source ?? {};
            if (width && height) {
              setAspectRatio(
                clamp(width / height, MIN_IMAGE_ASPECT_RATIO, MAX_IMAGE_ASPECT_RATIO),
              );
            }
          }}
        />
      )}

      {carousel.length === 0 && !looksLikeImage && attachment && (
        <TouchableOpacity style={styles.attachmentRow} onPress={() => void Linking.openURL(attachment)}>
          <Ionicons name="document-attach-outline" size={16} color="#2F6FE0" />
          <Text style={styles.attachmentText} numberOfLines={1}>
            {post.file_name ?? "Open attachment"}
          </Text>
        </TouchableOpacity>
      )}

      {linkUrl && (
        <TouchableOpacity style={styles.linkRow} onPress={openLink}>
          <Ionicons name="link-outline" size={16} color="#2F6FE0" />
          <Text style={styles.linkText} numberOfLines={1}>
            {linkUrl}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.actionRow}>
        {allowComments ? (
          <TouchableOpacity style={styles.actionButton} onPress={() => void toggleComments()}>
            <Ionicons
              name={commentsOpen ? "chatbubble" : "chatbubble-outline"}
              size={17}
              color="#4B5563"
            />
            <Text style={styles.actionText}>
              {comments ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "Comments"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButton}>
            <Ionicons name="lock-closed-outline" size={15} color="#9AA1AD" />
            <Text style={styles.actionTextMuted}>Comments turned off</Text>
          </View>
        )}
      </View>

      {commentsOpen && allowComments && (
        <View style={styles.commentsBlock}>
          {loadingComments ? (
            <ActivityIndicator size="small" color="#2F6FE0" style={styles.commentsSpinner} />
          ) : (
            <>
              {(comments ?? []).length === 0 && (
                <Text style={styles.noComments}>No comments yet. Be the first.</Text>
              )}
              {(comments ?? []).map((comment) => (
                <View key={comment.id} style={styles.commentRow}>
                  <Text style={styles.commentAuthor}>{comment.commenter_name ?? "Someone"}</Text>
                  <Text style={styles.commentText}>{comment.comment_text}</Text>
                  <Text style={styles.commentTime}>{formatRelativeTime(comment.created_at)}</Text>
                </View>
              ))}

              <View style={styles.composerRow}>
                <TextInput
                  style={styles.composerInput}
                  placeholder="Write a comment…"
                  placeholderTextColor="#B0B7C3"
                  value={draft}
                  onChangeText={setDraft}
                  maxLength={1000}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!draft.trim() || posting) && styles.sendButtonDisabled]}
                  onPress={() => void submitComment()}
                  disabled={!draft.trim() || posting}
                >
                  <Ionicons name="send" size={15} color="#fff" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  avatarText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  avatarOfficial: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarLogo: {
    width: 26,
    height: 26,
  },
  headerText: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
    flexShrink: 1,
  },
  pinnedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF4E5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pinnedChipText: {
    fontSize: 9.5,
    fontFamily: fonts.bold,
    color: "#B26A00",
  },
  metaLine: {
    fontSize: 11.5,
    fontFamily: fonts.medium,
    color: "#8A93A3",
    marginTop: 1,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryChipText: {
    fontSize: 9.5,
    fontFamily: fonts.bold,
    textTransform: "capitalize",
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginTop: 10,
  },
  caption: {
    fontSize: 13.5,
    fontFamily: fonts.regular,
    color: "#374151",
    lineHeight: 19,
    marginTop: 6,
  },
  hashtag: {
    color: "#2F6FE0",
    fontFamily: fonts.semibold,
  },
  image: {
    width: "100%",
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: "#F1F5F9",
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  attachmentText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
    backgroundColor: "#F7F9FC",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#2F6FE0",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  actionTextMuted: {
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: "#9AA1AD",
  },
  commentsBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  commentsSpinner: {
    paddingVertical: 8,
  },
  noComments: {
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: "#8A93A3",
    paddingBottom: 8,
  },
  commentRow: {
    marginBottom: 10,
  },
  commentAuthor: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  commentText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#374151",
    marginTop: 2,
  },
  commentTime: {
    fontSize: 10.5,
    fontFamily: fonts.medium,
    color: "#9AA1AD",
    marginTop: 2,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
    maxHeight: 90,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
