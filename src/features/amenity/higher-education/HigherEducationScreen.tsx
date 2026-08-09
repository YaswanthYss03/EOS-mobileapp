import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import { getAllHigherEducation, type HigherEducationEntry } from "@/services/api/student-higher-education.api";

type LoadStatus = "loading" | "success" | "error";

// Principal-only - every department's students who've registered interest
// in further studies (student_higher_education), all at once - no
// department picker needed.
export function HigherEducationScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // This screen renders its own header below, so hide the shared
  // CollegeHeader (logo/college name) while it's focused.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const [entries, setEntries] = useState<HigherEducationEntry[] | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    getAllHigherEducation()
      .then((rows) => {
        setEntries(rows);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load these records."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Higher Education</Text>
          <Text style={styles.subtitle}>Students pursuing further studies</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {status === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {status === "error" && <ErrorState message={error ?? "Something went wrong."} onRetry={load} />}

        {status === "success" && entries && entries.length === 0 && (
          <EmptyState icon="ribbon-outline" text="No students have registered interest yet." />
        )}

        {status === "success" && entries?.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function EntryCard({ entry }: { entry: HigherEducationEntry }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.studentName}>{entry.student.name}</Text>
        <Text style={styles.studentMeta}>
          {entry.student.student_id_no}
          {entry.student.section ? ` · Sec ${entry.student.section}` : ""}
        </Text>
      </View>

      {entry.student.department && (
        <View style={styles.deptBadge}>
          <Text style={styles.deptBadgeText}>{entry.student.department.code}</Text>
        </View>
      )}

      <Text style={styles.courseText}>{entry.preferred_course}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>
          {entry.preferred_country}
          {entry.preferred_university ? ` · ${entry.preferred_university}` : ""}
        </Text>
      </View>

      {entry.remarks && <Text style={styles.remarksText}>{entry.remarks}</Text>}

      <Text style={styles.dateText}>Registered {formatDate(new Date(entry.created_at))}</Text>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name={icon} size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>{text}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>{message}</Text>
      <Pressable onPress={onRetry}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2F6FE0",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#D7E2FA",
    marginTop: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  inlineLoading: {
    paddingVertical: 60,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  studentName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  studentMeta: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  deptBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F3F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  deptBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#6B7280",
  },
  courseText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
  remarksText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  dateText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#B0B7C3",
    marginTop: 10,
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  centerStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
});
