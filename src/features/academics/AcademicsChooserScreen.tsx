import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";

type ChooserOption = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/(tabs)/academics/overview" | "/(tabs)/academics/placements";
};

const options: ChooserOption[] = [
  {
    id: "academics",
    title: "Academics",
    description: "Timetable, lesson plan and LMS notes",
    imageUrl: "https://picsum.photos/seed/academics-cover/600/400",
    icon: "book-outline",
    route: "/(tabs)/academics/overview",
  },
  {
    id: "placements",
    title: "Placements",
    description: "Upcoming drives and your placement history",
    imageUrl: "https://picsum.photos/seed/placements-cover/600/400",
    icon: "briefcase-outline",
    route: "/(tabs)/academics/placements",
  },
];

export function AcademicsChooserScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Text style={styles.title}>Academics</Text>

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
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  list: {
    paddingHorizontal: 16,
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
