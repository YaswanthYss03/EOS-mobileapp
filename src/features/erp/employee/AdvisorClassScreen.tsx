import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { DashboardHeader } from "../components/DashboardHeader";
import { fonts } from "@/theme";

type CardOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

// Higher Education/Entrepreneur route to this tab's OWN erp-local copies
// (erp/higher-education, erp/entrepreneur), not the Amenity tab's - that tab
// is hidden entirely while Advisor mode is active (see app/(tabs)/_layout.tsx's
// isAdvisorOnly), and crossing into a hidden tab corrupts the Tabs
// navigator's back-stack, same reasoning as every other erp-local route copy.
const CARDS: CardOption[] = [
  {
    id: "academics",
    title: "Academics",
    description: "Attendance, results, records and requests for your class",
    icon: "school-outline",
    route: "/(tabs)/erp/advisor-academics",
  },
  {
    id: "placements",
    title: "Placements",
    description: "Drives, eligibility, offers and training",
    icon: "briefcase-outline",
    route: "/(tabs)/erp/placements",
  },
  {
    id: "higher-education",
    title: "Higher Education",
    description: "Students in your class who opted for further studies",
    icon: "ribbon-outline",
    route: "/(tabs)/erp/higher-education",
  },
  {
    id: "entrepreneur",
    title: "Entrepreneur",
    description: "Students in your class who opted for entrepreneurship",
    icon: "rocket-outline",
    route: "/(tabs)/erp/entrepreneur",
  },
];

// The Class tab's root while Advisor mode is active (see AuthContext.tsx's
// AccountMode, EmployeeDashboard.tsx's branch) - a Class Advisor's bottom
// nav is Home + Class only (see app/(tabs)/_layout.tsx's isAdvisorOnly), so
// everything else they need (Placements/Higher Education/Entrepreneur, plus
// their own class's Academics) lives behind these 4 cards instead of a
// separate tab each.
export function AdvisorClassScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <DashboardHeader subtitle="Class Advisor" onBack={() => router.replace("/(tabs)/home")} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {CARDS.map((card) => (
            // navigate (not push) - see QuickAccessGrid.tsx's identical
            // comment: push always stacks a fresh instance even when one
            // already exists, which has been observed leaving the
            // destination detached from the Tabs navigator's own
            // back-stack (breaks the getParent()-based header override AND
            // back navigation every one of these 4 destination screens
            // relies on, plus anything pushed further from inside them).
            <Pressable key={card.id} style={styles.card} onPress={() => router.navigate(card.route as never)}>
              <View style={styles.iconWrap}>
                <Ionicons name={card.icon} size={26} color="#2F6FE0" />
              </View>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDescription}>{card.description}</Text>
            </Pressable>
          ))}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    flexBasis: "45%",
    flexGrow: 0,
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111",
    textAlign: "center",
  },
  cardDescription: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#7A828E",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 17,
  },
});
