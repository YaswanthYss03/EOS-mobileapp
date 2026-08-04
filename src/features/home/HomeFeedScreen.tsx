import { useCallback, useState } from "react";
import { FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { TopBar } from "./components/TopBar";
import { HomeHeader } from "./components/HomeHeader";
import { AnnouncementsSection } from "./components/AnnouncementsSection";
import { PostCard } from "./components/PostCard";
import { mockPosts, type Post } from "./data/mockPosts";

// TODO: replace mockPosts with src/services/api/home.api.ts once the media-team backend is ready
export function HomeFeedScreen() {
  const navigation = useNavigation();
  const [posts, setPosts] = useState<Post[]>(mockPosts);

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for HomeHeader (adds notification/wallet icons)
  // only while Home is focused - same pattern as the ERP employee
  // dashboard's header override.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ header: () => <HomeHeader /> });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  function handleAddComment(postId: string, text: string) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, { id: `local-${Date.now()}`, author: "You", text }] }
          : post,
      ),
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} onAddComment={handleAddComment} />}
        ListHeaderComponent={
          <>
            <TopBar />
            <AnnouncementsSection />
          </>
        }
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
    paddingBottom: 8,
  },
});
