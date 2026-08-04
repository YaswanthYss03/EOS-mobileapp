import { View, Text, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { fonts } from "@/theme";
import { mockDrives, type Drive } from "../data/mockDrives";

// TODO: view-only - replace mockDrives with a real call once the placement backend endpoint exists
export function PlacementDrivesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Upcoming Drives" />
      <FlatList
        data={mockDrives}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <DriveCard drive={item} />}
      />
    </SafeAreaView>
  );
}

function DriveCard({ drive }: { drive: Drive }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.company}>{drive.company}</Text>
        <Text style={styles.package}>{drive.package}</Text>
      </View>
      <Text style={styles.role}>{drive.role}</Text>

      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={14} color="#666" />
        <Text style={styles.rowText}>{drive.driveDate}</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="checkmark-circle-outline" size={14} color="#666" />
        <Text style={styles.rowText}>{drive.eligibility}</Text>
      </View>
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
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  company: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  package: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#DC2626",
  },
  role: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#444",
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#666",
  },
});
