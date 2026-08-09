import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";
import { getMyLmsSubjects, getMyTeachingSubjects, type LmsSubject, type LmsTeachingSubject } from "@/services/api/lms.api";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = ["#2F6FE0", "#7C3AED", "#0EA5A4", "#DB2777", "#D97706", "#4F46E5"];

function colorFor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

// Google Classroom-style subject picker. Students see the subjects on their
// own class for the current semester (GET /me/lms/subjects); Faculty/HoD see
// every subject they teach (GET /me/lms/my-subjects) - same grid, same tap
// target into LmsSubjectScreen either way.
export function LmsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const role = useRole();
  const isTeaching = role === "employee" || role === "hod";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [subjects, setSubjects] = useState<(LmsSubject | LmsTeachingSubject)[]>([]);

  const load = useCallback(() => {
    setStatus("loading");
    const request = isTeaching ? getMyTeachingSubjects() : getMyLmsSubjects();
    request
      .then((data) => {
        setSubjects(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [isTeaching]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learning management</Text>
      </LinearGradient>

      {status === "loading" && (
        <View style={styles.centerFill}>
          <ActivityIndicator color="#2F6FE0" size="large" />
        </View>
      )}

      {status === "error" && (
        <View style={styles.centerFill}>
          <Ionicons name="cloud-offline-outline" size={40} color="#B0B7C3" />
          <Text style={styles.errorText}>Couldn't load your subjects.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {subjects.length === 0 ? (
            <Text style={styles.emptyText}>
              {isTeaching ? "You are not mapped to teach any subjects yet." : "No subjects found for your current semester."}
            </Text>
          ) : (
            <View style={styles.grid}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.subject_id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/academics/lms/[subjectId]",
                      params: {
                        subjectId: String(subject.subject_id),
                        subjectName: subject.subject_name,
                        subjectCode: subject.subject_code,
                      },
                    })
                  }
                >
                  <View style={[styles.avatar, { backgroundColor: colorFor(subject.subject_id) }]}>
                    <Text style={styles.avatarText}>{initials(subject.subject_name)}</Text>
                  </View>
                  <Text style={styles.subjectName} numberOfLines={2}>
                    {subject.subject_name}
                  </Text>
                  <Text style={styles.subjectCode}>{subject.subject_code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2F6FE0",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
    marginTop: 40,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  card: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    gap: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  subjectName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  subjectCode: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
});
