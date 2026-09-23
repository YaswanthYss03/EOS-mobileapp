import { useCallback, useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { getMyMentorClasses } from "@/services/api/class-mentors.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  getMentorClassHigherEducation,
  type MentorHigherEducationEntry,
} from "@/services/api/student-higher-education.api";

type LoadStatus = "loading" | "success" | "error";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Class-mentor-scoped Higher Education view - which students in the
// Advisor's own mentored class have registered interest in further studies
// (see EOS-backend's class-mentors.service.ts), not the generic student
// self-service opt-in form.
export function AdvisorHigherEducationScreen() {
  const router = useRouter();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<MentorHigherEducationEntry[]>([]);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    getMyMentorClasses()
      .then((classes) => {
        if (classes.length === 0) {
          setEntries([]);
          setStatus("success");
          return;
        }
        return getMentorClassHigherEducation(classes[0].class_id).then((rows) => {
          setEntries(rows);
          setStatus("success");
        });
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load higher-education interest for your class."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <BackHeader title="Higher Education" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {status === "loading" && <SkeletonListRows count={4} />}

        {status === "error" && (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{error}</Text>
          </View>
        )}

        {status === "success" && entries.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="ribbon-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No student in your class has opted for higher education yet</Text>
          </View>
        )}

        {status === "success" &&
          entries.map((entry) => (
            <View key={entry.id} style={styles.card}>
              <View style={styles.cardHeader}>
                {entry.student.photo_url ? (
                  <Image source={{ uri: entry.student.photo_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{initialsFromName(entry.student.name)}</Text>
                  </View>
                )}
                <View style={styles.studentTextWrap}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {entry.student.name}
                  </Text>
                  <Text style={styles.studentMeta}>{entry.student.student_id_no}</Text>
                </View>
              </View>
              <Text style={styles.detailLine}>
                {entry.preferred_course} · {entry.preferred_country}
              </Text>
              {entry.preferred_university && <Text style={styles.detailLineSub}>{entry.preferred_university}</Text>}
              {entry.remarks && <Text style={styles.remarks}>{entry.remarks}</Text>}
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyCardText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  studentTextWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  studentMeta: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  detailLine: {
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginTop: 10,
  },
  detailLineSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 2,
  },
  remarks: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 6,
  },
});
