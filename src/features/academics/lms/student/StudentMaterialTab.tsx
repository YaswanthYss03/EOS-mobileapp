import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { getStudentFolders, type LmsStudentFolder } from "@/services/api/lms.api";

// Google Drive-style: folders shared to the student's own class, each
// showing the faculty who created it and how many resources are inside.
export function StudentMaterialTab({ subjectId }: { subjectId: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [folders, setFolders] = useState<LmsStudentFolder[]>([]);

  const load = useCallback(() => {
    setStatus("loading");
    getStudentFolders(subjectId)
      .then((data) => {
        setFolders(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [subjectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (status === "loading") {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color="#2F6FE0" />
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.centerFill}>
        <Text style={styles.errorText}>Couldn't load materials.</Text>
        <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={folders}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        folders.length > 0 ? (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>CLASS MATERIALS</Text>
            <Text style={styles.sectionHeaderCount}>{folders.length}</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={30} color="#C7CDD8" />
          <Text style={styles.emptyText}>No materials shared yet</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.85}
          onPress={() =>
            router.push({ pathname: "/(tabs)/academics/lms/folder/[folderId]", params: { folderId: String(item.id), title: item.title } })
          }
        >
          <View style={styles.iconWrap}>
            <Ionicons name="folder-outline" size={22} color="#2F6FE0" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>{item.title}</Text>
            {item.description && (
              <Text style={styles.description} numberOfLines={1}>
                {item.description}
              </Text>
            )}
            <Text style={styles.meta}>
              {item.faculty_name} · {item.resource_count} {item.resource_count === 1 ? "item" : "items"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2F6FE0",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    marginTop: 48,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 0.6,
  },
  sectionHeaderCount: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  description: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 2,
  },
  meta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 3,
  },
});
