import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { classInfo, mockCiaStudents } from "./data/mockCiaMarks";

type ExamTab = "cia1" | "cia2";
type MarksMap = Record<string, string>;

function sanitizeMark(text: string, max: number): string {
  const digitsOnly = text.replace(/[^0-9]/g, "");
  if (!digitsOnly) return "";
  return String(Math.min(parseInt(digitsOnly, 10), max));
}

// TODO: this is a marks-entry UI over mockCiaMarks - wire to a real
// results backend endpoint once one exists. Reachable from both the
// Employee/Faculty and HoD dashboards' "CIA Marks" item.
export function CiaMarksScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [examTab, setExamTab] = useState<ExamTab>("cia1");
  const [marksByExam, setMarksByExam] = useState<Record<ExamTab, MarksMap>>({ cia1: {}, cia2: {} });

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens (attendance, leave, on duty, no-due, subject records).
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const currentMarks = marksByExam[examTab];

  const enteredCount = useMemo(
    () => Object.values(currentMarks).filter((value) => value !== "").length,
    [currentMarks],
  );

  function handleChangeMark(studentId: string, text: string) {
    const sanitized = sanitizeMark(text, classInfo.maxMarks);
    setMarksByExam((prev) => ({
      ...prev,
      [examTab]: { ...prev[examTab], [studentId]: sanitized },
    }));
  }

  function handleClearAll() {
    setMarksByExam((prev) => ({ ...prev, [examTab]: {} }));
  }

  function handleSave() {
    toast.success(`${examTab === "cia1" ? "CIA-1" : "CIA-2"} marks saved`);
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
        <View>
          <Text style={styles.headerTitle}>CIA Marks</Text>
          <Text style={styles.headerSubtitle}>Continuous internal assessment</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.classCard} activeOpacity={0.8}>
          <View style={styles.classCardTextWrap}>
            <Text style={styles.classCardTitle}>
              {classInfo.className} · {classInfo.subjectCode} {classInfo.subjectName}
            </Text>
            <Text style={styles.classCardSubtitle}>{classInfo.studentCount} students</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
        </TouchableOpacity>

        <View style={styles.examSwitch}>
          <TouchableOpacity
            style={[styles.examSwitchButton, examTab === "cia1" && styles.examSwitchButtonActive]}
            onPress={() => setExamTab("cia1")}
          >
            <Text style={[styles.examSwitchText, examTab === "cia1" && styles.examSwitchTextActive]}>CIA-1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.examSwitchButton, examTab === "cia2" && styles.examSwitchButtonActive]}
            onPress={() => setExamTab("cia2")}
          >
            <Text style={[styles.examSwitchText, examTab === "cia2" && styles.examSwitchTextActive]}>CIA-2</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            Max {classInfo.maxMarks} · {enteredCount} entered
          </Text>
          <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll} activeOpacity={0.85}>
            <Text style={styles.clearAllButtonText}>Clear all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.studentList}>
          {mockCiaStudents.map((student, index) => (
            <View
              key={student.id}
              style={[styles.studentRow, index < mockCiaStudents.length - 1 && styles.studentRowDivider]}
            >
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>{String(index + 1).padStart(2, "0")}</Text>
              </View>
              <View style={styles.studentTextWrap}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentRoll}>{student.rollNo}</Text>
              </View>
              <TextInput
                style={styles.markInput}
                value={currentMarks[student.id] ?? ""}
                onChangeText={(text) => handleChangeMark(student.id, text)}
                placeholder="–"
                placeholderTextColor="#B0B7C3"
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>Save CIA Marks</Text>
        </TouchableOpacity>
      </ScrollView>
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
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  classCardTextWrap: {
    flex: 1,
  },
  classCardTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  classCardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  examSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  examSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 10,
  },
  examSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  examSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  examSwitchTextActive: {
    color: "#fff",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  clearAllButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  clearAllButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  studentList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  studentRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#6B7280",
  },
  studentTextWrap: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  studentRoll: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  markInput: {
    width: 56,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    textAlign: "center",
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 16,
    paddingVertical: 16,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
