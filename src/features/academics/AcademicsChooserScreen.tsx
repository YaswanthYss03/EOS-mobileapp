import { useCallback } from "react";
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";

type ChooserOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/(tabs)/academics/overview" | "/(tabs)/academics/placements";
};

// Same for hod and faculty (employee) - neither gets a different set of
// options today, see src/hooks/useRole.ts. This IS a student's own "Campus"
// tab (see app/(tabs)/_layout.tsx) - every other role still has this tab
// hidden, reaching the same options from their own dashboard's sections
// instead.
const options: ChooserOption[] = [
  {
    id: "academics",
    title: "Academics",
    description: "Timetable and calendar",
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

// HR Payroll has nothing to do with student placements - only Academics
// (which itself only shows Timetable/Calendar for this role, see
// AcademicsOverviewScreen) is relevant.
const hrOptions = options.filter((option) => option.id === "academics");

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
        <Ionicons name="chevron-back" size={20} color="#fff" />
      </TouchableOpacity>
      <View style={headerStyles.textWrap}>
        <Text style={headerStyles.title} numberOfLines={2}>
          Sri Eshwar College of Engineering
        </Text>
        <Text style={headerStyles.subtitle}>Teaching & academics</Text>
      </View>
    </LinearGradient>
  );
}

export function AcademicsChooserScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const role = useRole();
  const visibleOptions = role === "hr-payroll" ? hrOptions : options;

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for this screen's own header while it's focused,
  // same pattern used by the ERP hod/employee dashboards.
  //
  // No blur-cleanup here on purpose: this screen leads to other
  // header-swapping screens (Overview, Placements), and a cleanup that
  // unconditionally restores CollegeHeader races their own focus-effect -
  // observed live as "College header shows instead of Placements" when
  // pushing forward, since the child's setup and this cleanup can both
  // fire on the same transition and whichever runs last wins. Restoring
  // CollegeHeader is instead handled explicitly below, only on the one
  // path that actually needs it - leaving the Academics tab for Home.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => (
          <EduHeader
            onBack={() => {
              navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
              router.replace("/(tabs)/home");
            }}
          />
        ),
      });
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.row}>
        {visibleOptions.map((option) => (
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 16,
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
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  card: {
    flexBasis: "45%",
    flexGrow: 1,
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
