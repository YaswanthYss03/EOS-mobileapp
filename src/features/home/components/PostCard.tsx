import { useState } from "react";
import { View, Text, Image, Pressable, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Post } from "../data/mockPosts";

type Props = {
  post: Post;
  onOpenComments: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
};

export function PostCard({ post, onOpenComments, onAddComment }: Props) {
  const [commentText, setCommentText] = useState("");

  function handleSendComment() {
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText.trim());
    setCommentText("");
  }

  return (
    <View style={styles.card}>
      <Image source={{ uri: post.imageUrl }} style={styles.postImage} />

      <View style={styles.metaRow}>
        <Pressable style={styles.commentAction} onPress={() => onOpenComments(post.id)} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={22} color="#111" />
          <Text style={styles.commentCount}>{post.comments.length}</Text>
        </Pressable>
        <Text style={styles.postedAt}>{post.postedAt}</Text>
      </View>

      <Text style={styles.description}>{post.description}</Text>

      {post.comments.length > 0 && (
        <Pressable onPress={() => onOpenComments(post.id)}>
          <Text style={styles.viewComments}>
            View {post.comments.length > 1 ? `all ${post.comments.length} comments` : "1 comment"}
          </Text>
        </Pressable>
      )}

      <View style={styles.commentRow}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          onSubmitEditing={handleSendComment}
        />
        <Pressable onPress={handleSendComment} disabled={!commentText.trim()} hitSlop={8}>
          <Text style={[styles.postButton, !commentText.trim() && styles.postButtonDisabled]}>Post</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginBottom: 12,
    paddingBottom: 10,
  },
  postImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#eee",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commentCount: {
    fontSize: 13,
    color: "#111",
  },
  postedAt: {
    fontSize: 11,
    color: "#999",
  },
  description: {
    fontSize: 13,
    paddingHorizontal: 12,
    paddingTop: 8,
    lineHeight: 18,
  },
  viewComments: {
    fontSize: 13,
    color: "#666",
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  commentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
  },
  postButton: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E3A8A",
  },
  postButtonDisabled: {
    color: "#aaa",
  },
});
