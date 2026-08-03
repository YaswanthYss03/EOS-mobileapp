import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { mockLmsSubjects, mockLmsNotes, type LmsNote } from "./data/mockLms";

const fileIcon: Record<LmsNote["fileType"], keyof typeof Ionicons.glyphMap> = {
  pdf: "document-text-outline",
  doc: "document-outline",
  ppt: "easel-outline",
};

// TODO: replace mockLmsNotes with a real call, and wire note taps to an actual file open/download
export function LmsNotesScreen({ subjectId }: { subjectId: string }) {
  const subject = mockLmsSubjects.find((s) => s.id === subjectId);
  const notes = mockLmsNotes[subjectId] ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader title={subject?.subject ?? "Notes"} />
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name={fileIcon[item.fileType]} size={20} color="#1E3A8A" />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.uploadedOn}>Uploaded {item.uploadedOn}</Text>
            </View>
            <Ionicons name="download-outline" size={20} color="#999" />
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notes uploaded yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF1FA",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  uploadedOn: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },
});
