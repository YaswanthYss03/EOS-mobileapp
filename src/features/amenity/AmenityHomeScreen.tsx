import { useCallback } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
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
  imageUrl: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/(tabs)/amenity/craveo" | "/(tabs)/amenity/stationary";
};

const options: AmenityOption[] = [
  {
    id: "craveo",
    title: "Craveo",
    description: "Order food from the campus canteen",
    imageUrl: "https://picsum.photos/seed/craveo-cover/600/400",
    icon: "fast-food-outline",
    route: "/(tabs)/amenity/craveo",
  },
  {
    id: "stationary",
    title: "Stationary",
    description: "Order stationery and supplies",
    imageUrl: "https://picsum.photos/seed/stationary-cover/600/400",
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

  if (role === "principal") {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.principalRow}>
          {principalOptions.map((option) => (
            <Pressable key={option.id} style={styles.principalCard} onPress={() => router.push(option.route)}>
              <View style={styles.principalIconWrap}>
                <Ionicons name={option.icon} size={26} color="#2F6FE0" />
              </View>
              <Text style={styles.principalCardTitle}>{option.title}</Text>
              <Text style={styles.principalCardDescription}>{option.description}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.list}>
        {options.map((option) => (
          <Pressable key={option.id} style={styles.card} onPress={() => router.push(option.route)}>
            <Image source={{ uri: option.imageUrl }} style={styles.image} />
            <View style={styles.overlay} />
            <View style={styles.cardContent}>
              <View style={styles.iconWrap}>
                <Ionicons name={option.icon} size={20} color="#fff" />
              </View>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </View>
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
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  card: {
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#eee",
  },
  image: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  cardContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
    gap: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  cardDescription: {
    color: "#f0f0f0",
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  // Copied from AcademicsChooserScreen's icon-circle card pattern (bordered
  // white card, no cover image) - a deliberate visual departure from the
  // image-cover cards above, scoped to the Principal role only.
  principalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  principalCard: {
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
  principalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  principalCardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111",
    textAlign: "center",
  },
  principalCardDescription: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#7A828E",
    textAlign: "center",
    marginTop: 2,
    lineHeight: 17,
  },
});
