import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { listAlumniBatches, type AlumniBatchSummary } from "@/services/api/alumni.api";

type LoadStatus = "loading" | "success" | "error";

const AVATAR_COLORS = ["#2F6FE0", "#7E22CE", "#16A34A", "#D97706", "#DC2626", "#0891B2"];

function avatarColorFor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days < 30) return days === 1 ? "yesterday" : `${days} days ago`;
  if (months < 12) return months === 1 ? "a month ago" : `${months} months ago`;
  return years === 1 ? "a year ago" : `${years} years ago`;
}

// Principal-only - every graduated batch's alumni group, WhatsApp-style.
// Each row's preview line is real (never fabricated): the most recently
// joined member for that group - see EOS-backend's
// AdminAlumniBatchesService.listBatches. Reached from the Amenity page's
// "Alumni" tile - see AmenityHomeScreen.tsx.
export function AlumniScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // This screen renders its own header below, so hide the shared
  // CollegeHeader (logo/college name) while it's focused.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const [groups, setGroups] = useState<AlumniBatchSummary[] | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    listAlumniBatches()
      .then((rows) => {
        setGroups(rows);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load alumni groups."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openGroup(group: AlumniBatchSummary) {
    router.push({
      pathname: "/(tabs)/amenity/alumni-group/[alumniBatchId]",
      params: {
        alumniBatchId: String(group.id),
        groupName: group.batch_label,
        memberCount: String(group.member_count),
      },
    } as never);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Alumni</Text>
          <Text style={styles.subtitle}>Sri Eshwar College of Engineering Alumni Association</Text>
        </View>
      </View>

      {status === "loading" && (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      )}

      {status === "error" && (
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
          <Text style={styles.centerStateText}>{error}</Text>
          <TouchableOpacity onPress={load} activeOpacity={0.8}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && groups && groups.length === 0 && (
        <View style={styles.centerState}>
          <Ionicons name="people-outline" size={32} color="#B0B7C3" />
          <Text style={styles.centerStateText}>No batches have graduated into the alumni network yet.</Text>
        </View>
      )}

      {status === "success" && groups && groups.length > 0 && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.row}
              onPress={() => openGroup(group)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: avatarColorFor(group.id) }]}>
                <Ionicons name="people" size={20} color="#fff" />
              </View>
              <View style={styles.rowTextWrap}>
                <View style={styles.rowTitleRow}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {group.batch_label}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>SECEAA</Text>
                  </View>
                </View>
                <Text style={styles.previewText} numberOfLines={1}>
                  {group.latest_activity?.text ?? "No activity yet"}
                </Text>
              </View>
              {group.latest_activity && (
                <Text style={styles.timeText}>{relativeTime(group.latest_activity.at)}</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: "#2F6FE0",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#D7E2FA",
    marginTop: 2,
  },
  inlineLoading: {
    paddingVertical: 60,
    alignItems: "center",
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
    paddingHorizontal: 24,
  },
  centerStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  groupName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    flexShrink: 1,
  },
  badge: {
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  previewText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
  timeText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#B0B7C3",
  },
});
