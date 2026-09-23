import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
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
import { getFacultyFeedbackForms, type HodFacultyFeedbackForm } from "@/services/api/hod-faculty-feedback.api";

type LoadStatus = "loading" | "success" | "error";

// Reached from the HOD's own Campus tab "Faculty Feedback" card (see
// AmenityHomeScreen.tsx's hodOptions). Lists every end_semester feedback
// form (students rating their subject-handling faculty) for a class in the
// HoD's own department - the forms themselves are authored by the Academic
// Coordinator, this is a read-only view. Tapping one drills into its
// per-faculty-per-subject results (HodFacultyFeedbackResultsScreen).
export function HodFacultyFeedbackScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [forms, setForms] = useState<HodFacultyFeedbackForm[]>([]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const load = useCallback(() => {
    setStatus("loading");
    getFacultyFeedbackForms()
      .then((rows) => {
        setForms(rows);
        setStatus("success");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't load feedback forms."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <BackHeader title="Faculty Feedback" onBack={() => router.back()} />
      <WatermarkBackground />
      <ScrollView contentContainerStyle={styles.content}>
        {status === "loading" ? (
          <SkeletonListRows count={4} />
        ) : status === "error" ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Couldn't load feedback forms.</Text>
            <TouchableOpacity onPress={load} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : forms.length === 0 ? (
          <View style={styles.centerState}>
            <Ionicons name="chatbox-ellipses-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>No faculty feedback forms for your department yet.</Text>
          </View>
        ) : (
          forms.map((form) => (
            <TouchableOpacity
              key={form.id}
              style={styles.row}
              activeOpacity={0.8}
              onPress={() => router.push(`/(tabs)/amenity/hod-faculty-feedback/${form.id}` as never)}
            >
              <View style={styles.rowTextWrap}>
                <Text style={styles.rowTitle}>{form.title}</Text>
                <Text style={styles.rowSubtitle}>
                  {form.class_label} · {form.question_count} {form.question_count === 1 ? "question" : "questions"}
                </Text>
              </View>
              <View style={[styles.statusBadge, form.is_published ? styles.statusBadgePublished : styles.statusBadgeDraft]}>
                <Text style={[styles.statusBadgeText, form.is_published ? styles.statusBadgeTextPublished : styles.statusBadgeTextDraft]}>
                  {form.is_published ? "Published" : "Draft"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B0B7C3" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 32 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  rowSubtitle: { fontSize: 12, fontFamily: fonts.regular, color: "#9AA6B2", marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgePublished: { backgroundColor: "#F0FDF4" },
  statusBadgeDraft: { backgroundColor: "#FEF3C7" },
  statusBadgeText: { fontSize: 10.5, fontFamily: fonts.bold },
  statusBadgeTextPublished: { color: "#16A34A" },
  statusBadgeTextDraft: { color: "#D97706" },
  centerState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
});
