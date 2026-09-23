import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getFacultyFeedbackResults,
  type HodFacultyFeedbackResults,
} from "@/services/api/hod-faculty-feedback.api";

type LoadStatus = "loading" | "success" | "error";

type Props = { formId: number };

// Drill-down from HodFacultyFeedbackScreen - per-faculty-per-subject aggregated
// results for one end_semester feedback form, scoped to the HoD's own department
// by the backend (hod-faculty-feedback.service.ts). Read-only.
export function HodFacultyFeedbackResultsScreen({ formId }: Props) {
  const navigation = useNavigation();
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [results, setResults] = useState<HodFacultyFeedbackResults | null>(null);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const load = useCallback(() => {
    setStatus("loading");
    getFacultyFeedbackResults(formId)
      .then((data) => {
        setResults(data);
        setStatus("success");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't load feedback results."));
        setStatus("error");
      });
  }, [formId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BackHeader title={results?.title ?? "Feedback Results"} onBack={() => router.back()} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        {status === "loading" ? (
          <SkeletonListRows count={4} />
        ) : status === "error" ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Couldn't load feedback results.</Text>
            <TouchableOpacity onPress={load} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : !results || results.rows.length === 0 ? (
          <View style={styles.centerState}>
            <Ionicons name="chatbox-ellipses-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>No responses recorded yet.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                {results.respondent_count} of {results.target_student_count} students responded
              </Text>
            </View>

            {results.rows.map((row) => (
              <View key={row.mapping_id} style={styles.facultyCard}>
                <Text style={styles.facultyName}>{row.faculty_name}</Text>
                <Text style={styles.subjectName}>{row.subject_name}</Text>

                {row.questions.map((q) => (
                  <View key={q.id} style={styles.questionBlock}>
                    <Text style={styles.questionText}>{q.question_text}</Text>

                    {q.question_type === "rating" ? (
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingValue}>
                          {q.average_rating != null ? q.average_rating.toFixed(2) : "—"}
                        </Text>
                        <Text style={styles.ratingCount}>
                          avg · {q.response_count} {q.response_count === 1 ? "response" : "responses"}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.textResponses}>
                        {q.responses && q.responses.filter(Boolean).length > 0 ? (
                          q.responses
                            .filter((r): r is string => Boolean(r))
                            .map((r, idx) => (
                              <Text key={idx} style={styles.textResponseItem}>
                                “{r}”
                              </Text>
                            ))
                        ) : (
                          <Text style={styles.textResponseEmpty}>No written responses.</Text>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  summaryText: { fontSize: 12.5, fontFamily: fonts.medium, color: "#1D4ED8" },
  facultyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 12,
  },
  facultyName: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  subjectName: { fontSize: 12, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2, marginBottom: 10 },
  questionBlock: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  questionText: { fontSize: 12.5, fontFamily: fonts.medium, color: "#374151", marginBottom: 6 },
  ratingRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  ratingValue: { fontSize: 18, fontFamily: fonts.bold, color: "#2F6FE0" },
  ratingCount: { fontSize: 11, fontFamily: fonts.regular, color: "#9AA6B2" },
  textResponses: { gap: 4 },
  textResponseItem: { fontSize: 12, fontFamily: fonts.regular, color: "#4B5563", fontStyle: "italic" },
  textResponseEmpty: { fontSize: 12, fontFamily: fonts.regular, color: "#B0B7C3" },
  centerState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
});
