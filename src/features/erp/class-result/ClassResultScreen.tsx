import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getMyMentorClasses,
  getMentorClassResult,
  type MentorClass,
  type ClassResult,
  type ClassResultStudent,
} from "@/services/api/class-mentors.api";

type LoadStatus = "loading" | "success" | "error";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Class Mentor's roster view. A faculty only sees this data for classes
// they are the assigned mentor of (via class_mentors) - zero, one, or many.
// Reachable from both the Employee/Faculty and HoD dashboards' "Class
// Result" item.
export function ClassResultScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [classesStatus, setClassesStatus] = useState<LoadStatus>("loading");
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classes, setClasses] = useState<MentorClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const [resultStatus, setResultStatus] = useState<LoadStatus>("loading");
  const [resultError, setResultError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassResult | null>(null);

  const loadClasses = useCallback(() => {
    setClassesStatus("loading");
    setClassesError(null);
    getMyMentorClasses()
      .then((rows) => {
        setClasses(rows);
        setClassesStatus("success");
        if (rows.length > 0) {
          setSelectedClassId((current) => current ?? rows[0].class_id);
        }
      })
      .catch((err) => {
        setClassesError(getApiErrorMessage(err, "Couldn't load your mentored classes."));
        setClassesStatus("error");
      });
  }, []);

  const loadResult = useCallback((classId: number) => {
    setResultStatus("loading");
    setResultError(null);
    getMentorClassResult(classId)
      .then((data) => {
        setResult(data);
        setExpandedId(data.students[0]?.id ?? null);
        setResultStatus("success");
      })
      .catch((err) => {
        setResultError(getApiErrorMessage(err, "Couldn't load this class's roster."));
        setResultStatus("error");
      });
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (selectedClassId !== null) {
      loadResult(selectedClassId);
    }
  }, [selectedClassId, loadResult]);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const filteredStudents = useMemo(() => {
    const students = result?.students ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        (student.register_no ?? "").toLowerCase().includes(query) ||
        student.student_id_no.toLowerCase().includes(query),
    );
  }, [result, search]);

  function toggleExpanded(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handlePickClass(classId: number) {
    setSelectedClassId(classId);
    setPickerOpen(false);
  }

  const hasMultipleClasses = classes.length > 1;

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
          <Text style={styles.headerTitle}>Class Result</Text>
          <Text style={styles.headerSubtitle}>
            {result
              ? `${result.department.name} · ${result.students.length} students`
              : "Class mentor roster"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {classesStatus === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {classesStatus === "error" && (
          <ErrorNotice message={classesError ?? "Something went wrong."} onRetry={loadClasses} />
        )}

        {classesStatus === "success" && classes.length === 0 && (
          <View style={styles.noMentorCard}>
            <View style={styles.noMentorIconWrap}>
              <Ionicons name="people-outline" size={22} color="#9AA6B2" />
            </View>
            <Text style={styles.noMentorTitle}>No Class Mentor Assignment</Text>
            <Text style={styles.noMentorSubtitle}>
              You have not been assigned as a Class Mentor for any section yet. Once your HoD
              assigns you to a class, its roster will appear here.
            </Text>
          </View>
        )}

        {classesStatus === "success" && classes.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.sectionsCard}
              activeOpacity={hasMultipleClasses ? 0.8 : 1}
              onPress={() => hasMultipleClasses && setPickerOpen(true)}
            >
              <View style={styles.sectionsIconWrap}>
                <Ionicons name="people-outline" size={16} color="#2F6FE0" />
              </View>
              <View style={styles.sectionsTextWrap}>
                <Text style={styles.sectionsTitle}>My Class</Text>
                <Text style={styles.sectionsSubtitle} numberOfLines={1}>
                  {result
                    ? result.class.label
                    : classes.find((c) => c.class_id === selectedClassId)?.label ?? ""}
                </Text>
              </View>
              {hasMultipleClasses && <Ionicons name="chevron-down" size={18} color="#B0B7C3" />}
            </TouchableOpacity>

            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color="#9AA6B2" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name or register number"
                placeholderTextColor="#9AA6B2"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {resultStatus === "loading" && (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            )}

            {resultStatus === "error" && (
              <ErrorNotice
                message={resultError ?? "Something went wrong."}
                onRetry={() => selectedClassId !== null && loadResult(selectedClassId)}
              />
            )}

            {resultStatus === "success" && (
              <>
                {filteredStudents.map((student) => (
                  <ClassResultCard
                    key={student.id}
                    student={student}
                    expanded={expandedId === student.id}
                    onToggle={() => toggleExpanded(student.id)}
                  />
                ))}

                {filteredStudents.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={32} color="#B0B7C3" />
                    <Text style={styles.emptyStateText}>No students match "{search}"</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Select Your Class</Text>
            <ScrollView style={styles.modalList}>
              {classes.map((c) => (
                <TouchableOpacity
                  key={c.class_id}
                  style={styles.modalRow}
                  onPress={() => handlePickClass(c.class_id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowText}>{c.label}</Text>
                    <Text style={styles.modalRowSubtext}>{c.department.name}</Text>
                  </View>
                  {c.class_id === selectedClassId && (
                    <Ionicons name="checkmark-circle" size={20} color="#2F6FE0" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorNotice}>
      <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
      <Text style={styles.errorNoticeText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.8}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function ClassResultCard({
  student,
  expanded,
  onToggle,
}: {
  student: ClassResultStudent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const guardianText = student.guardian_name
    ? `${student.guardian_name}${student.guardian_relation ? ` (${student.guardian_relation})` : ""}`
    : "Not on file";

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.8}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(student.name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>{student.name}</Text>
          <Text style={styles.cardSubtitle}>{student.register_no ?? student.student_id_no}</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#B0B7C3" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>ATTENDANCE</Text>
              <Text style={[styles.statValue, styles.statValueBlue]}>
                {student.attendance_percent !== null ? `${student.attendance_percent}%` : "—"}
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>CGPA</Text>
              <Text style={styles.statValue}>
                {student.cgpa !== null ? student.cgpa.toFixed(2) : "—"}
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>ARREARS</Text>
              <Text style={styles.statValue}>{student.arrears}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mentor</Text>
            <Text style={styles.detailValue}>{student.mentor_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Guardian</Text>
            <Text style={styles.detailValue}>{guardianText}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{student.contact ?? "Not on file"}</Text>
          </View>
        </View>
      )}
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
  inlineLoading: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
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
  noMentorCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  noMentorIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  noMentorTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    textAlign: "center",
  },
  noMentorSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
    lineHeight: 18,
  },
  sectionsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  sectionsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionsTextWrap: {
    flex: 1,
  },
  sectionsTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  sectionsSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  cardHeaderTextWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginTop: 3,
  },
  statValueBlue: {
    color: "#2F6FE0",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#2F6FE0",
  },
  detailValue: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
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
    maxHeight: 360,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalRowText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  modalRowSubtext: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
});
