import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { formatRelativeTime } from "@/utils/calendar";
import { getAnnouncements, type Announcement } from "@/services/api/announcements.api";

type LoadStatus = "loading" | "success" | "error";
const NEW_BADGE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days, matches AnnouncementsSection

function isRecent(isoTimestamp: string): boolean {
  return Date.now() - new Date(isoTimestamp).getTime() < NEW_BADGE_WINDOW_MS;
}

// "View All" destination from the Home tab's Announcements carousel - the
// full, unpaginated list of every announcement visible to this caller (see
// AnnouncementsSection's own doc comment on why no pagination is needed).
export function AnnouncementsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setStatus("loading");
    setError(null);

    getAnnouncements()
      .then((all) => {
        setAnnouncements(all);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load announcements."));
        setStatus("error");
      })
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleOpenAttachment(announcement: Announcement) {
    if (!announcement.file_url) return;
    Linking.openURL(announcement.file_url).catch(() => toast.error("Couldn't open that attachment"));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
      </LinearGradient>

      {status === "error" ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2F6FE0" />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AnnouncementListItem announcement={item} onOpenAttachment={() => handleOpenAttachment(item)} />
          )}
          ListEmptyComponent={
            status === "loading" ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            ) : (
              <View style={styles.centerState}>
                <Ionicons name="megaphone-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No announcements yet</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const TARGET_AUDIENCE_LABEL: Record<Announcement["target_audience"], string> = {
  students: "Students",
  teachers: "Faculty",
  parents: "Parents",
  roles: "Selected roles",
};

function AnnouncementListItem({
  announcement,
  onOpenAttachment,
}: {
  announcement: Announcement;
  onOpenAttachment: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        {isRecent(announcement.created_at) && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
        )}
        <Text style={styles.audiencePill}>{TARGET_AUDIENCE_LABEL[announcement.target_audience]}</Text>
      </View>

      <Text style={styles.cardTitle}>{announcement.title}</Text>
      <Text style={styles.cardContent}>{announcement.content}</Text>
      <Text style={styles.cardMeta}>{formatRelativeTime(announcement.created_at)}</Text>

      {announcement.file_url && (
        <TouchableOpacity style={styles.attachmentRow} onPress={onOpenAttachment} activeOpacity={0.8}>
          <Ionicons name="attach-outline" size={16} color="#2F6FE0" />
          <Text style={styles.attachmentText} numberOfLines={1}>
            {announcement.file_name ?? "View attachment"}
          </Text>
          <Ionicons name="open-outline" size={14} color="#2F6FE0" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
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
  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "#1A3D8F",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#fff",
    letterSpacing: 0.5,
  },
  audiencePill: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  cardContent: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#4B5563",
    marginTop: 6,
    lineHeight: 19,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 10,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  attachmentText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
});
