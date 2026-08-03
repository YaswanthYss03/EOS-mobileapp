import { View, Text, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { mockHistory, type PlacementRecord, type Round, type RoundStatus } from "../data/mockHistory";

const statusStyle: Record<RoundStatus, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  cleared: { icon: "checkmark-circle", color: "#1E8A5A" },
  rejected: { icon: "close-circle", color: "#DC2626" },
  pending: { icon: "ellipse-outline", color: "#bbb" },
};

// TODO: view-only - replace mockHistory with a real call once the placement backend endpoint exists
export function PlacementHistoryScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Placement History" />
      <FlatList
        data={mockHistory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <HistoryCard record={item} />}
        ListEmptyComponent={<Text style={styles.empty}>You haven't applied to any drives yet.</Text>}
      />
    </SafeAreaView>
  );
}

function HistoryCard({ record }: { record: PlacementRecord }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.company}>{record.company}</Text>
        <Text style={styles.appliedOn}>Applied {record.appliedOn}</Text>
      </View>
      <Text style={styles.role}>{record.role}</Text>

      <View style={styles.stepper}>
        {record.rounds.map((round, i) => (
          <View key={round.name} style={styles.step}>
            <RoundStep round={round} />
            {i < record.rounds.length - 1 && <View style={styles.connector} />}
          </View>
        ))}
      </View>
    </View>
  );
}

function RoundStep({ round }: { round: Round }) {
  const { icon, color } = statusStyle[round.status];
  return (
    <View style={styles.roundStep}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.roundLabel, { color }]} numberOfLines={2}>
        {round.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 14,
    marginBottom: 12,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  company: {
    fontSize: 16,
    fontWeight: "700",
  },
  appliedOn: {
    fontSize: 11,
    color: "#999",
  },
  role: {
    fontSize: 13,
    color: "#444",
    marginBottom: 10,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  roundStep: {
    alignItems: "center",
    width: 70,
    gap: 4,
  },
  roundLabel: {
    fontSize: 10,
    textAlign: "center",
  },
  connector: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
    marginTop: 9,
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },
});
