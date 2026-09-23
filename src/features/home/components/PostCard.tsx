import { useEffect, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { formatRelativeTime } from "@/utils/calendar";
import { type AchievementListItem } from "@/services/api/achievements.api";

const logoSource = require("../../../../assets/logo.png");

type Props = {
  post: AchievementListItem;
  commentCount: number;
  onOpenComments: () => void;
};

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
// rather than per-post data. Comments are handled entirely by the shared
// CommentsSheet modal (see HomeFeedScreen) now - this card just shows the
// count and opens it.
export function PostCard({ post, commentCount, onOpenComments }: Props) {
  const [imageAspectRatio, setImageAspectRatio] = useState(DEFAULT_IMAGE_ASPECT_RATIO);

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
        <TouchableOpacity style={styles.toggleRow} onPress={onOpenComments} hitSlop={8}>
          <Text style={styles.toggleText}>
            View {commentCount > 1 ? `all ${commentCount} comments` : "1 comment"}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#2F6FE0" />
        </TouchableOpacity>
      )}

      {/* Opens the shared CommentsSheet instead of an inline composer - kept
          the same look as the old always-visible input row (icon bubble +
          pill + send button) so tapping it reads exactly like starting to
          type a comment, matching the rest of the card's design. */}
      <TouchableOpacity style={styles.inputRow} onPress={onOpenComments} activeOpacity={0.8}>
        <View style={styles.inputIconWrap}>
          <Ionicons name="chatbox-outline" size={16} color="#9AA6B2" />
        </View>
        <View style={styles.input}>
          <Text style={styles.inputPlaceholder}>Write a comment...</Text>
        </View>
        <View style={styles.sendButton}>
          <Ionicons name="send" size={15} color="#fff" />
        </View>
      </TouchableOpacity>
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
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inputPlaceholder: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2F6FE0",
    alignItems: "center",
    justifyContent: "center",
  },
});
