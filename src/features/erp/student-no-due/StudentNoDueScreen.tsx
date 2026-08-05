import { useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { mockSubjectClearance, type SubjectClearance } from "./data/mockStudentNoDue";

const COLUMNS: { key: "a1" | "a2" | "a3" | "record"; label: string }[] = [
  { key: "a1", label: "A1" },
  { key: "a2", label: "A2" },
  { key: "a3", label: "A3" },
  { key: "record", label: "Record" },
];

// TODO: this is a view-only clearance grid over mockStudentNoDue - wire to a
// real no-due backend endpoint once one exists. This is the student's own
// subject-wise status, distinct from the Class Advisor's fee-clearance
// review screen (see erp/no-due).
export function StudentNoDueScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const pendingSubjects = useMemo(
    () => mockSubjectClearance.filter((s) => !s.a1 || !s.a2 || !s.a3 || !s.record),
    [],
  );

  function handleRequestClearance() {
    if (pendingSubjects.length === 0) {
      toast.success("All subjects are already cleared");
      return;
    }
    toast.success(`Clearance request sent for ${pendingSubjects.length} pending item${pendingSubjects.length > 1 ? "s" : ""}`);
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
        <Text style={styles.headerTitle}>No-Due Clearance</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.statusPill}>
              <Ionicons name="checkmark" size={14} color="#2F6FE0" />
            </View>
            <Text style={styles.legendLabel}>Cleared</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.statusPill, styles.statusPillPending]}>
              <Ionicons name="close" size={14} color="#1E3A8A" />
            </View>
            <Text style={styles.legendLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, styles.subjectCol]}>Subject</Text>
            {COLUMNS.map((col) => (
              <Text key={col.key} style={[styles.tableHeaderText, styles.statusCol]}>
                {col.label}
              </Text>
            ))}
          </View>
          {mockSubjectClearance.map((subject, index) => (
            <SubjectRow key={subject.code} subject={subject} isLast={index === mockSubjectClearance.length - 1} />
          ))}
        </View>

        <View style={styles.keyList}>
          {mockSubjectClearance.map((subject) => (
            <Text key={subject.code} style={styles.keyRow}>
              <Text style={styles.keyCode}>{subject.code}</Text>
              <Text style={styles.keyDash}> — </Text>
              <Text style={styles.keyName}>{subject.name}</Text>
            </Text>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, pendingSubjects.length === 0 && styles.submitButtonDisabled]}
          onPress={handleRequestClearance}
          activeOpacity={0.85}
        >
          <Text style={styles.submitButtonText}>
            {pendingSubjects.length > 0
              ? `Request clearance for ${pendingSubjects.length} pending item${pendingSubjects.length > 1 ? "s" : ""}`
              : "All subjects cleared"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SubjectRow({ subject, isLast }: { subject: SubjectClearance; isLast: boolean }) {
  return (
    <View style={[styles.tableRow, isLast && styles.tableRowLast]}>
      <Text style={[styles.subjectCode, styles.subjectCol]}>{subject.code}</Text>
      {COLUMNS.map((col) => (
        <View key={col.key} style={styles.statusCol}>
          <View style={[styles.statusPill, !subject[col.key] && styles.statusPillPending]}>
            <Ionicons
              name={subject[col.key] ? "checkmark" : "close"}
              size={14}
              color={subject[col.key] ? "#2F6FE0" : "#1E3A8A"}
            />
          </View>
        </View>
      ))}
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
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendLabel: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  statusPill: {
    width: 30,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillPending: {
    backgroundColor: "#C7D2E8",
  },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
  },
  tableHeaderText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  subjectCol: {
    flex: 1.2,
  },
  statusCol: {
    flex: 1,
    alignItems: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  subjectCode: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  keyList: {
    marginBottom: 20,
    gap: 6,
  },
  keyRow: {
    fontSize: 13,
  },
  keyCode: {
    fontFamily: fonts.bold,
    color: "#111827",
  },
  keyDash: {
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  keyName: {
    fontFamily: fonts.regular,
    color: "#9AA6B2",
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
  submitButtonDisabled: {
    backgroundColor: "#B7CBE6",
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
