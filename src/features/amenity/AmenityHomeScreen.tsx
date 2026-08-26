import { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { BackHeader } from "@/components/layout/BackHeader";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";

type AmenityOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/(tabs)/amenity/craveo" | "/(tabs)/amenity/stationary";
};

const options: AmenityOption[] = [
  {
    id: "craveo",
    title: "Craveo",
    description: "Order food from the campus canteen",
    icon: "fast-food-outline",
    route: "/(tabs)/amenity/craveo",
  },
  {
    id: "stationary",
    title: "Stationary",
    description: "Order stationery and supplies",
    icon: "book-outline",
    route: "/(tabs)/amenity/stationary",
  },
];

// Principal has no use for canteen/stationery ordering - Craveo/Stationary
// stay exactly as-is for every other role (student/faculty/hod/parent/etc),
// this is purely a role-scoped swap. "Placements" here renders the exact
// same PlacementsOverviewScreen the Academics chooser used to reach (see
// AcademicsChooserScreen.tsx, which now hides that card for this role to
// avoid showing it in two places) - but via its own Amenity route, not
// nested under the Academics tab's navigation stack.
type PrincipalAmenityOption = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route:
    | "/(tabs)/amenity/placements"
    | "/(tabs)/amenity/higher-education"
    | "/(tabs)/amenity/entrepreneur"
    | "/(tabs)/amenity/alumni";
};

const principalOptions: PrincipalAmenityOption[] = [
  {
    id: "placements",
    title: "Placements",
    description: "Drives, eligibility, offers and training",
    icon: "briefcase-outline",
    route: "/(tabs)/amenity/placements",
  },
  {
    id: "higher-education",
    title: "Higher Education",
    description: "Guidance and resources for further studies",
    icon: "ribbon-outline",
    route: "/(tabs)/amenity/higher-education",
  },
  {
    id: "entrepreneur",
    title: "Entrepreneur",
    description: "Startup support and incubation resources",
    icon: "rocket-outline",
    route: "/(tabs)/amenity/entrepreneur",
  },
  {
    id: "alumni",
    title: "Alumni",
    description: "Batch groups, chats and announcements",
    icon: "people-circle-outline",
    route: "/(tabs)/amenity/alumni",
  },
];

export function AmenityHomeScreen() {
  const router = useRouter();
  const role = useRole();
  const navigation = useNavigation();

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for a plain "Amenity" + back button while this
  // screen is focused, restoring the shared one on blur/unmount - same
  // pattern as the ERP dashboards (see DashboardHeader), just without the
  // "EOS" branding since this isn't a role dashboard. Applies regardless of
  // role - the principal branch below only changes which cards render, not
  // the header treatment.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <BackHeader title="Amenity" onBack={() => router.replace("/(tabs)/home")} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router]),
  );

  // Same bordered icon-card grid as AcademicsChooserScreen (Edu tab) -
  // requested to match that look rather than the old photo-cover cards.
  // One shared render for both role branches; only the option list differs.
  const visibleOptions = role === "principal" ? principalOptions : options;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.grid}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  grid: {
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
