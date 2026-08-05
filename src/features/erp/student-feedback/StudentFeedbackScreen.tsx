import { useCallback, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { courses, grades, ratingCategories, type Grade } from "./data/mockStudentFeedback";

// TODO: this is a submit-only UI over mockStudentFeedback - wire to a real
// academics/feedback backend endpoint once one exists. Reachable from the
// Student dashboard's Campus "Feedback" item.
export function StudentFeedbackScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [course, setCourse] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, Grade | null>>(() =>
    Object.fromEntries(ratingCategories.map((category) => [category, null])),
  );
  const [comments, setComments] = useState("");

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  function setRatingFor(category: string, grade: Grade) {
    setRatings((prev) => ({ ...prev, [category]: grade }));
  }

  function resetForm() {
    setCourse(null);
    setRatings(Object.fromEntries(ratingCategories.map((category) => [category, null])));
    setComments("");
  }

  function handleSubmit() {
    if (!course) {
      toast.warning("Select a course");
      return;
    }
    if (ratingCategories.some((category) => !ratings[category])) {
      toast.warning("Rate every category");
      return;
    }
    toast.success(`Feedback submitted for ${course}`);
    resetForm();
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
        {courses.map((option) => {
          const selected = course === option;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.courseRow, selected && styles.courseRowSelected]}
              onPress={() => setCourse(option)}
              activeOpacity={0.8}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.courseLabel, selected && styles.courseLabelSelected]}>{option}</Text>
            </TouchableOpacity>
          );
        })}

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

        {ratingCategories.map((category) => (
          <GradeRow
            key={category}
            label={category}
            value={ratings[category]}
            onChange={(grade) => setRatingFor(category, grade)}
          />
        ))}

        <Text style={styles.fieldLabel}>Comments (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputLast]}
          placeholder="Anything the faculty should know"
          placeholderTextColor="#9AA6B2"
          value={comments}
          onChangeText={setComments}
          multiline
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.submitButtonText}>Submit feedback</Text>
        </TouchableOpacity>
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
