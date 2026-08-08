import { useCallback } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { BackHeader } from "@/components/layout/BackHeader";
import { fonts } from "@/theme";

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

export function AmenityHomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // Swaps the shared CollegeHeader (mounted at the Tabs level, see
  // app/(tabs)/_layout.tsx) for a plain "Amenity" + back button while this
  // screen is focused, restoring the shared one on blur/unmount - same
  // pattern as the ERP dashboards (see DashboardHeader), just without the
  // "EOS" branding since this isn't a role dashboard.
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
});
