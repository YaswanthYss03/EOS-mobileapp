import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { listMyAssignmentStatuses } from "@/services/api/no-due.api";

type CellValue = boolean | null; // null = not tracked (no assignment/status row yet)

type SubjectClearance = {
  subjectId: number;
  code: string;
  name: string;
  a1: CellValue;
  a2: CellValue;
  a3: CellValue;
};

const COLUMNS: { key: "a1" | "a2" | "a3" | "record"; label: string }[] = [
  { key: "a1", label: "A1" },
  { key: "a2", label: "A2" },
  { key: "a3", label: "A3" },
  { key: "record", label: "Record" },
];

type LoadStatus = "loading" | "success" | "error";

// Wired to GET /student-assignment-status (real per-assignment submission
// marks for the caller's own subjects). There is no dedicated "no-due
// clearance" backend concept at all - A1/A2/A3 reflect real
// student_assignment_status rows keyed by assignment sequence_no; "Record"
// has no equivalent anywhere in the schema, so it's always rendered as "not
// tracked" rather than a fabricated checkmark. "Request clearance" has
// nothing to submit to either, so it surfaces an honest not-yet-available
// message instead of a fake success. This is the student's own subject-wise
// status, distinct from the Class Advisor's fee-clearance review screen
// (see erp/no-due).
export function StudentNoDueScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [subjects, setSubjects] = useState<SubjectClearance[]>([]);

  const load = useCallback(() => {
    setStatus("loading");
    listMyAssignmentStatuses()
      .then((rows) => {
        const bySubject = new Map<number, SubjectClearance>();
        for (const row of rows) {
          const { subject } = row.assignment;
          const entry =
            bySubject.get(subject.id) ??
            ({ subjectId: subject.id, code: subject.subject_code, name: subject.name, a1: null, a2: null, a3: null } as SubjectClearance);
          if (row.assignment.sequence_no === 1) entry.a1 = row.is_submitted;
          else if (row.assignment.sequence_no === 2) entry.a2 = row.is_submitted;
          else if (row.assignment.sequence_no === 3) entry.a3 = row.is_submitted;
          bySubject.set(subject.id, entry);
        }
        setSubjects(Array.from(bySubject.values()).sort((a, b) => a.code.localeCompare(b.code)));
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const pendingSubjects = useMemo(
    () => subjects.filter((s) => s.a1 === false || s.a2 === false || s.a3 === false),
    [subjects],
  );

  function handleRequestClearance() {
    toast.info("Clearance requests aren't available yet — check with your class advisor.");
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
          <View style={styles.legendItem}>
            <View style={[styles.statusPill, styles.statusPillUntracked]}>
              <Ionicons name="remove" size={14} color="#9AA6B2" />
            </View>
            <Text style={styles.legendLabel}>Not tracked</Text>
          </View>
        </View>

        {status === "loading" ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        ) : status === "error" ? (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>Couldn't load your subject status.</Text>
            <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : subjects.length === 0 ? (
          <Text style={styles.emptyText}>No subject assignment records yet.</Text>
        ) : (
          <>
            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderText, styles.subjectCol]}>Subject</Text>
                {COLUMNS.map((col) => (
                  <Text key={col.key} style={[styles.tableHeaderText, styles.statusCol]}>
                    {col.label}
                  </Text>
                ))}
              </View>
              {subjects.map((subject, index) => (
                <SubjectRow key={subject.subjectId} subject={subject} isLast={index === subjects.length - 1} />
              ))}
            </View>

            <View style={styles.keyList}>
              {subjects.map((subject) => (
                <Text key={subject.subjectId} style={styles.keyRow}>
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusPill({ value }: { value: CellValue }) {
  if (value === null) {
    return (
      <View style={[styles.statusPill, styles.statusPillUntracked]}>
        <Ionicons name="remove" size={14} color="#9AA6B2" />
      </View>
    );
  }
  return (
    <View style={[styles.statusPill, !value && styles.statusPillPending]}>
      <Ionicons name={value ? "checkmark" : "close"} size={14} color={value ? "#2F6FE0" : "#1E3A8A"} />
    </View>
  );
}

function SubjectRow({ subject, isLast }: { subject: SubjectClearance; isLast: boolean }) {
  return (
    <View style={[styles.tableRow, isLast && styles.tableRowLast]}>
      <Text style={[styles.subjectCode, styles.subjectCol]}>{subject.code}</Text>
      <View style={styles.statusCol}>
        <StatusPill value={subject.a1} />
      </View>
      <View style={styles.statusCol}>
        <StatusPill value={subject.a2} />
      </View>
      <View style={styles.statusCol}>
        <StatusPill value={subject.a3} />
      </View>
      <View style={styles.statusCol}>
        <StatusPill value={null} />
      </View>
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
  statusPillUntracked: {
    backgroundColor: "#F1F3F6",
  },
  inlineLoading: {
    paddingVertical: 32,
    alignItems: "center",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
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
    textAlign: "center",
    marginTop: 16,
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
