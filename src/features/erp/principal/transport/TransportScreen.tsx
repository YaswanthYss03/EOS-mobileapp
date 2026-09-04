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
  getPrincipalTransportOverview,
  type PrincipalTransportOverview,
  type PrincipalTransportRoute,
  type PrincipalTransportBus,
} from "@/services/api/principal-transport.api";

type RouteBusPair = { route: PrincipalTransportRoute; bus: PrincipalTransportBus | null };

export function TransportScreen() {
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

  const [overview, setOverview] = useState<PrincipalTransportOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPrincipalTransportOverview()
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load the transport overview.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // One row per bus - a route's student_count reflects everyone mapped to
  // that route (there's no per-bus student assignment in the schema, only
  // per-route), so a route with multiple buses repeats the same count on
  // each of its rows rather than guessing a split.
  const rows: RouteBusPair[] =
    overview?.routes.flatMap((route): RouteBusPair[] =>
      route.buses.length > 0 ? route.buses.map((bus) => ({ route, bus })) : [{ route, bus: null }],
    ) ?? [];

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
          <Text style={styles.title}>Transport</Text>
          <Text style={styles.subtitle}>
            {overview
              ? `${overview.routes_count} routes · ${overview.students_on_transport.toLocaleString()} students · ${overview.total_buses} buses in service`
              : "Loading…"}
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

        {!loading && !error && overview && (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                label="Students on transport"
                value={overview.students_on_transport.toLocaleString()}
                subtitle={`across ${overview.routes_count} routes`}
              />
              <StatCard
                label="Active buses"
                value={overview.total_buses.toLocaleString()}
                subtitle={`${overview.buses_assigned} assigned to routes`}
              />
            </View>

            {rows.length === 0 && (
              <View style={styles.centerState}>
                <Text style={styles.centerStateText}>No transport routes found.</Text>
              </View>
            )}

            {rows.map(({ route, bus }, index) => (
              <RouteBusRow key={`${route.id}-${bus?.bus_no ?? index}`} route={route} bus={bus} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );
}

function RouteBusRow({ route, bus }: RouteBusPair) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconWrap}>
        <Ionicons name="bus-outline" size={18} color="#2F6FE0" />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.routeName} numberOfLines={1}>
          {route.name}
        </Text>
        <Text style={styles.busText}>{bus ? bus.vehicle_number : "No bus assigned"}</Text>
      </View>
      <View style={styles.rowStudents}>
        <Text style={styles.rowStudentsValue}>{route.student_count.toLocaleString()}</Text>
        <Text style={styles.rowStudentsLabel}>students</Text>
      </View>
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
  content: { padding: 16, paddingBottom: 40 },
  inlineLoading: { paddingVertical: 40, alignItems: "center" },
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 11, fontFamily: fonts.medium, color: "#8A93A3" },
  statValue: { fontSize: 24, fontFamily: fonts.bold, color: "#111827" },
  statSubtitle: { fontSize: 10, fontFamily: fonts.regular, color: "#9AA6B2" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 10,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: { flex: 1 },
  routeName: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  busText: { fontSize: 12, fontFamily: fonts.regular, color: "#8A93A3", marginTop: 1 },
  rowStudents: { alignItems: "flex-end" },
  rowStudentsValue: { fontSize: 16, fontFamily: fonts.bold, color: "#111827" },
  rowStudentsLabel: { fontSize: 10, fontFamily: fonts.medium, color: "#9AA6B2" },
});
