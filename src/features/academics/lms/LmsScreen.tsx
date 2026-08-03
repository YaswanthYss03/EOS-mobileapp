import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { MenuRow } from "@/components/ui/MenuRow";
import { mockLmsSubjects } from "./data/mockLms";

// TODO: replace mockLmsSubjects with a real call once the LMS backend endpoint exists
export function LmsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <ScreenHeader title="LMS" />
      <FlatList
        data={mockLmsSubjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MenuRow
            icon="document-text-outline"
            title={item.subject}
            subtitle={`${item.faculty} · ${item.notesCount} notes`}
            onPress={() => router.push(`/(tabs)/academics/lms/${item.id}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}
