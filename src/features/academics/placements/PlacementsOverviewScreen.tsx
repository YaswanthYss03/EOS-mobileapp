import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { MenuRow } from "@/components/ui/MenuRow";

export function PlacementsOverviewScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Placements" />
      <View style={styles.list}>
        <MenuRow
          icon="rocket-outline"
          title="Upcoming Drives"
          subtitle="Companies visiting campus"
          onPress={() => router.push("/(tabs)/academics/placements/drives")}
        />
        <MenuRow
          icon="time-outline"
          title="Placement History"
          subtitle="Your round-wise progress"
          onPress={() => router.push("/(tabs)/academics/placements/history")}
        />
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
    paddingTop: 8,
  },
});
