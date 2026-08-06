import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  listMyFeedbackForms,
  getMyFeedbackForm,
  submitMyFeedbackResponses,
  type FeedbackFormSummary,
  type FeedbackFormDetail,
} from "@/services/api/feedback.api";

type Grade = "A" | "B" | "C" | "D" | "E";

const grades: { grade: Grade; label: string }[] = [
  { grade: "A", label: "Excellent" },
  { grade: "B", label: "Very good" },
  { grade: "C", label: "Good" },
  { grade: "D", label: "Average" },
  { grade: "E", label: "Poor" },
];

// hostel_mess_feedback/feedback_responses both store a 1-5 rating_value,
// not a letter grade - this UI's A-E boxes are just a nicer picker.
const GRADE_TO_RATING: Record<Grade, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };

type LoadStatus = "loading" | "success" | "error";

// Wired to GET /feedback/student/forms + GET .../forms/:id + POST
// .../forms/:id/responses. Feedback is form-based with a dynamic list of
// questions (each "rating" 1-5 or free-text "text"), not one fixed shape -
// the "Course" list is now the list of forms actually targeting this
// student, and the rating/comment rows below are generated from whichever
// form is selected. Reachable from the Student dashboard's Campus
// "Feedback" item.
export function StudentFeedbackScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [formsStatus, setFormsStatus] = useState<LoadStatus>("loading");
  const [forms, setForms] = useState<FeedbackFormSummary[]>([]);

  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [detailStatus, setDetailStatus] = useState<LoadStatus | null>(null);
  const [formDetail, setFormDetail] = useState<FeedbackFormDetail | null>(null);

  const [ratings, setRatings] = useState<Record<number, Grade | null>>({});
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadForms = useCallback(() => {
    setFormsStatus("loading");
    listMyFeedbackForms()
      .then((response) => {
        setForms(response);
        setFormsStatus("success");
      })
      .catch(() => setFormsStatus("error"));
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const ratingQuestions = useMemo(
    () => formDetail?.questions.filter((q) => q.question_type === "rating") ?? [],
    [formDetail],
  );
  const textQuestions = useMemo(
    () => formDetail?.questions.filter((q) => q.question_type === "text") ?? [],
    [formDetail],
  );

  function selectForm(form: FeedbackFormSummary) {
    setSelectedFormId(form.id);
    setDetailStatus("loading");
    setFormDetail(null);
    getMyFeedbackForm(form.id)
      .then((detail) => {
        setFormDetail(detail);
        setDetailStatus("success");
        const initialRatings: Record<number, Grade | null> = {};
        const initialTexts: Record<number, string> = {};
        for (const q of detail.questions) {
          if (q.question_type === "rating") {
            const grade = (Object.keys(GRADE_TO_RATING) as Grade[]).find(
              (g) => GRADE_TO_RATING[g] === q.rating_value,
            );
            initialRatings[q.id] = grade ?? null;
          } else {
            initialTexts[q.id] = q.response_text ?? "";
          }
        }
        setRatings(initialRatings);
        setTexts(initialTexts);
      })
      .catch(() => setDetailStatus("error"));
  }

  function setRatingFor(questionId: number, grade: Grade) {
    setRatings((prev) => ({ ...prev, [questionId]: grade }));
  }

  function setTextFor(questionId: number, value: string) {
    setTexts((prev) => ({ ...prev, [questionId]: value }));
  }

  function resetForm() {
    setSelectedFormId(null);
    setDetailStatus(null);
    setFormDetail(null);
    setRatings({});
    setTexts({});
  }

  function handleSubmit() {
    if (!formDetail) {
      toast.warning("Select a form");
      return;
    }
    if (ratingQuestions.some((q) => !ratings[q.id])) {
      toast.warning("Rate every category");
      return;
    }
    if (textQuestions.some((q) => !texts[q.id]?.trim())) {
      toast.warning("Answer every question");
      return;
    }

    const responses = [
      ...ratingQuestions.map((q) => ({ question_id: q.id, rating_value: GRADE_TO_RATING[ratings[q.id]!] })),
      ...textQuestions.map((q) => ({ question_id: q.id, response_text: texts[q.id].trim() })),
    ];

    setIsSubmitting(true);
    submitMyFeedbackResponses(formDetail.id, responses)
      .then(() => {
        toast.success(`Feedback submitted for ${formDetail.title}`);
        resetForm();
        loadForms();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't submit feedback.")))
      .finally(() => setIsSubmitting(false));
  }

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
        <Text style={styles.headerTitle}>Feedback</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>Course</Text>
        {formsStatus === "loading" ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        ) : formsStatus === "error" ? (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>Couldn't load feedback forms.</Text>
            <TouchableOpacity onPress={loadForms} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : forms.length === 0 ? (
          <Text style={styles.emptyText}>No feedback forms available right now.</Text>
        ) : (
          forms.map((form) => {
            const selected = selectedFormId === form.id;
            return (
              <TouchableOpacity
                key={form.id}
                style={[styles.courseRow, selected && styles.courseRowSelected]}
                onPress={() => selectForm(form)}
                activeOpacity={0.8}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.courseLabel, selected && styles.courseLabelSelected]}>
                  {form.title}
                  {form.completed ? " (submitted)" : ""}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.legendCard}>
          <View style={styles.legendRow}>
            {grades.slice(0, 3).map((item) => (
              <LegendItem key={item.grade} grade={item.grade} label={item.label} />
            ))}
          </View>
          <View style={styles.legendRow}>
            {grades.slice(3).map((item) => (
              <LegendItem key={item.grade} grade={item.grade} label={item.label} />
            ))}
          </View>
        </View>

        {detailStatus === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {detailStatus === "error" && (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>Couldn't load this form.</Text>
          </View>
        )}

        {detailStatus === "success" && formDetail && (
          <>
            {ratingQuestions.map((question) => (
              <GradeRow
                key={question.id}
                label={question.question_text}
                value={ratings[question.id] ?? null}
                onChange={(grade) => setRatingFor(question.id, grade)}
              />
            ))}

            {textQuestions.map((question) => (
              <View key={question.id}>
                <Text style={styles.fieldLabel}>{question.question_text}</Text>
                <TextInput
                  style={[styles.input, styles.inputLast]}
                  placeholder="Your answer"
                  placeholderTextColor="#9AA6B2"
                  value={texts[question.id] ?? ""}
                  onChangeText={(value) => setTextFor(question.id, value)}
                  multiline
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={isSubmitting || formDetail.completed}
            >
              <Text style={styles.submitButtonText}>
                {formDetail.completed ? "Already submitted" : "Submit feedback"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendItem({ grade, label }: { grade: string; label: string }) {
  return (
    <Text style={styles.legendItem}>
      <Text style={styles.legendGrade}>{grade}</Text>
      <Text style={styles.legendDash}> — </Text>
      <Text style={styles.legendLabel}>{label}</Text>
    </Text>
  );
}

function GradeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Grade | null;
  onChange: (grade: Grade) => void;
}) {
  return (
    <View style={styles.gradeSection}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.gradeRow}>
        {grades.map((item) => {
          const selected = value === item.grade;
          return (
            <TouchableOpacity
              key={item.grade}
              style={[styles.gradeBox, selected && styles.gradeBoxSelected]}
              onPress={() => onChange(item.grade)}
              activeOpacity={0.8}
            >
              <Text style={[styles.gradeLetter, selected && styles.gradeLetterSelected]}>{item.grade}</Text>
              <Text style={[styles.gradeSubLabel, selected && styles.gradeSubLabelSelected]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginBottom: 8,
  },
  inlineLoading: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 16,
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  courseRowSelected: {
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#2F6FE0",
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#2F6FE0",
  },
  courseLabel: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  courseLabelSelected: {
    fontFamily: fonts.bold,
    color: "#111827",
  },
  legendCard: {
    backgroundColor: "#F1F3F6",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    marginBottom: 20,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  legendItem: {
    fontSize: 13,
  },
  legendGrade: {
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  legendDash: {
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  legendLabel: {
    fontFamily: fonts.regular,
    color: "#4B5563",
  },
  gradeSection: {
    marginBottom: 20,
  },
  gradeRow: {
    flexDirection: "row",
    gap: 8,
  },
  gradeBox: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  gradeBoxSelected: {
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  gradeLetter: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  gradeLetterSelected: {
    color: "#2F6FE0",
  },
  gradeSubLabel: {
    fontSize: 9,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 3,
    textAlign: "center",
  },
  gradeSubLabelSelected: {
    color: "#2F6FE0",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    height: 100,
    textAlignVertical: "top",
  },
  inputLast: {
    marginBottom: 16,
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 16,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
