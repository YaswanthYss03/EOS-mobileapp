import { useState } from "react";
import { FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TopBar } from "./components/TopBar";
import { PostCard } from "./components/PostCard";
import { mockPosts, type Post } from "./data/mockPosts";

// TODO: replace mockPosts with src/services/api/home.api.ts once the media-team backend is ready
export function HomeFeedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(mockPosts);

  function handleAddComment(postId: string, text: string) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, { id: `local-${Date.now()}`, author: "You", text }] }
          : post,
      ),
    );
  }

  function handleOpenComments(postId: string) {
    router.push(`/(tabs)/home/${postId}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <TopBar />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onOpenComments={handleOpenComments} onAddComment={handleAddComment} />
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    paddingVertical: 8,
  },
});
