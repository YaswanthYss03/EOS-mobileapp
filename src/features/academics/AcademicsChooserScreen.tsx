import { useCallback } from "react";
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";

type ChooserOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/(tabs)/academics/overview" | "/(tabs)/academics/placements";
};

// Same for hod, faculty (employee) and student - none of these roles get a
// different set of options today, see src/hooks/useRole.ts.
const options: ChooserOption[] = [
  {
    id: "academics",
    title: "Academics",
    description: "Timetable, courses, calendar and reminders",
    icon: "school-outline",
    route: "/(tabs)/academics/overview",
  },
  {
    id: "placements",
    title: "Placements",
    description: "Drives, eligibility, offers and training",
    icon: "briefcase-outline",
    route: "/(tabs)/academics/placements",
  },
];

function EduHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[headerStyles.container, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={headerStyles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View>
        <Text style={headerStyles.title}>Edu</Text>
        <Text style={headerStyles.subtitle}>Teaching & academics</Text>
      </View>
    </LinearGradient>
  );
}

export function AcademicsChooserScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for this screen's own header while it's focused,
  // same pattern used by the ERP hod/employee dashboards.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <EduHeader onBack={() => router.replace("/(tabs)/home")} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.row}>
        {options.map((option) => (
          <Pressable key={option.id} style={styles.card} onPress={() => router.push(option.route)}>
            <View style={styles.iconWrap}>
              <Ionicons name={option.icon} size={26} color="#2F6FE0" />
            </View>
            <Text style={styles.cardTitle}>{option.title}</Text>
            <Text style={styles.cardDescription}>{option.description}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const headerStyles = StyleSheet.create({
  container: {
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
  title: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  subtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    padding: 16,
    gap: 16,
  },
  card: {
    flex: 1,
    minHeight: 200,
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
