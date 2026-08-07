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
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getMyDepartment,
  getMyDepartmentBatches,
  getSubjectsForBatch,
  getDepartmentFaculty,
  assignFaculty,
  clearAssignment,
  type HodDepartment,
  type MappingBatch,
  type MappingSubject,
  type FacultyOption,
} from "@/services/api/hod-faculty-mapping.api";

type LoadStatus = "loading" | "success" | "error";

function initialsFromName(name: string) {
  return name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// HoD-facing "Assigned Faculty" dashboard for their own department. Shows
// every real subject a class in the selected batch actually has
// (class_subjects), each with its currently assigned faculty (if any) -
// tapping a row opens a picker over the department's real faculty roster.
// Reachable from the HoD dashboard's "Assign Faculty" item.
export function AssignFacultyScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");

  const [deptStatus, setDeptStatus] = useState<LoadStatus>("loading");
  const [department, setDepartment] = useState<HodDepartment | null>(null);

  const [batchesStatus, setBatchesStatus] = useState<LoadStatus>("loading");
  const [batches, setBatches] = useState<MappingBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [batchPickerOpen, setBatchPickerOpen] = useState(false);

  const [subjectsStatus, setSubjectsStatus] = useState<LoadStatus>("loading");
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<MappingSubject[]>([]);

  const [facultyOptionsStatus, setFacultyOptionsStatus] = useState<LoadStatus>("loading");
  const [facultyOptionsError, setFacultyOptionsError] = useState<string | null>(null);
  const [facultyOptions, setFacultyOptions] = useState<FacultyOption[]>([]);
  const [pickerSubject, setPickerSubject] = useState<MappingSubject | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const loadFacultyOptions = useCallback((departmentId: number) => {
    setFacultyOptionsStatus("loading");
    setFacultyOptionsError(null);
    getDepartmentFaculty(departmentId)
      .then((rows) => {
        setFacultyOptions(rows);
        setFacultyOptionsStatus("success");
      })
      .catch((err) => {
        setFacultyOptionsError(getApiErrorMessage(err, "Couldn't load faculty."));
        setFacultyOptionsStatus("error");
      });
  }, []);

  useEffect(() => {
    setDeptStatus("loading");
    getMyDepartment()
      .then((dept) => {
        setDepartment(dept);
        setDeptStatus("success");
        loadFacultyOptions(dept.id);
      })
      .catch(() => setDeptStatus("error"));
  }, [loadFacultyOptions]);

  const loadBatches = useCallback(() => {
    setBatchesStatus("loading");
    getMyDepartmentBatches()
      .then((rows) => {
        setBatches(rows);
        setBatchesStatus("success");
        if (rows.length > 0) {
          setSelectedBatchId((current) => current ?? rows[0].id);
        }
      })
      .catch(() => setBatchesStatus("error"));
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const loadSubjects = useCallback(() => {
    if (selectedBatchId === null) return;
    setSubjectsStatus("loading");
    setSubjectsError(null);
    getSubjectsForBatch(selectedBatchId, search.trim())
      .then((rows) => {
        setSubjects(rows);
        setSubjectsStatus("success");
      })
      .catch((err) => {
        setSubjectsError(getApiErrorMessage(err, "Couldn't load subjects."));
        setSubjectsStatus("error");
      });
  }, [selectedBatchId, search]);

  useEffect(() => {
    const timer = setTimeout(loadSubjects, 300);
    return () => clearTimeout(timer);
  }, [loadSubjects]);

  const selectedBatchName = useMemo(
    () => batches.find((b) => b.id === selectedBatchId)?.name ?? "",
    [batches, selectedBatchId],
  );

  function handlePickBatch(batchId: number) {
    setSelectedBatchId(batchId);
    setBatchPickerOpen(false);
  }

  function handleAssign(facultyId: number | null) {
    if (!pickerSubject || saving) return;
    setSaving(true);

    const action = facultyId
      ? assignFaculty({
          existingMappingId: pickerSubject.assigned_faculty?.mapping_id ?? null,
          existingAcademicYear: pickerSubject.assigned_faculty?.academic_year ?? null,
          facultyId,
          subjectId: pickerSubject.subject.id,
          classId: pickerSubject.class.id,
        })
      : pickerSubject.assigned_faculty
        ? clearAssignment(pickerSubject.assigned_faculty.mapping_id)
        : Promise.resolve();

    action
      .then(() => {
        toast.success(
          facultyId ? `Faculty assigned to ${pickerSubject.subject.name}` : "Assignment cleared",
        );
        setPickerSubject(null);
        loadSubjects();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't update this assignment.")))
      .finally(() => setSaving(false));
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
          <Text style={styles.headerTitle}>Assigned Faculty</Text>
          <Text style={styles.headerSubtitle}>
            {deptStatus === "success" && department ? department.name : "Faculty-subject assignments"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {deptStatus === "success" && department && (
          <View style={styles.deptCard}>
            <View style={styles.deptIconWrap}>
              <Ionicons name="business-outline" size={16} color="#2F6FE0" />
            </View>
            <View style={styles.deptTextWrap}>
              <Text style={styles.deptTitle}>{department.name}</Text>
              <Text style={styles.deptSubtitle}>
                {department.code} · Head of Department
              </Text>
            </View>
          </View>
        )}

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9AA6B2" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by subject name"
            placeholderTextColor="#9AA6B2"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {batchesStatus === "success" && batches.length > 0 && (
          <TouchableOpacity
            style={styles.batchButton}
            activeOpacity={0.8}
            onPress={() => setBatchPickerOpen(true)}
          >
            <Ionicons name="layers-outline" size={16} color="#2F6FE0" />
            <Text style={styles.batchButtonText} numberOfLines={1}>
              {selectedBatchName}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#B0B7C3" />
          </TouchableOpacity>
        )}

        {batchesStatus === "success" && batches.length === 0 && (
          <Text style={styles.emptyInlineText}>No batches found for your department.</Text>
        )}

        {subjectsStatus === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {subjectsStatus === "error" && (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{subjectsError}</Text>
            <TouchableOpacity onPress={loadSubjects} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {subjectsStatus === "success" && subjects.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No subjects found</Text>
          </View>
        )}

        {subjectsStatus === "success" &&
          subjects.map((item) => {
            const assigned = item.assigned_faculty;
            return (
              <View key={item.class_subject_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.subject.name}</Text>
                  <View style={[styles.statusBadge, !assigned && styles.statusBadgeUnassigned]}>
                    <Text style={[styles.statusBadgeText, !assigned && styles.statusBadgeTextUnassigned]}>
                      {assigned ? "Assigned" : "Unassigned"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardSubtitle2}>
                  {item.subject.subject_code} · {item.class.label}
                </Text>

                <TouchableOpacity
                  style={styles.facultyRow}
                  onPress={() => setPickerSubject(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.facultyAvatar, !assigned && styles.facultyAvatarEmpty]}>
                    <Text style={styles.facultyAvatarText}>
                      {assigned ? initialsFromName(assigned.name) : "–"}
                    </Text>
                  </View>
                  <Text style={[styles.facultyName, !assigned && styles.facultyNamePlaceholder]}>
                    {assigned ? assigned.name : "Select a faculty member"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
                </TouchableOpacity>
              </View>
            );
          })}
      </ScrollView>

      <Modal visible={batchPickerOpen} transparent animationType="fade" onRequestClose={() => setBatchPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBatchPickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Select Batch</Text>
            <ScrollView style={styles.modalList}>
              {batches.map((batch) => (
                <TouchableOpacity
                  key={batch.id}
                  style={styles.modalOptionRow}
                  onPress={() => handlePickBatch(batch.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalOptionName}>{batch.name}</Text>
                  {batch.id === selectedBatchId && (
                    <Ionicons name="checkmark" size={18} color="#2F6FE0" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={pickerSubject !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPickerSubject(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerSubject(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>{pickerSubject?.subject.name}</Text>
            <Text style={styles.modalSubtitle}>Select a faculty member</Text>

            <ScrollView style={styles.modalList}>
              {facultyOptionsStatus === "loading" && (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator color="#2F6FE0" />
                </View>
              )}

              {facultyOptionsStatus === "error" && (
                <View style={styles.errorNotice}>
                  <Text style={styles.errorNoticeText}>{facultyOptionsError}</Text>
                  <TouchableOpacity
                    onPress={() => department && loadFacultyOptions(department.id)}
                    style={styles.retryButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {facultyOptionsStatus === "success" && facultyOptions.length === 0 && (
                <Text style={styles.emptyInlineText}>No faculty found in your department.</Text>
              )}

              {facultyOptionsStatus === "success" && facultyOptions.map((option) => {
                const selected = pickerSubject?.assigned_faculty?.id === option.id;
                const name = `${option.first_name} ${option.last_name}`;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.modalOptionRow}
                    onPress={() => handleAssign(option.id)}
                    activeOpacity={0.8}
                    disabled={saving}
                  >
                    <View style={styles.modalOptionAvatar}>
                      <Text style={styles.modalOptionAvatarText}>{initialsFromName(name)}</Text>
                    </View>
                    <Text style={styles.modalOptionName}>{name}</Text>
                    {selected && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {pickerSubject?.assigned_faculty && (
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => handleAssign(null)}
                activeOpacity={0.8}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#DC2626" size="small" />
                ) : (
                  <Text style={styles.modalClearButtonText}>Clear assignment</Text>
                )}
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  deptCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  deptIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  deptTextWrap: {
    flex: 1,
  },
  deptTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  deptSubtitle: {
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
    marginBottom: 10,
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
  batchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  batchButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
    maxWidth: 200,
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
  emptyInlineText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 16,
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  cardSubtitle2: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: "#E4EBFB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeUnassigned: {
    backgroundColor: "#F1F3F6",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statusBadgeTextUnassigned: {
    color: "#6B7280",
  },
  facultyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  facultyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  facultyAvatarEmpty: {
    backgroundColor: "#F1F3F6",
  },
  facultyAvatarText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  facultyName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  facultyNamePlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.regular,
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
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
    marginBottom: 12,
  },
  modalList: {
    marginBottom: 8,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionAvatarText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  modalOptionName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  modalClearButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  modalClearButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#DC2626",
  },
});
