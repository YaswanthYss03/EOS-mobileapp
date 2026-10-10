import { useState } from "react";
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NoticeFileRow, isNoticeImage } from "./NoticeAttachment";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { formatRelativeTime } from "@/utils/calendar";
import { PostMediaCarousel } from "./PostMediaCarousel";
import { type Announcement } from "@/services/api/announcements.api";

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
export function AnnouncementPostCard({
  post,
  commentCount,
  onOpenComments,
}: {
  post: Announcement;
  commentCount: number | null;
  onOpenComments: () => void;
}) {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_IMAGE_ASPECT_RATIO);

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
  // By file name first (signed/extensionless URLs), then the URL itself.
  const looksLikeImage = isNoticeImage(post.file_name, attachment);

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

      {/* Image first, caption after - matches how a Media Room social post
          reads (Multi-photo/video carousel takes precedence over the legacy
          single `file_url`, which older posts still use). */}
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

      {post.title.trim().length > 0 && <Text style={styles.title}>{post.title}</Text>}
      {post.content.trim().length > 0 && <CaptionText text={post.content} />}

      {/* A PDF/document attachment comes after the text, as a download. */}
      {carousel.length === 0 && !looksLikeImage && attachment && (
        <NoticeFileRow url={attachment} fileName={post.file_name} />
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
          <TouchableOpacity style={styles.actionButton} onPress={onOpenComments}>
            <Ionicons name="chatbubble-outline" size={17} color="#4B5563" />
            <Text style={styles.actionText}>
              {commentCount !== null ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}` : "Comments"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButton}>
            <Ionicons name="lock-closed-outline" size={15} color="#9AA1AD" />
            <Text style={styles.actionTextMuted}>Comments turned off</Text>
          </View>
        )}
      </View>
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
});
