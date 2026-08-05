import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import {
  semesters,
  defaultSemester,
  mockInternalsBySemester,
  mockSubjectMarksByInternal,
  type InternalResult,
} from "./data/mockStudentPerformance";

type Tab = "internals" | "semester-exam";

// TODO: this is a view-only results screen over mockStudentPerformance - wire
// to a real academics/results backend endpoint once one exists. Reachable
// from the Student dashboard's "Performance" quick-access item.
export function StudentPerformanceScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [semester, setSemester] = useState(defaultSemester);
  const [semesterPickerOpen, setSemesterPickerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("internals");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const internals = mockInternalsBySemester[semester] ?? [];

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
        <Text style={styles.headerTitle}>Performance</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Semester</Text>
          <TouchableOpacity
            style={styles.selectRow}
            onPress={() => setSemesterPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectValue}>{semester}</Text>
            <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
          </TouchableOpacity>

          <View style={styles.tabSwitch}>
            <TouchableOpacity
              style={[styles.tabButton, tab === "internals" && styles.tabButtonActive]}
              onPress={() => setTab("internals")}
            >
              <Text style={[styles.tabButtonText, tab === "internals" && styles.tabButtonTextActive]}>
                Internals
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, tab === "semester-exam" && styles.tabButtonActive]}
              onPress={() => setTab("semester-exam")}
            >
              <Text style={[styles.tabButtonText, tab === "semester-exam" && styles.tabButtonTextActive]}>
                Semester exam
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {tab === "internals" ? (
          internals.length > 0 ? (
            internals.map((internal) => (
              <InternalCard
                key={internal.id}
                internal={internal}
                expanded={expandedId === internal.id}
                onToggle={() => setExpandedId((prev) => (prev === internal.id ? null : internal.id))}
              />
            ))
          ) : (
            <EmptyState text="Results awaited" subtext="Internal marks for this semester haven't been published yet." />
          )
        ) : (
          <EmptyState text="Results awaited" subtext="Semester exam results haven't been published yet." />
        )}
      </ScrollView>

      <Modal
        visible={semesterPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSemesterPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSemesterPickerOpen(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Semester</Text>
            <ScrollView style={styles.modalList}>
              {semesters.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    setSemester(option);
                    setSemesterPickerOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionName}>{option}</Text>
                  {semester === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function InternalCard({
  internal,
  expanded,
  onToggle,
}: {
  internal: InternalResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const percent = Math.round((internal.marksObtained / internal.marksTotal) * 100);
  const subjects = mockSubjectMarksByInternal[internal.id] ?? [];

  return (
    <View style={styles.internalCard}>
      <TouchableOpacity style={styles.internalHeaderRow} onPress={onToggle} activeOpacity={0.8}>
        <View style={styles.internalBadge}>
          <Text style={styles.internalBadgeText}>{internal.number}</Text>
        </View>
        <View style={styles.internalTextWrap}>
          <Text style={styles.internalTitle}>{internal.title}</Text>
          <Text style={styles.internalSubtitle}>
            {internal.marksObtained} / {internal.marksTotal} · {percent}%
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={20} color="#B0B7C3" />
      </TouchableOpacity>

      {expanded && subjects.length > 0 && (
        <View style={styles.subjectTable}>
          <View style={styles.subjectTableHeaderRow}>
            <Text style={[styles.subjectTableHeaderText, styles.subjectCourseCol]}>COURSE</Text>
            <Text style={[styles.subjectTableHeaderText, styles.subjectMaxCol]}>MAX</Text>
            <Text style={[styles.subjectTableHeaderText, styles.subjectScoredCol]}>SCORED</Text>
          </View>
          {subjects.map((subject, index) => (
            <View
              key={subject.code}
              style={[styles.subjectRow, index === subjects.length - 1 && styles.subjectRowLast]}
            >
              <View style={styles.subjectCourseCol}>
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectCode}>{subject.code}</Text>
              </View>
              <Text style={[styles.subjectMaxText, styles.subjectMaxCol]}>{subject.max}</Text>
              <Text style={[styles.subjectScoredText, styles.subjectScoredCol]}>{subject.scored}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function EmptyState({ text, subtext }: { text: string; subtext: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={32} color="#B0B7C3" />
      <Text style={styles.emptyStateText}>{text}</Text>
      <Text style={styles.emptyStateSubtext}>{subtext}</Text>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
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
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  selectValue: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  tabSwitch: {
    flexDirection: "row",
    gap: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingVertical: 12,
  },
  tabButtonActive: {
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  tabButtonTextActive: {
    color: "#2F6FE0",
    fontFamily: fonts.bold,
  },
  internalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  internalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  internalBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  internalBadgeText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  internalTextWrap: {
    flex: 1,
  },
  internalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  internalSubtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  subjectTable: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  subjectTableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  subjectTableHeaderText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  subjectRowLast: {
    borderBottomWidth: 0,
  },
  subjectCourseCol: {
    flex: 1,
  },
  subjectMaxCol: {
    width: 60,
    textAlign: "center",
  },
  subjectScoredCol: {
    width: 70,
    textAlign: "right",
  },
  subjectName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  subjectCode: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  subjectMaxText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  subjectScoredText: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  emptyStateSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  modalList: {
    marginBottom: 4,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
