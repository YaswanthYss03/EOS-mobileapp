import { useState } from "react";
import { View, Text, Image, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import type { Post } from "../data/mockPosts";

const logoSource = require("../../../../assets/logo.png");

type Props = {
  post: Post;
  onAddComment: (postId: string, text: string) => void;
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

// Every post is from the college's own account (media team/admin only - see
// the rest of this app's "no personal usernames" convention), so the author
// header is fixed rather than per-post data.
export function PostCard({ post, onAddComment }: Props) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const commentCount = post.comments.length;

  function handleSendComment() {
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText.trim());
    setCommentText("");
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
          <Text style={styles.handle}>@srieshwarncbe · {post.postedAt}</Text>
        </View>
        <TouchableOpacity hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#9AA6B2" />
        </TouchableOpacity>
      </View>

      <DescriptionText text={post.description} />

      <View style={styles.imageWrap}>
        <Image source={{ uri: post.images[0] }} style={styles.postImage} />
        {post.images.length > 1 && (
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>1/{post.images.length}</Text>
          </View>
        )}
      </View>

      {commentCount > 0 && (
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setCommentsExpanded((prev) => !prev)}
          hitSlop={8}
        >
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
          {post.comments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{initialsFromName(comment.author)}</Text>
              </View>
              <View style={styles.commentTextWrap}>
                <Text style={styles.commentAuthor}>{comment.author}</Text>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            </View>
          ))}
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
        />
        <TouchableOpacity
          style={[styles.sendButton, !commentText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendComment}
          disabled={!commentText.trim()}
        >
          <Ionicons name="send" size={15} color="#fff" />
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
  description: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#1F2937",
    lineHeight: 19,
    paddingTop: 10,
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
    width: "100%",
    aspectRatio: 1.5,
    backgroundColor: "#eee",
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
  commentAuthor: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
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
