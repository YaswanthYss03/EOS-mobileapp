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
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { formatRelativeTime } from "@/utils/calendar";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/services/api/notifications.api";

type LoadStatus = "loading" | "success" | "error";

// Only announcements have a dedicated list screen to deep-link into today -
// every other related_entity_type (faculty_leave, od_request, lms_task, ...)
// still just marks itself read on tap, since the role-specific detail
// screens for those (see FacultyLeaveScreen/OdRequestScreen/etc.) don't yet
// share one predictable route per role to link to safely.
function relatedScreenPath(notification: NotificationItem): string | null {
  if (notification.related_entity_type === "announcement") {
    return "/(tabs)/home/announcements";
  }
  return null;
}

function iconForType(type: string | null): keyof typeof Ionicons.glyphMap {
  if (!type) return "notifications-outline";
  if (type.startsWith("approval_request")) return "checkmark-done-outline";
  if (type.startsWith("lms_")) return "book-outline";
  if (type === "announcement_new") return "megaphone-outline";
  if (type.startsWith("attendance_")) return "alert-circle-outline";
  if (type.startsWith("fee_")) return "cash-outline";
  if (type.startsWith("wallet_")) return "wallet-outline";
  if (type.startsWith("library_")) return "library-outline";
  if (type.startsWith("placement_")) return "briefcase-outline";
  if (type.startsWith("hostel_")) return "home-outline";
  if (type.startsWith("exam_") || type === "hall_ticket_issued") return "document-text-outline";
  return "notifications-outline";
}

// "Bell icon" destination from HomeHeader - every role's own inbox (no
// role-specific variant needed, GET /notifications is already self-scoped).
export function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setStatus("loading");
    setError(null);

    getNotifications()
      .then((all) => {
        setNotifications(all);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load notifications."));
        setStatus("error");
      })
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handlePress(notification: NotificationItem) {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
      );
      markNotificationRead(notification.id).catch(() => {
        // Best-effort - a failed mark-read isn't worth an error toast; the
        // next load() will just show it as unread again.
      });
    }
    const path = relatedScreenPath(notification);
    if (path) router.push(path as never);
  }

  function handleMarkAllRead() {
    if (markingAll || notifications.every((n) => n.is_read)) return;
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    markAllNotificationsRead()
      .catch(() => {
        // Best-effort, same as above - a retry via the next load() is fine.
      })
      .finally(() => setMarkingAll(false));
  }

  const hasUnread = notifications.some((n) => !n.is_read);

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
        <Text style={styles.headerTitle}>Notifications</Text>
        {hasUnread && (
          <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAll} hitSlop={8}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
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
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2F6FE0" />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <NotificationRow notification={item} onPress={() => handlePress(item)} />
          )}
          ListEmptyComponent={
            status === "loading" ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            ) : (
              <View style={styles.centerState}>
                <Ionicons name="notifications-off-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>You're all caught up</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: NotificationItem;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {!notification.is_read && <View style={styles.unreadDot} />}
      <View style={[styles.rowIcon, notification.is_read && styles.rowIconRead]}>
        <Ionicons
          name={iconForType(notification.type)}
          size={18}
          color={notification.is_read ? "#9AA6B2" : "#2F6FE0"}
        />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, notification.is_read && styles.rowTitleRead]} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.rowMessage} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.rowMeta}>{formatRelativeTime(notification.created_at)}</Text>
      </View>
    </TouchableOpacity>
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
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  markAllText: {
    color: "#DCE7FF",
    fontSize: 12,
    fontFamily: fonts.semibold,
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
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  unreadDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconRead: {
    backgroundColor: "#F1F3F6",
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  rowTitleRead: {
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  rowMessage: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 3,
    lineHeight: 18,
  },
  rowMeta: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 6,
  },
});
