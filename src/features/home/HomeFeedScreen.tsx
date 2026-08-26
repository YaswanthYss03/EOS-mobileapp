import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { TopBar } from "./components/TopBar";
import { HomeHeader } from "./components/HomeHeader";
import { AnnouncementsSection } from "./components/AnnouncementsSection";
import { PostCard } from "./components/PostCard";
import { getAchievements, type AchievementListItem } from "@/services/api/achievements.api";

type LoadStatus = "loading" | "success" | "error";

// Achievement posts (photo/video + caption) from the Media Room - see
// EOSbackend1's src/modules/achievements module. Comment posting/loading
// is handled per-card inside PostCard itself; this screen only owns the
// feed list.
export function HomeFeedScreen() {
  const navigation = useNavigation();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<AchievementListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setStatus("loading");
    setError(null);

    getAchievements()
      .then((response) => {
        setPosts(response.data);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load the feed."));
        setStatus("error");
      })
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {status === "error" ? (
        <View style={styles.centerFill}>
          <TopBar />
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{error}</Text>
            <TouchableOpacity onPress={() => load()} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PostCard post={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2F6FE0" />}
          ListHeaderComponent={
            <>
              <TopBar />
              <AnnouncementsSection />
            </>
          }
          ListEmptyComponent={
            status === "loading" ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            ) : (
              <View style={styles.centerState}>
                <Ionicons name="images-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No achievements posted yet</Text>
              </View>
            )
          }
          contentContainerStyle={styles.list}
        />
      )}
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
  centerFill: {
    flex: 1,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
});
