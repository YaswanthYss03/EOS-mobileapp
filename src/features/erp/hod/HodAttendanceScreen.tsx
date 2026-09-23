import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getDepartmentAttendanceOverview, type HodAttendanceClassSummary } from "@/services/api/hod-attendance.api";

type LoadStatus = "loading" | "success" | "error";

function attendanceTone(pct: number | null): { text: string; bg: string } {
  if (pct == null) return { text: "#9AA6B2", bg: "#F1F3F6" };
  if (pct >= 85) return { text: "#16A34A", bg: "#F0FDF4" };
  if (pct >= 75) return { text: "#D97706", bg: "#FEF3C7" };
  return { text: "#DC2626", bg: "#FEF2F2" };
}

// Reached from the HOD's own Student-tab "Attendance" card
// (HodStudentScreen.tsx). Every class in the HOD's own department, one row
// each, with a real mean attendance % - tapping a row drills into that
// class's per-student breakdown (HodAttendanceClassDetailScreen).
export function HodAttendanceScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [classes, setClasses] = useState<HodAttendanceClassSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const load = useCallback(() => {
    setStatus("loading");
    getDepartmentAttendanceOverview()
      .then((rows) => {
        setClasses(rows);
        setStatus("success");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't load attendance overview."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BackHeader title="Attendance" onBack={() => router.back()} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        {status === "loading" ? (
          <SkeletonListRows count={5} />
        ) : status === "error" ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Couldn't load attendance overview.</Text>
            <TouchableOpacity onPress={load} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.centerState}>
            <Ionicons name="school-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>No classes in your department yet.</Text>
          </View>
        ) : (
          classes.map((cls) => {
            const tone = attendanceTone(cls.mean_attendance);
            return (
              <TouchableOpacity
                key={cls.class_id}
                style={styles.row}
                activeOpacity={0.8}
                onPress={() => router.push(`/(tabs)/erp/hod-attendance/${cls.class_id}` as never)}
              >
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>
                    {cls.year} Year - {cls.section}
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    Semester {cls.semester} · {cls.student_count} {cls.student_count === 1 ? "student" : "students"}
                  </Text>
                </View>
                <View style={[styles.pctBadge, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.pctBadgeText, { color: tone.text }]}>
                    {cls.mean_attendance != null ? `${cls.mean_attendance}%` : "—"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
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
