import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { View, Text, ScrollView, TextInput, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import { getAllHigherEducation, type HigherEducationEntry } from "@/services/api/student-higher-education.api";
import { getInstitutionClasses, type InstitutionClass } from "@/services/api/institution-directory.api";
import { getPlacementBatches, type PlacementBatch } from "@/services/api/placements.api";
import { listDepartments, type Department } from "@/services/api/departments.api";

type LoadStatus = "loading" | "success" | "error";

// Principal-only - every department's students who've registered interest
// in further studies (student_higher_education), all at once by default -
// narrowable via a name/roll-number search plus Batch/Department/Class
// (with Section) filters, same pattern as PrincipalStudentsScreen's own
// search+pills and PlacementsOverviewScreen's Batch->Class narrowing (see
// MentorPlacementsBody there).
export function HigherEducationScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // This screen renders its own header below, so hide the shared
  // CollegeHeader (logo/college name) while it's focused.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const [entries, setEntries] = useState<HigherEducationEntry[] | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [batches, setBatches] = useState<PlacementBatch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<InstitutionClass[]>([]);
  const [batch, setBatch] = useState<PlacementBatch | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [cls, setCls] = useState<InstitutionClass | null>(null);

  const batchPicker = useDropdown();
  const departmentPicker = useDropdown();
  const classPicker = useDropdown();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getPlacementBatches().then(setBatches).catch(() => {});
    listDepartments().then(setDepartments).catch(() => {});
  }, []);

  // Class options narrow by whichever of Batch/Department is already
  // picked, refetched whenever either changes - see
  // PlacementsOverviewScreen's MentorPlacementsBody for the same
  // Batch->Class reset relationship.
  useEffect(() => {
    getInstitutionClasses({ batch_id: batch?.id, department_id: department?.id })
      .then((rows) => {
        setClasses(rows);
        setCls((prev) => (prev && rows.some((r) => r.id === prev.id) ? prev : null));
      })
      .catch(() => {});
  }, [batch, department]);

  // Only the text input debounces (350ms) - filter pills refetch
  // immediately, matching PrincipalStudentsScreen's own split.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    getAllHigherEducation({
      search: search || undefined,
      batch_id: batch?.id,
      department_id: department?.id,
      class_id: cls?.id,
    })
      .then((rows) => {
        setEntries(rows);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load these records."));
        setStatus("error");
      });
  }, [search, batch, department, cls]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Higher Education</Text>
          <Text style={styles.subtitle}>Students pursuing further studies</Text>
        </View>
      </LinearGradient>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#8A93A3" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by student name or roll number"
          placeholderTextColor="#B0B7C3"
          value={searchInput}
          onChangeText={setSearchInput}
          autoCapitalize="none"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#B0B7C3" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.pillsRow}>
        <FilterPill
          label={batch ? batch.name : "Batch"}
          active={!!batch}
          onPress={batchPicker.toggle}
          iconRight="chevron-down"
          anchorRef={batchPicker.anchorRef}
        />
        <FilterPill
          label={department ? department.code : "Department"}
          active={!!department}
          onPress={departmentPicker.toggle}
          iconRight="chevron-down"
          anchorRef={departmentPicker.anchorRef}
        />
        <FilterPill
          label={cls ? classLabel(cls) : "Class"}
          active={!!cls}
          onPress={classPicker.toggle}
          iconRight="chevron-down"
          anchorRef={classPicker.anchorRef}
        />
        {(batch || department || cls) && (
          <TouchableOpacity
            style={styles.clearPill}
            onPress={() => {
              setBatch(null);
              setDepartment(null);
              setCls(null);
            }}
          >
            <Text style={styles.clearPillText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {status === "loading" && <SkeletonListRows count={4} />}

        {status === "error" && <ErrorState message={error ?? "Something went wrong."} onRetry={load} />}

        {status === "success" && entries && entries.length === 0 && (
          <EmptyState icon="ribbon-outline" text="No students have registered interest yet." />
        )}

        {status === "success" && entries?.map((entry) => <EntryCard key={entry.id} entry={entry} />)}
      </ScrollView>

      <AnchoredDropdown
        anchorRef={batchPicker.anchorRef}
        visible={batchPicker.visible}
        onClose={batchPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select a batch</Text>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.modalOptionRow}
            onPress={() => {
              setBatch(null);
              batchPicker.close();
            }}
          >
            <Text style={styles.modalOptionName}>All batches</Text>
            {!batch && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {batches.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.modalOptionRow}
              onPress={() => {
                setBatch(b);
                batchPicker.close();
              }}
            >
              <Text style={styles.modalOptionName}>{b.name}</Text>
              {batch?.id === b.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>

      <AnchoredDropdown
        anchorRef={departmentPicker.anchorRef}
        visible={departmentPicker.visible}
        onClose={departmentPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select a department</Text>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.modalOptionRow}
            onPress={() => {
              setDepartment(null);
              departmentPicker.close();
            }}
          >
            <Text style={styles.modalOptionName}>All departments</Text>
            {!department && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {departments.map((dept) => (
            <TouchableOpacity
              key={dept.id}
              style={styles.modalOptionRow}
              onPress={() => {
                setDepartment(dept);
                departmentPicker.close();
              }}
            >
              <Text style={styles.modalOptionName}>{dept.name}</Text>
              {department?.id === dept.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>

      <AnchoredDropdown
        anchorRef={classPicker.anchorRef}
        visible={classPicker.visible}
        onClose={classPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select a class</Text>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.modalOptionRow}
            onPress={() => {
              setCls(null);
              classPicker.close();
            }}
          >
            <Text style={styles.modalOptionName}>All classes</Text>
            {!cls && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {classes.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.modalOptionRow}
              onPress={() => {
                setCls(c);
                classPicker.close();
              }}
            >
              <Text style={styles.modalOptionName}>{classLabel(c)}</Text>
              {cls?.id === c.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>
    </SafeAreaView>
  );
}

function classLabel(c: InstitutionClass): string {
  const course = c.courses?.code ?? c.departments?.code ?? "Class";
  return `${course} - Section ${c.section}${c.batches ? ` (${c.batches.name})` : ""}`;
}

function FilterPill({
  label,
  active,
  onPress,
  iconRight,
  anchorRef,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  iconRight?: keyof typeof Ionicons.glyphMap;
  anchorRef?: RefObject<View | null>;
}) {
  return (
    <View ref={anchorRef} collapsable={false}>
      <TouchableOpacity style={[styles.pill, active && styles.pillActive]} onPress={onPress} activeOpacity={0.8}>
        <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
        {iconRight && <Ionicons name={iconRight} size={14} color={active ? "#fff" : "#8A93A3"} />}
      </TouchableOpacity>
    </View>
  );
}

function EntryCard({ entry }: { entry: HigherEducationEntry }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.studentName}>{entry.student.name}</Text>
        <Text style={styles.studentMeta}>
          {entry.student.student_id_no}
          {entry.student.section ? ` · Sec ${entry.student.section}` : ""}
          {entry.student.batch_name ? ` · ${entry.student.batch_name}` : ""}
        </Text>
      </View>

      {entry.student.department && (
        <View style={styles.deptBadge}>
          <Text style={styles.deptBadgeText}>{entry.student.department.code}</Text>
        </View>
      )}

      <Text style={styles.courseText}>{entry.preferred_course}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>
          {entry.preferred_country}
          {entry.preferred_university ? ` · ${entry.preferred_university}` : ""}
        </Text>
      </View>

      {entry.remarks && <Text style={styles.remarksText}>{entry.remarks}</Text>}

      <Text style={styles.dateText}>Registered {formatDate(new Date(entry.created_at))}</Text>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name={icon} size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>{text}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>{message}</Text>
      <Pressable onPress={onRetry}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </Pressable>
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
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#D7E2FA",
    marginTop: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    padding: 0,
  },
  // Plain wrapping row, not a horizontal ScrollView - 3 pills + an optional
  // Clear pill comfortably fit or wrap to a second line on any real device
  // width, and this sidesteps a horizontal-ScrollView-plus-collapsable-ref
  // layout/measurement quirk observed on-device (pills rendered as blank,
  // evenly-stretched boxes with neither their label text nor chevron icon
  // visible).
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  pillText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#4B5563",
  },
  pillTextActive: {
    color: "#fff",
  },
  clearPill: {
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearPillText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#E0724F",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    maxHeight: "70%",
  },
  anchoredCard: {
    width: 240,
    maxHeight: 320,
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
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  studentName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  studentMeta: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  deptBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F3F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  deptBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#6B7280",
  },
  courseText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
  remarksText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  dateText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#B0B7C3",
    marginTop: 10,
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  centerStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
});
