import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { MenuRow } from "@/components/ui/MenuRow";

export function AcademicsOverviewScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title="Academics" />
      <View style={styles.list}>
        <MenuRow
          icon="calendar-outline"
          title="Timetable"
          subtitle="Today's schedule and the full week"
          onPress={() => router.push("/(tabs)/academics/timetable")}
        />
        <MenuRow
          icon="clipboard-outline"
          title="Lesson Plan"
          subtitle="Syllabus progress by subject"
          onPress={() => router.push("/(tabs)/academics/lesson-plan")}
        />
        <MenuRow
          icon="library-outline"
          title="LMS"
          subtitle="Notes for each subject"
          onPress={() => router.push("/(tabs)/academics/lms")}
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
