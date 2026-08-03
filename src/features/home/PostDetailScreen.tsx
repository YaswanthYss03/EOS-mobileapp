import { useState } from "react";
import { View, Text, FlatList, TextInput, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { mockPosts, type Comment } from "./data/mockPosts";

// TODO: look up the post from src/services/api/home.api.ts instead of the shared mockPosts array
export function PostDetailScreen({ postId }: { postId: string }) {
  const router = useRouter();
  const post = mockPosts.find((p) => p.id === postId);
  const [comments, setComments] = useState<Comment[]>(post?.comments ?? []);
  const [text, setText] = useState("");

  if (!post) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Text style={styles.notFound}>Post not found</Text>
      </SafeAreaView>
    );
  }

  function handleSend() {
    if (!text.trim()) return;
    setComments((prev) => [...prev, { id: `local-${Date.now()}`, author: "You", text: text.trim() }]);
    setText("");
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.postPreview}>
        <Text style={styles.description}>{post.description}</Text>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <Text style={styles.commentAuthor}>{item.author}</Text>
            <Text style={styles.commentText}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No comments yet. Be the first!</Text>}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
        />
        <Pressable onPress={handleSend} disabled={!text.trim()} hitSlop={8}>
          <Text style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}>Post</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  notFound: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  postPreview: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 8,
  },
  commentAuthor: {
    fontWeight: "600",
    fontSize: 13,
  },
  commentText: {
    fontSize: 13,
    flex: 1,
  },
  empty: {
    color: "#999",
    textAlign: "center",
    paddingVertical: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
  },
  sendButton: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E3A8A",
  },
  sendButtonDisabled: {
    color: "#aaa",
  },
});
