import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts } from "@/theme";
import { QuickAccessGrid } from "../components/QuickAccessGrid";
import { quickAccessItems, campusItems } from "./data/mockDashboard";

export function StudentDashboard() {
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <QuickAccessGrid items={quickAccessItems} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campus</Text>
          <QuickAccessGrid items={campusItems} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
});
