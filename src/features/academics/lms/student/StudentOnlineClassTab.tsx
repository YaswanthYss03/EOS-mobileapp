import { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { getTodayOnlineClasses, type OnlineClass } from "@/services/api/online-class.api";

function subjectInitials(name?: string) {
  if (!name) return "SB";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function formatTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const STATUS_META: Record<OnlineClass["status"], { label: string; bg: string; text: string }> = {
  scheduled: { label: "Scheduled", bg: "#FEF3C7", text: "#92400E" },
  live: { label: "Live now", bg: "#DCFCE7", text: "#166534" },
  completed: { label: "Completed", bg: "#EEF0F4", text: "#6B7280" },
};

// GET /online-classes/today (real LiveKit sessions, see online-class.api.ts)
// has no subject filter of its own, so this tab just filters the caller's
// own today's list down to this one subject - same data every other online-
// class view in the app already reads, no new backend endpoint needed.
// Reachable from the LMS subject screen's "Online Class" tab (see
// LmsSubjectScreen.tsx) - a student joins straight from here the same way
// they would from the Academics tab's own Online Class screen (same join
// lobby flow, see OnlineClassScreen.tsx's handleJoin).
export function StudentOnlineClassTab({ subjectId, subjectName }: { subjectId: number; subjectName?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [classes, setClasses] = useState<OnlineClass[]>([]);

  const load = useCallback(() => {
    setStatus("loading");
    getTodayOnlineClasses()
      .then((data) => {
        setClasses(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const todaysClasses = useMemo(
    () => classes.filter((c) => c.subject_id === subjectId && c.status !== "completed"),
    [classes, subjectId],
  );

  function handleJoin(oc: OnlineClass) {
    router.push({
      pathname: "/(tabs)/academics/online-class/join",
      params: {
        mode: "join",
        onlineClassId: String(oc.id),
        initials: subjectInitials(subjectName),
        teacher: oc.title ?? "",
        subject: subjectName ?? "",
        timeRange: formatTime(oc.scheduled_at) ?? "",
      },
    } as never);
  }

  if (status === "loading") {
    return <SkeletonListRows count={2} style={styles.list} />;
  }

  if (status === "error") {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.errorText}>Couldn't load today's online classes.</Text>
        <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (todaysClasses.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="videocam-outline" size={30} color="#C7CDD8" />
        <Text style={styles.emptyText}>No online class scheduled for today</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {todaysClasses.map((oc) => {
        const meta = STATUS_META[oc.status];
        return (
          <View key={oc.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}>
                <Ionicons name="videocam-outline" size={20} color="#2F6FE0" />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.title}>{oc.title ?? subjectName ?? "Online Class"}</Text>
                {oc.scheduled_at && <Text style={styles.meta}>{formatTime(oc.scheduled_at)}</Text>}
              </View>
              <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                <Text style={[styles.badgeText, { color: meta.text }]}>{meta.label}</Text>
              </View>
            </View>
            {(oc.status === "live" || oc.status === "scheduled") && (
              <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(oc)} activeOpacity={0.85}>
                <Text style={styles.joinButtonText}>{oc.status === "live" ? "Join now" : "Join"}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 48,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2F6FE0",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    marginBottom: 10,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  meta: {
    fontSize: 11.5,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  joinButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
  },
  joinButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
