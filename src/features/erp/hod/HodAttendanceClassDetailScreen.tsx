import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getDepartmentClassAttendance, type HodClassAttendanceDetail } from "@/services/api/hod-attendance.api";

type LoadStatus = "loading" | "success" | "error";

function attendanceTone(pct: number | null): { text: string; bg: string } {
  if (pct == null) return { text: "#9AA6B2", bg: "#F1F3F6" };
  if (pct >= 85) return { text: "#16A34A", bg: "#F0FDF4" };
  if (pct >= 75) return { text: "#D97706", bg: "#FEF3C7" };
  return { text: "#DC2626", bg: "#FEF2F2" };
}

// Per-student attendance breakdown for one class - reached by tapping a row
// on HodAttendanceScreen. Reuses the same GET /hod/class-records/:classId
// data every "Subject Records" screen would (attendance_percent per
// student is already part of that response), just renders only the
// attendance-relevant fields.
export function HodAttendanceClassDetailScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [detail, setDetail] = useState<HodClassAttendanceDetail | null>(null);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const load = useCallback(() => {
    if (!classId) return;
    setStatus("loading");
    getDepartmentClassAttendance(Number(classId))
      .then((data) => {
        setDetail(data);
        setStatus("success");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't load this class's attendance."));
        setStatus("error");
      });
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BackHeader title={detail ? `${detail.class.year ?? "—"} Year - ${detail.class.section}` : "Attendance"} onBack={() => router.back()} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        {status === "loading" ? (
          <SkeletonListRows count={6} />
        ) : status === "error" ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Couldn't load this class's attendance.</Text>
            <TouchableOpacity onPress={load} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : detail ? (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Class mean attendance</Text>
              <Text style={styles.summaryValue}>
                {detail.stats?.mean_attendance != null ? `${detail.stats.mean_attendance}%` : "—"}
              </Text>
              <Text style={styles.summarySubtitle}>{detail.class.student_count} students</Text>
            </View>

            {detail.students.length === 0 ? (
              <View style={styles.centerState}>
                <Ionicons name="people-outline" size={28} color="#B0B7C3" />
                <Text style={styles.centerStateText}>No students in this class yet.</Text>
              </View>
            ) : (
              detail.students.map((s) => {
                const tone = attendanceTone(s.attendance_percent);
                return (
                  <View key={s.student_id} style={styles.row}>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowTitle}>{s.name}</Text>
                      <Text style={styles.rowSubtitle}>{s.student_id_no}</Text>
                    </View>
                    <View style={[styles.pctBadge, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.pctBadgeText, { color: tone.text }]}>
                        {s.attendance_percent != null ? `${s.attendance_percent}%` : "—"}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: "#EAF0FD",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 12, fontFamily: fonts.semibold, color: "#2F6FE0" },
  summaryValue: { fontSize: 32, fontFamily: fonts.bold, color: "#111827", marginTop: 4 },
  summarySubtitle: { fontSize: 12, fontFamily: fonts.regular, color: "#6B7280", marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  rowSubtitle: { fontSize: 12, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
  pctBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pctBadgeText: { fontSize: 13, fontFamily: fonts.bold },
  centerState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center" },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
});
