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

// Higher Education/Entrepreneur/Timetable-style erp-local routes - not the
// Amenity tab's (hidden entirely while acting as HOD, see
// app/(tabs)/_layout.tsx's isHodActingAsHod) - same reasoning as every
// other erp-local route copy in this app.
const CARDS: CardOption[] = [
  {
    id: "academics",
    title: "Academics",
    description: "Student leave/OD requests, No Due and Subject Records for your department",
    icon: "school-outline",
    route: "/(tabs)/erp/hod-academics",
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
    description: "Students in your department who opted for further studies",
    icon: "ribbon-outline",
    route: "/(tabs)/erp/hod-higher-education",
  },
  {
    id: "entrepreneur",
    title: "Entrepreneur",
    description: "Students in your department who opted for entrepreneurship",
    icon: "rocket-outline",
    route: "/(tabs)/erp/hod-entrepreneur",
  },
  {
    id: "announcements",
    title: "Announcements",
    description: "Post to your department's students or faculty",
    icon: "megaphone-outline",
    route: "/(tabs)/erp/hod-announcements",
  },
  {
    id: "attendance",
    title: "Attendance",
    description: "Every class in your department, at a glance",
    icon: "checkmark-circle-outline",
    route: "/(tabs)/erp/hod-attendance",
  },
];

// The Student tab's root while acting as HOD (see AuthContext.tsx's
// ViewMode, app/(tabs)/_layout.tsx's isHodActingAsHod) - a HOD's bottom nav
// is Home + Student + Faculty (see app/(tabs)/_layout.tsx), so everything
// student-facing they need lives behind these 4 cards instead of a
// separate tab each - same pattern as the Class Advisor's own Class tab
// (see AdvisorClassScreen.tsx).
export function HodStudentScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <DashboardHeader subtitle="Student" onBack={() => router.replace("/(tabs)/home")} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {CARDS.map((card) => (
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
