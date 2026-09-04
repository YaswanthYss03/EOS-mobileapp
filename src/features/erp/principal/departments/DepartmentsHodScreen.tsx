import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getPrincipalDepartmentsOverview,
  type PrincipalDepartmentRow,
  type PrincipalDepartmentsOverview,
} from "@/services/api/principal-departments.api";

export function DepartmentsHodScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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

  const [overview, setOverview] = useState<PrincipalDepartmentsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPrincipalDepartmentsOverview()
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load departments overview.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Departments & HoDs</Text>
          <Text style={styles.subtitle}>
            {overview ? `${overview.total_departments} departments` : "Loading…"} · compare strength, delivery and
            outcomes
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {!loading && error && (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </Pressable>
          </View>
        )}

        {!loading &&
          !error &&
          overview &&
          overview.departments.map((dept) => <DepartmentCard key={dept.id} dept={dept} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function DepartmentCard({ dept }: { dept: PrincipalDepartmentRow }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{dept.code}</Text>
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {dept.name}
          </Text>
          <Text style={styles.cardSubtitle}>{dept.hod_name ? `${dept.hod_name} · HoD` : "No HoD assigned"}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Students" value={dept.students.toLocaleString()} />
        <Stat label="Faculty" value={dept.faculty.toLocaleString()} />
      </View>
      <View style={styles.statsRow}>
        <Stat label="Attendance" value={dept.attendance_pct !== null ? `${dept.attendance_pct}%` : "—"} />
        <Stat
          label="Placement"
          value={dept.placement_pct !== null ? `${dept.placement_pct}%` : "—"}
          tone={dept.placement_pct !== null ? "green" : undefined}
        />
      </View>
    </View>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone === "green" ? { color: "#3FA66B" } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  subtitle: { fontSize: 11, fontFamily: fonts.regular, color: "#D7E2FA", marginTop: 2 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  inlineLoading: { paddingVertical: 40, alignItems: "center" },
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    gap: 14,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0" },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  cardSubtitle: { fontSize: 11, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
  statsRow: { flexDirection: "row" },
  stat: { flex: 1, gap: 2 },
  statLabel: { fontSize: 11, fontFamily: fonts.medium, color: "#8A93A3" },
  statValue: { fontSize: 17, fontFamily: fonts.bold, color: "#111827" },
});
