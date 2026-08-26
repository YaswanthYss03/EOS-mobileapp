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
import { AnnouncementPostCard } from "./components/AnnouncementPostCard";
import { getAchievements, type AchievementListItem } from "@/services/api/achievements.api";
import { getAnnouncements, type Announcement } from "@/services/api/announcements.api";

type LoadStatus = "loading" | "success" | "error";

/**
 * The feed carries two real sources, both server-scoped to the caller:
 *  - achievements   (Media Room photo/video posts)
 *  - announcements  (Media Room social publishing, incl. scheduled posts that
 *                    the backend cron flipped live)
 *
 * They live in different tables with different shapes, so they are tagged here
 * and rendered by their own card rather than being flattened into a lowest
 * common denominator that would drop each one's real detail.
 */
type FeedItem =
  | { kind: "achievement"; at: string; achievement: AchievementListItem }
  | { kind: "announcement"; at: string; announcement: Announcement };

/**
 * Newest first, with pinned social posts held at the top.
 *
 * Sorting by created_at (not scheduled_at) on purpose: a post that went out at
 * 10:00 should sit where 10:00 is in the feed regardless of when it was
 * composed, and the backend sets created_at when the row is written and
 * scheduled_at is only the intended release time.
 */
function buildFeed(achievements: AchievementListItem[], announcements: Announcement[]): FeedItem[] {
  const items: FeedItem[] = [
    ...achievements.map((achievement) => ({
      kind: "achievement" as const,
      at: achievement.created_at,
      achievement,
    })),
    ...announcements.map((announcement) => ({
      kind: "announcement" as const,
      at: announcement.created_at,
      announcement,
    })),
  ];

  return items.sort((a, b) => {
    const aPinned = a.kind === "announcement" && a.announcement.social?.is_pinned === true;
    const bPinned = b.kind === "announcement" && b.announcement.social?.is_pinned === true;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });
}

function feedKey(item: FeedItem): string {
  return item.kind === "achievement"
    ? `a${item.achievement.id}`
    : `n${item.announcement.id}`;
}

// Achievement posts (photo/video + caption) from the Media Room - see
// EOSbackend1's src/modules/achievements module. Comment posting/loading
// is handled per-card inside PostCard itself; this screen only owns the
// feed list.
export function HomeFeedScreen() {
  const navigation = useNavigation();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setStatus("loading");
    setError(null);

    // allSettled, not all: one source failing must not blank the whole feed.
    // Both endpoints are already scoped server-side to what this caller may
    // see (AchievementsService / AnnouncementsService.buildVisibilityQuery),
    // so there is no client-side filtering to get wrong here.
    Promise.allSettled([getAchievements(), getAnnouncements()])
      .then(([achievementsResult, announcementsResult]) => {
        const achievements =
          achievementsResult.status === "fulfilled" ? achievementsResult.value.data : [];
        const announcements =
          announcementsResult.status === "fulfilled" ? announcementsResult.value : [];

        if (achievementsResult.status === "rejected" && announcementsResult.status === "rejected") {
          setError(getApiErrorMessage(achievementsResult.reason, "Couldn't load the feed."));
          setStatus("error");
          return;
        }

        // Only social posts belong in the feed. A plain notice (faculty /
        // HoD / principal announcement) stays in the Announcements carousel
        // above - showing it in both places would list the same item twice on
        // one screen. The two are told apart by `social`, which the backend
        // only attaches to posts published through the Media Room's social
        // publishing screen.
        const socialPosts = announcements.filter((a) => a.social != null);
        setPosts(buildFeed(achievements, socialPosts));
        setStatus("success");
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
          keyExtractor={feedKey}
          renderItem={({ item }) =>
            item.kind === "achievement" ? (
              <PostCard post={item.achievement} />
            ) : (
              <AnnouncementPostCard post={item.announcement} />
            )
          }
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
                <Text style={styles.emptyStateText}>Nothing posted yet</Text>
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
