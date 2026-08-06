import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import {
  getStudentPlacementHistory,
  type DriveHistoryItem,
} from "@/services/api/faculty-placements.api";
import type { ApplicationStatus } from "@/services/api/placements.api";

// Same status labels/colors as the student's own Placements screen (see
// @/features/academics/placements/PlacementsOverviewScreen.tsx) - "Round N
// cleared" comes straight from drive_application_status_enum, the schema's
// own ceiling on how much detail a status can show.
const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; bg: string; text: string }> = {
  applied: { label: "Applied", bg: "#EAF0FD", text: "#2F6FE0" },
  r1_cleared: { label: "Round 1 cleared", bg: "#FEF3C7", text: "#D97706" },
  r2_cleared: { label: "Round 2 cleared", bg: "#FEF3C7", text: "#D97706" },
  r3_cleared: { label: "Round 3 cleared", bg: "#FEF3C7", text: "#D97706" },
  placed: { label: "Offer", bg: "#F0FDF4", text: "#16A34A" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" },
};

function historyStatusLabel(item: DriveHistoryItem): string {
  const base = APPLICATION_STATUS_META[item.application_status].label;
  if (item.application_status === "rejected" && item.last_cleared_round) {
    return `Round ${item.last_cleared_round} cleared · ${base}`;
  }
  return base;
}

function StudentHeader({ onBack, name, studentIdNo }: { onBack: () => void; name: string; studentIdNo: string }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text style={styles.headerTitle}>{name}</Text>
        <Text style={styles.headerSubtitle}>{studentIdNo} · Placement history</Text>
      </View>
    </LinearGradient>
  );
}

// Drill-down from FacultyPlacementsScreen's History tab - a single mentee's
// own placement history, authorized server-side via class_mentors (see
// @/services/api/faculty-placements.api.ts's getStudentPlacementHistory).
export function StudentPlacementHistoryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ studentId: string; name?: string; studentIdNo?: string }>();
  const studentId = Number(params.studentId);
  const name = params.name ?? "Student";
  const studentIdNo = params.studentIdNo ?? "";

  const [history, setHistory] = useState<DriveHistoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <StudentHeader onBack={() => router.back()} name={name} studentIdNo={studentIdNo} />,
      });
    }, [navigation, router, name, studentIdNo]),
  );

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    setLoading(true);
    setErrored(false);

    getStudentPlacementHistory(studentId)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        if (!cancelled) setErrored(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studentId, reloadToken]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color="#2F6FE0" />
            <Text style={styles.centerStateText}>Loading...</Text>
          </View>
        ) : errored ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Couldn't load this student's placement history.</Text>
            <TouchableOpacity onPress={() => setReloadToken((n) => n + 1)} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : history && history.length > 0 ? (
          history.map((item) => <HistoryCard key={item.drive_id} item={item} />)
        ) : (
          <View style={styles.centerState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.centerStateText}>No placement history yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryCard({ item }: { item: DriveHistoryItem }) {
  const meta = APPLICATION_STATUS_META[item.application_status];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.company}>{item.company_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{historyStatusLabel(item)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(item.scheduled_date))}</Text>
      </View>
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
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  company: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
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
});
