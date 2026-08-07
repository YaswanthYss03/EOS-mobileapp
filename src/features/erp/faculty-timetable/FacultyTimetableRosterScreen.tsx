import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
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
  listTimetableDepartments,
  listFacultyInDepartment,
  getFacultyTimetableRoster,
  type TimetableDepartment,
  type TimetableRosterFaculty,
  type FacultyTimetableRoster,
  type FacultyTimetablePeriod,
} from "@/services/api/faculty-timetable-roster.api";

type LoadStatus = "loading" | "success" | "error";
type PickerStep = "department" | "faculty";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function facultyFullName(faculty: TimetableRosterFaculty) {
  return `${faculty.first_name} ${faculty.last_name}`;
}

function formatTime(hhmm: string): string {
  const [hourStr, minute] = hhmm.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

function classLabel(period: Extract<FacultyTimetablePeriod, { kind: "class" }>): string {
  return `${period.class.department.code}-${period.class.section}`;
}

// Browse-by-department roster for HoD/HR Payroll: pick a department (the
// picker lists each one together with its classes), then a faculty member
// in that department, then see their real weekly timetable - wired to
// GET /me/timetable-departments, GET /me/timetable-departments/:id/faculty
// and GET /me/faculty-timetable-roster/:facultyId. Distinct from the
// faculty/HoD's own self-scoped Timetable screen. timetable_slots has no
// room column, so a period's location is only ever "{dept code}-{section}",
// never a fabricated room number. A period with no real row on a day the
// institution otherwise runs classes renders as a real derived "Free hour"
// (see the backend's period-template comment), not a fabricated free slot.
export function FacultyTimetableRosterScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const todayDow = useMemo(() => new Date().getDay(), []);
  const defaultDayOfWeek = todayDow >= 1 && todayDow <= 6 ? todayDow : 1;

  const [departments, setDepartments] = useState<TimetableDepartment[]>([]);
  const [departmentsStatus, setDepartmentsStatus] = useState<LoadStatus>("loading");

  const [selectedDepartment, setSelectedDepartment] = useState<TimetableDepartment | null>(null);
  const [facultyList, setFacultyList] = useState<TimetableRosterFaculty[]>([]);
  const [facultyListStatus, setFacultyListStatus] = useState<LoadStatus>("success");

  const [selectedFaculty, setSelectedFaculty] = useState<TimetableRosterFaculty | null>(null);
  const [roster, setRoster] = useState<FacultyTimetableRoster | null>(null);
  const [rosterStatus, setRosterStatus] = useState<LoadStatus>("success");
  const [rosterError, setRosterError] = useState<string | null>(null);

  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(defaultDayOfWeek);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerStep, setPickerStep] = useState<PickerStep>("department");

  const loadDepartments = useCallback(() => {
    setDepartmentsStatus("loading");
    listTimetableDepartments()
      .then((rows) => {
        setDepartments(rows);
        setDepartmentsStatus("success");
      })
      .catch(() => setDepartmentsStatus("error"));
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    setPickerVisible(departmentsStatus === "success" && departments.length > 0 && !selectedFaculty);
  }, [departmentsStatus, departments.length, selectedFaculty]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  function openDepartmentPicker() {
    setPickerStep("department");
    setPickerVisible(true);
  }

  function selectDepartment(department: TimetableDepartment) {
    setSelectedDepartment(department);
    setSelectedFaculty(null);
    setRoster(null);
    setFacultyListStatus("loading");
    listFacultyInDepartment(department.id)
      .then((rows) => {
        setFacultyList(rows);
        setFacultyListStatus("success");
      })
      .catch(() => setFacultyListStatus("error"));
    setPickerStep("faculty");
  }

  function selectFaculty(faculty: TimetableRosterFaculty) {
    setSelectedFaculty(faculty);
    setPickerVisible(false);
    setRosterStatus("loading");
    setRosterError(null);
    getFacultyTimetableRoster(faculty.id)
      .then((response) => {
        setRoster(response);
        setRosterStatus("success");
      })
      .catch((err) => {
        setRosterError(getApiErrorMessage(err, "Couldn't load this faculty member's timetable."));
        setRosterStatus("error");
      });
  }

  const selectedDayPeriods = useMemo(
    () => roster?.days.find((d) => d.day_of_week === selectedDayOfWeek)?.periods ?? [],
    [roster, selectedDayOfWeek],
  );
  const freeCount = selectedDayPeriods.filter((p) => p.kind === "free").length;
  const classCount = selectedDayPeriods.length - freeCount;

  const headerSubtitleParts = [
    selectedDepartment ? selectedDepartment.code : null,
    roster?.semester != null ? `Semester ${roster.semester}` : null,
  ].filter((part): part is string => Boolean(part));

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
          <Text style={styles.headerTitle}>Academics</Text>
          <Text style={styles.headerSubtitle}>
            Faculty timetable{headerSubtitleParts.length > 0 ? ` · ${headerSubtitleParts.join(" · ")}` : ""}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {departmentsStatus === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {departmentsStatus === "error" && (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.emptyStateText}>Couldn't load departments.</Text>
            <TouchableOpacity onPress={loadDepartments} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {departmentsStatus === "success" && selectedFaculty && (
          <>
            <TouchableOpacity style={styles.facultyCard} onPress={openDepartmentPicker} activeOpacity={0.8}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFromName(facultyFullName(selectedFaculty))}</Text>
              </View>
              <View style={styles.facultyCardTextWrap}>
                <Text style={styles.facultyCardName}>{facultyFullName(selectedFaculty)}</Text>
                <Text style={styles.facultyCardSubtitle}>{selectedFaculty.designation}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#9AA6B2" />
            </TouchableOpacity>

            <View style={styles.daySelector}>
              {DAY_LABELS.map((label, index) => {
                const dayOfWeek = index + 1;
                const selected = dayOfWeek === selectedDayOfWeek;
                return (
                  <TouchableOpacity
                    key={dayOfWeek}
                    style={[styles.dayPill, selected && styles.dayPillSelected]}
                    onPress={() => setSelectedDayOfWeek(dayOfWeek)}
                  >
                    <Text style={[styles.dayPillLabel, selected && styles.dayPillLabelSelected]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {rosterStatus === "loading" && (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color="#2F6FE0" />
              </View>
            )}

            {rosterStatus === "error" && (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
                <Text style={styles.emptyStateText}>{rosterError ?? "Something went wrong."}</Text>
                <TouchableOpacity
                  onPress={() => selectFaculty(selectedFaculty)}
                  style={styles.retryButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {rosterStatus === "success" && roster && (
              <>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryIconWrap}>
                    <Ionicons name="time-outline" size={18} color="#2F6FE0" />
                  </View>
                  <View style={styles.summaryTextWrap}>
                    <Text style={styles.summaryTitle}>
                      {DAY_FULL_LABELS[selectedDayOfWeek - 1]}
                      {" · "}
                      {classCount} period{classCount === 1 ? "" : "s"}
                      {" · "}
                      {freeCount} free
                    </Text>
                    <Text style={styles.summarySubtitle}>
                      {roster.total_periods_per_week} periods a week
                      {roster.semester != null ? ` · Semester ${roster.semester}` : ""}
                      {roster.academic_year ? ` · ${roster.academic_year}` : ""}
                    </Text>
                  </View>
                </View>

                {selectedDayPeriods.map((period) => (
                  <PeriodCard key={period.period_number} period={period} />
                ))}

                {selectedDayPeriods.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={32} color="#B0B7C3" />
                    <Text style={styles.emptyStateText}>No periods scheduled this day</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {departmentsStatus === "success" && !selectedFaculty && (
          <TouchableOpacity style={styles.facultyCard} onPress={openDepartmentPicker} activeOpacity={0.8}>
            <View style={styles.avatar}>
              <Ionicons name="people-outline" size={18} color="#2F6FE0" />
            </View>
            <View style={styles.facultyCardTextWrap}>
              <Text style={styles.facultyCardName}>Choose a department</Text>
              <Text style={styles.facultyCardSubtitle}>Browse faculty and view their timetable</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#9AA6B2" />
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={pickerVisible && departments.length > 0}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              {pickerStep === "faculty" && (
                <TouchableOpacity onPress={() => setPickerStep("department")} hitSlop={8}>
                  <Ionicons name="arrow-back" size={20} color="#111827" />
                </TouchableOpacity>
              )}
              <Text style={styles.modalTitle}>
                {pickerStep === "department" ? "Select department" : `Faculty · ${selectedDepartment?.code ?? ""}`}
              </Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {pickerStep === "department" &&
                departments.map((department) => (
                  <TouchableOpacity
                    key={department.id}
                    style={styles.modalRow}
                    onPress={() => selectDepartment(department)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.modalRowTitle}>{department.name}</Text>
                    <Text style={styles.modalRowSubtitle}>
                      {department.code}
                      {department.classes.length > 0
                        ? ` · ${department.classes.length} class${department.classes.length === 1 ? "" : "es"} (${department.classes
                            .map((c) => c.section)
                            .join(", ")})`
                        : " · No classes yet"}
                    </Text>
                  </TouchableOpacity>
                ))}

              {pickerStep === "faculty" && facultyListStatus === "loading" && (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator color="#2F6FE0" />
                </View>
              )}

              {pickerStep === "faculty" && facultyListStatus === "error" && (
                <Text style={styles.modalEmptyText}>Couldn't load faculty for this department.</Text>
              )}

              {pickerStep === "faculty" && facultyListStatus === "success" && facultyList.length === 0 && (
                <Text style={styles.modalEmptyText}>No active faculty in this department.</Text>
              )}

              {pickerStep === "faculty" &&
                facultyListStatus === "success" &&
                facultyList.map((faculty) => (
                  <TouchableOpacity
                    key={faculty.id}
                    style={styles.modalRow}
                    onPress={() => selectFaculty(faculty)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.modalFacultyRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initialsFromName(facultyFullName(faculty))}</Text>
                      </View>
                      <View style={styles.facultyCardTextWrap}>
                        <Text style={styles.modalRowTitle}>{facultyFullName(faculty)}</Text>
                        <Text style={styles.modalRowSubtitle}>{faculty.designation}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function PeriodCard({ period }: { period: FacultyTimetablePeriod }) {
  if (period.kind === "free") {
    return (
      <View style={[styles.periodCard, styles.periodCardFree]}>
        <View style={styles.periodTimeCol}>
          <Text style={styles.periodTimeFree}>{formatTime(period.start_time)}</Text>
          <Text style={styles.periodLabel}>Period {period.period_number}</Text>
        </View>
        <View style={styles.periodInfo}>
          <Text style={styles.periodSubjectFree}>Free hour</Text>
          <Text style={styles.periodMeta}>No class allotted</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.periodCard}>
      <View style={styles.periodTimeCol}>
        <Text style={styles.periodTime}>{formatTime(period.start_time)}</Text>
        <Text style={styles.periodLabel}>Period {period.period_number}</Text>
      </View>
      <View style={styles.periodInfo}>
        <Text style={styles.periodSubject}>{period.subject.name}</Text>
        <Text style={styles.periodMeta}>{classLabel(period)}</Text>
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
    paddingVertical: 40,
    alignItems: "center",
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  facultyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  facultyCardTextWrap: {
    flex: 1,
  },
  facultyCardName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  facultyCardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  daySelector: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dayPillSelected: {
    borderColor: "#2F6FE0",
    borderWidth: 1.5,
  },
  dayPillLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  dayPillLabelSelected: {
    color: "#2F6FE0",
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EEF3FC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  summarySubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 2,
  },
  periodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  periodCardFree: {
    backgroundColor: "#FAFAFB",
  },
  periodTimeCol: {
    width: 64,
  },
  periodTime: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  periodTimeFree: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
  },
  periodLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  periodInfo: {
    flex: 1,
  },
  periodSubject: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  periodSubjectFree: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
  },
  periodMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    textAlign: "center",
  },
  modalList: {
    marginTop: 4,
  },
  modalRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalRowTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  modalRowSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 3,
  },
  modalFacultyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalEmptyText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
    paddingVertical: 24,
  },
});
