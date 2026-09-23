import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { createMyMessFeedback } from "@/services/api/hostel.api";
import { useHostelRoom } from "@/features/erp/student-hostel/useHostelRoom";
import { HostelRoomCard } from "@/features/erp/student-hostel/HostelRoomCard";
import {
  listMyFeedbackForms,
  getMyFeedbackForm,
  submitMyFeedbackResponses,
  type FeedbackServiceType,
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

const GRADE_TO_RATING: Record<Grade, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };

// The Campus tab's single Feedback card, now covering every kind of
// feedback a student can give - Hostel mess ("mess", previously its own
// page reached from the Hostel hub - see StudentHostelFeedbackScreen's own
// former comment), Academic/Course ("academic", previously its own page
// reached from the Academics tab's Current Semester grid - see
// StudentFeedbackScreen's former comment), and the original 5 Campus
// services (food_court/medical/library/stationary/copy_center). One filter
// at the top picks which - everything else on the page (the legend, the
// grade boxes, the submit button) is shared UI, only the fetch/submit
// wiring underneath differs per category. Both former standalone screens'
// tiles were removed (StudentHostelScreen's TILES / AcademicsOverviewScreen's
// academicsItems) per explicit request to consolidate into this one place
// rather than keep them as duplicate shortcuts.
type Category = "mess" | "academic" | FeedbackServiceType;

const CATEGORIES: { value: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "mess", label: "Hostel Mess", icon: "restaurant-outline" },
  { value: "academic", label: "Academic / Course", icon: "school-outline" },
  { value: "food_court", label: "Food Court", icon: "fast-food-outline" },
  { value: "medical", label: "Medical", icon: "medkit-outline" },
  { value: "library", label: "Library", icon: "library-outline" },
  { value: "stationary", label: "Stationary", icon: "book-outline" },
  { value: "copy_center", label: "Copy Center", icon: "print-outline" },
];

const MESS_MEALS = ["Breakfast", "Lunch", "Snacks", "Dinner"];

type LoadStatus = "idle" | "loading" | "success" | "error" | "not-found";

export function AmenityServiceFeedbackScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const categoryPicker = useDropdown();

  const [category, setCategory] = useState<Category | null>(null);

  // --- Campus service (food_court/medical/library/stationary/copy_center) ---
  const [serviceStatus, setServiceStatus] = useState<LoadStatus>("idle");
  const [serviceForm, setServiceForm] = useState<FeedbackFormDetail | null>(null);
  const [serviceRatings, setServiceRatings] = useState<Record<number, Grade | null>>({});
  const [serviceTexts, setServiceTexts] = useState<Record<number, string>>({});
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  // --- Academic / Course (dynamic list of forms, one per targeting form) ---
  const [academicFormsStatus, setAcademicFormsStatus] = useState<LoadStatus>("idle");
  const [academicForms, setAcademicForms] = useState<FeedbackFormSummary[]>([]);
  const [academicSelectedFormId, setAcademicSelectedFormId] = useState<number | null>(null);
  const [academicDetailStatus, setAcademicDetailStatus] = useState<LoadStatus | null>(null);
  const [academicForm, setAcademicForm] = useState<FeedbackFormDetail | null>(null);
  const [academicRatings, setAcademicRatings] = useState<Record<number, Grade | null>>({});
  const [academicTexts, setAcademicTexts] = useState<Record<number, string>>({});
  const [academicSubmitting, setAcademicSubmitting] = useState(false);

  // --- Hostel mess (fixed 3-question form, not the generic form system) ---
  const { status: roomStatus, room } = useHostelRoom();
  const mealPicker = useDropdown();
  const [meal, setMeal] = useState(MESS_MEALS[1]); // Lunch
  const [foodQuality, setFoodQuality] = useState<Grade | null>(null);
  const [hygiene, setHygiene] = useState<Grade | null>(null);
  const [serviceTiming, setServiceTiming] = useState<Grade | null>(null);
  const [messComments, setMessComments] = useState("");
  const [messSubmitting, setMessSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  function selectCategory(value: Category) {
    setCategory(value);
    categoryPicker.close();

    if (value === "academic") {
      setAcademicFormsStatus("loading");
      setAcademicForms([]);
      resetAcademicForm();
      listMyFeedbackForms()
        .then((forms) => {
          setAcademicForms(forms);
          setAcademicFormsStatus("success");
        })
        .catch(() => setAcademicFormsStatus("error"));
      return;
    }

    if (value === "mess") {
      // Nothing to fetch - the room card already loads via useHostelRoom(),
      // and the form itself is a fixed 3-question shape.
      return;
    }

    // One of the 5 Campus services.
    setServiceStatus("loading");
    setServiceForm(null);
    setServiceRatings({});
    setServiceTexts({});
    listMyFeedbackForms(value)
      .then((forms) => {
        if (forms.length === 0) {
          setServiceStatus("not-found");
          return;
        }
        return getMyFeedbackForm(forms[0].id).then((detail) => {
          setServiceForm(detail);
          applyInitialAnswers(detail, setServiceRatings, setServiceTexts);
          setServiceStatus("success");
        });
      })
      .catch(() => setServiceStatus("error"));
  }

  function applyInitialAnswers(
    detail: FeedbackFormDetail,
    setRatings: (v: Record<number, Grade | null>) => void,
    setTexts: (v: Record<number, string>) => void,
  ) {
    const initialRatings: Record<number, Grade | null> = {};
    const initialTexts: Record<number, string> = {};
    for (const q of detail.questions) {
      if (q.question_type === "rating") {
        const grade = (Object.keys(GRADE_TO_RATING) as Grade[]).find((g) => GRADE_TO_RATING[g] === q.rating_value);
        initialRatings[q.id] = grade ?? null;
      } else {
        initialTexts[q.id] = q.response_text ?? "";
      }
    }
    setRatings(initialRatings);
    setTexts(initialTexts);
  }

  function resetAcademicForm() {
    setAcademicSelectedFormId(null);
    setAcademicDetailStatus(null);
    setAcademicForm(null);
    setAcademicRatings({});
    setAcademicTexts({});
  }

  function selectAcademicForm(form: FeedbackFormSummary) {
    setAcademicSelectedFormId(form.id);
    setAcademicDetailStatus("loading");
    setAcademicForm(null);
    getMyFeedbackForm(form.id)
      .then((detail) => {
        setAcademicForm(detail);
        applyInitialAnswers(detail, setAcademicRatings, setAcademicTexts);
        setAcademicDetailStatus("success");
      })
      .catch(() => setAcademicDetailStatus("error"));
  }

  const serviceRatingQuestions = useMemo(
    () => serviceForm?.questions.filter((q) => q.question_type === "rating") ?? [],
    [serviceForm],
  );
  const serviceTextQuestions = useMemo(
    () => serviceForm?.questions.filter((q) => q.question_type === "text") ?? [],
    [serviceForm],
  );
  const academicRatingQuestions = useMemo(
    () => academicForm?.questions.filter((q) => q.question_type === "rating") ?? [],
    [academicForm],
  );
  const academicTextQuestions = useMemo(
    () => academicForm?.questions.filter((q) => q.question_type === "text") ?? [],
    [academicForm],
  );

  function handleSubmitService() {
    if (!serviceForm) return;
    if (serviceRatingQuestions.some((q) => !serviceRatings[q.id])) {
      toast.warning("Rate every category");
      return;
    }
    if (serviceTextQuestions.some((q) => !serviceTexts[q.id]?.trim())) {
      toast.warning("Answer every question");
      return;
    }
    const responses = [
      ...serviceRatingQuestions.map((q) => ({ question_id: q.id, rating_value: GRADE_TO_RATING[serviceRatings[q.id]!] })),
      ...serviceTextQuestions.map((q) => ({ question_id: q.id, response_text: serviceTexts[q.id].trim() })),
    ];
    setServiceSubmitting(true);
    submitMyFeedbackResponses(serviceForm.id, responses)
      .then(() => {
        toast.success("Feedback submitted");
        setServiceForm((prev) => (prev ? { ...prev, completed: true } : prev));
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't submit feedback.")))
      .finally(() => setServiceSubmitting(false));
  }

  function handleSubmitAcademic() {
    if (!academicForm) {
      toast.warning("Select a form");
      return;
    }
    if (academicRatingQuestions.some((q) => !academicRatings[q.id])) {
      toast.warning("Rate every category");
      return;
    }
    if (academicTextQuestions.some((q) => !academicTexts[q.id]?.trim())) {
      toast.warning("Answer every question");
      return;
    }
    const responses = [
      ...academicRatingQuestions.map((q) => ({ question_id: q.id, rating_value: GRADE_TO_RATING[academicRatings[q.id]!] })),
      ...academicTextQuestions.map((q) => ({ question_id: q.id, response_text: academicTexts[q.id].trim() })),
    ];
    setAcademicSubmitting(true);
    submitMyFeedbackResponses(academicForm.id, responses)
      .then(() => {
        toast.success(`Feedback submitted for ${academicForm.title}`);
        resetAcademicForm();
        setAcademicFormsStatus("loading");
        listMyFeedbackForms()
          .then((forms) => {
            setAcademicForms(forms);
            setAcademicFormsStatus("success");
          })
          .catch(() => setAcademicFormsStatus("error"));
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't submit feedback.")))
      .finally(() => setAcademicSubmitting(false));
  }

  function handleSubmitMess() {
    if (!foodQuality || !hygiene || !serviceTiming) {
      toast.warning("Rate food quality, hygiene, and service and timing");
      return;
    }
    const rating = Math.round((GRADE_TO_RATING[foodQuality] + GRADE_TO_RATING[hygiene] + GRADE_TO_RATING[serviceTiming]) / 3);
    const comment = messComments.trim() ? `${meal} - ${messComments.trim()}` : meal;

    setMessSubmitting(true);
    createMyMessFeedback({ rating, comment })
      .then(() => {
        toast.success("Thanks for your feedback");
        setFoodQuality(null);
        setHygiene(null);
        setServiceTiming(null);
        setMessComments("");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't submit your feedback.")))
      .finally(() => setMessSubmitting(false));
  }

  const selectedCategory = CATEGORIES.find((c) => c.value === category);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>Filter</Text>
        <View ref={categoryPicker.anchorRef} collapsable={false}>
          <TouchableOpacity style={styles.selectRow} onPress={categoryPicker.open} activeOpacity={0.8}>
            <View style={styles.selectValueRow}>
              {selectedCategory && <Ionicons name={selectedCategory.icon} size={16} color="#2F6FE0" />}
              <Text style={[styles.selectValue, !selectedCategory && styles.selectValuePlaceholder]}>
                {selectedCategory?.label ?? "Choose what you'd like to review"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
          </TouchableOpacity>
        </View>

        {category === "mess" && (
          <>
            <HostelRoomCard status={roomStatus} room={room} />

            <Text style={styles.fieldLabel}>Meal</Text>
            <View ref={mealPicker.anchorRef} collapsable={false}>
              <TouchableOpacity style={styles.selectRow} onPress={mealPicker.open} activeOpacity={0.8}>
                <Text style={styles.selectValue}>{meal}</Text>
                <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
              </TouchableOpacity>
            </View>

            <GradeRow label="Food quality" value={foodQuality} onChange={setFoodQuality} />
            <GradeRow label="Hygiene and cleanliness" value={hygiene} onChange={setHygiene} />
            <GradeRow label="Service and timing" value={serviceTiming} onChange={setServiceTiming} />

            <Text style={styles.fieldLabel}>Comments (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputLast]}
              placeholder="Anything the mess committee should know"
              placeholderTextColor="#9AA6B2"
              value={messComments}
              onChangeText={setMessComments}
              multiline
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitMess} activeOpacity={0.85} disabled={messSubmitting}>
              <Text style={styles.submitButtonText}>Submit feedback</Text>
            </TouchableOpacity>

            <AnchoredDropdown
              anchorRef={mealPicker.anchorRef}
              visible={mealPicker.visible}
              onClose={mealPicker.close}
              contentStyle={[styles.modalCard, styles.anchoredCard]}
            >
              <Text style={styles.modalTitle}>Meal</Text>
              {MESS_MEALS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    setMeal(option);
                    mealPicker.close();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionName}>{option}</Text>
                  {meal === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </AnchoredDropdown>
          </>
        )}

        {category === "academic" && (
          <>
            <Text style={styles.fieldLabel}>Course</Text>
            {academicFormsStatus === "loading" ? (
              <SkeletonListRows count={3} />
            ) : academicFormsStatus === "error" ? (
              <View style={styles.errorNotice}>
                <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
                <Text style={styles.errorNoticeText}>Couldn't load feedback forms.</Text>
              </View>
            ) : academicForms.length === 0 ? (
              <Text style={styles.emptyText}>No feedback forms available right now.</Text>
            ) : (
              academicForms.map((form) => {
                const selected = academicSelectedFormId === form.id;
                return (
                  <TouchableOpacity
                    key={form.id}
                    style={[styles.courseRow, selected && styles.courseRowSelected]}
                    onPress={() => selectAcademicForm(form)}
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

            {academicDetailStatus === "loading" && <SkeletonListRows count={3} />}

            {academicDetailStatus === "error" && (
              <View style={styles.errorNotice}>
                <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
                <Text style={styles.errorNoticeText}>Couldn't load this form.</Text>
              </View>
            )}

            {academicDetailStatus === "success" && academicForm && (
              <>
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

                {academicRatingQuestions.map((question) => (
                  <GradeRow
                    key={question.id}
                    label={question.question_text}
                    value={academicRatings[question.id] ?? null}
                    onChange={(grade) => setAcademicRatings((prev) => ({ ...prev, [question.id]: grade }))}
                  />
                ))}

                {academicTextQuestions.map((question) => (
                  <View key={question.id}>
                    <Text style={styles.fieldLabel}>{question.question_text}</Text>
                    <TextInput
                      style={[styles.input, styles.inputLast]}
                      placeholder="Your answer"
                      placeholderTextColor="#9AA6B2"
                      value={academicTexts[question.id] ?? ""}
                      onChangeText={(value) => setAcademicTexts((prev) => ({ ...prev, [question.id]: value }))}
                      multiline
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmitAcademic}
                  activeOpacity={0.85}
                  disabled={academicSubmitting || academicForm.completed}
                >
                  <Text style={styles.submitButtonText}>
                    {academicForm.completed ? "Already submitted" : "Submit feedback"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        {category && category !== "mess" && category !== "academic" && (
          <>
            {serviceStatus === "loading" && <SkeletonListRows count={3} />}

            {serviceStatus === "error" && (
              <View style={styles.errorNotice}>
                <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
                <Text style={styles.errorNoticeText}>Couldn't load this form.</Text>
              </View>
            )}

            {serviceStatus === "not-found" && (
              <View style={styles.errorNotice}>
                <Ionicons name="document-text-outline" size={28} color="#B0B7C3" />
                <Text style={styles.errorNoticeText}>No feedback form has been set up for {selectedCategory?.label} yet.</Text>
              </View>
            )}

            {serviceStatus === "success" && serviceForm && (
              <>
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

                {serviceRatingQuestions.map((question) => (
                  <GradeRow
                    key={question.id}
                    label={question.question_text}
                    value={serviceRatings[question.id] ?? null}
                    onChange={(grade) => setServiceRatings((prev) => ({ ...prev, [question.id]: grade }))}
                  />
                ))}

                {serviceTextQuestions.map((question) => (
                  <View key={question.id}>
                    <Text style={styles.fieldLabel}>{question.question_text}</Text>
                    <TextInput
                      style={[styles.input, styles.inputLast]}
                      placeholder="Your answer"
                      placeholderTextColor="#9AA6B2"
                      value={serviceTexts[question.id] ?? ""}
                      onChangeText={(value) => setServiceTexts((prev) => ({ ...prev, [question.id]: value }))}
                      multiline
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmitService}
                  activeOpacity={0.85}
                  disabled={serviceSubmitting || serviceForm.completed}
                >
                  <Text style={styles.submitButtonText}>{serviceForm.completed ? "Already submitted" : "Submit feedback"}</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

      <AnchoredDropdown
        anchorRef={categoryPicker.anchorRef}
        visible={categoryPicker.visible}
        onClose={categoryPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Choose what to review</Text>
        {CATEGORIES.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={styles.modalOptionRow}
            onPress={() => selectCategory(option.value)}
            activeOpacity={0.8}
          >
            <View style={styles.modalOptionLeft}>
              <Ionicons name={option.icon} size={16} color="#2F6FE0" />
              <Text style={styles.modalOptionName}>{option.label}</Text>
            </View>
            {category === option.value && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
          </TouchableOpacity>
        ))}
      </AnchoredDropdown>
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  selectValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  selectValuePlaceholder: {
    fontFamily: fonts.regular,
    color: "#9AA6B2",
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
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  anchoredCard: {
    width: 260,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
