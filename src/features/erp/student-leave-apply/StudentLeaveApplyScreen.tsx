import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { createMyLeave, listMyLeaves, type LeaveStatus, type MyLeave } from "@/services/api/leaves.api";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES, formatDate } from "@/utils/calendar";

type Tab = "apply" | "history";
type DateField = "start" | "end" | null;
type LoadStatus = "loading" | "success" | "error";

const REASON_MAX = 200;

const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Pending",
  faculty_approved: "Faculty approved",
  hod_approved: "HOD approved",
  rejected: "Rejected",
};

const STATUS_STYLE: Record<LeaveStatus, { bg: string; text: string }> = {
  pending: { bg: "#EAF0FD", text: "#2F6FE0" },
  faculty_approved: { bg: "#EAF0FD", text: "#2F6FE0" },
  hod_approved: { bg: "#F0FDF4", text: "#16A34A" },
  rejected: { bg: "#FEF2F2", text: "#DC2626" },
};

function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isBeforeToday(date: Date, today: Date): boolean {
  return (
    date.getFullYear() < today.getFullYear() ||
    (date.getFullYear() === today.getFullYear() && date.getMonth() < today.getMonth()) ||
    (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() < today.getDate())
  );
}

// Wired to POST/GET /me/leaves (real student_leaves rows, two-stage
// faculty-then-HOD approval). This is the student's own self-service
// application, distinct from the Class Advisor's review screen (see
// erp/student-leave) and the employee's own leave request (see
// erp/leave-request). There is no attachment/hostel-leave column on
// student_leaves, so those mockup fields aren't wired to anything real.
export function StudentLeaveApplyScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [tab, setTab] = useState<Tab>("apply");
  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);
  const [reason, setReason] = useState("");
  const [hostelLeave, setHostelLeave] = useState(false);
  const [attached, setAttached] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [datePickerFor, setDatePickerFor] = useState<DateField>(null);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());

  const [historyStatus, setHistoryStatus] = useState<LoadStatus>("loading");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<MyLeave[]>([]);

  const loadHistory = useCallback(() => {
    setHistoryStatus("loading");
    setHistoryError(null);
    listMyLeaves()
      .then((response) => {
        setHistory(response.data);
        setHistoryStatus("success");
      })
      .catch((err) => {
        setHistoryError(getApiErrorMessage(err, "Couldn't load your leave history."));
        setHistoryStatus("error");
      });
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const pickerWeeks = useMemo(() => getCalendarWeeks(pickerYear, pickerMonth), [pickerYear, pickerMonth]);

  const days = useMemo(() => {
    if (!startDateObj || !endDateObj) return 0;
    return Math.round((endDateObj.getTime() - startDateObj.getTime()) / 86400000) + 1;
  }, [startDateObj, endDateObj]);

  function goToPreviousPickerMonth() {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((year) => year - 1);
    } else {
      setPickerMonth((month) => month - 1);
    }
  }

  function goToNextPickerMonth() {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((year) => year + 1);
    } else {
      setPickerMonth((month) => month + 1);
    }
  }

  function handlePickDate(day: number) {
    const picked = new Date(pickerYear, pickerMonth, day);
    if (isBeforeToday(picked, today)) return;
    if (datePickerFor === "start") {
      setStartDateObj(picked);
      if (endDateObj && endDateObj < picked) setEndDateObj(picked);
    } else if (datePickerFor === "end") {
      setEndDateObj(picked);
    }
    setDatePickerFor(null);
  }

  function handleAttachment() {
    setAttached((prev) => !prev);
  }

  function resetForm() {
    setStartDateObj(null);
    setEndDateObj(null);
    setReason("");
    setHostelLeave(false);
    setAttached(false);
  }

  function handleSubmit() {
    if (!startDateObj || !endDateObj) {
      toast.warning("Select a from and to date");
      return;
    }
    if (!reason.trim()) {
      toast.warning("Describe the reason for leave");
      return;
    }

    setIsSubmitting(true);
    createMyLeave({
      from_date: toDateOnly(startDateObj),
      to_date: toDateOnly(endDateObj),
      reason: reason.trim(),
    })
      .then(() => {
        toast.success("Leave request submitted");
        resetForm();
        setTab("history");
        loadHistory();
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't submit your leave request."));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
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
        <Text style={styles.headerTitle}>Leave</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabButton, tab === "apply" && styles.tabButtonActive]}
            onPress={() => setTab("apply")}
          >
            <Text style={[styles.tabButtonText, tab === "apply" && styles.tabButtonTextActive]}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, tab === "history" && styles.tabButtonActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.tabButtonText, tab === "history" && styles.tabButtonTextActive]}>History</Text>
          </TouchableOpacity>
        </View>

        {tab === "apply" ? (
          <View style={styles.card}>
            <View style={styles.rowFields}>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>From date</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setDatePickerFor("start")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                  <Text style={[styles.pickerButtonText, !startDateObj && styles.pickerButtonPlaceholder]}>
                    {startDateObj ? formatDate(startDateObj) : "Select date"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>To date</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setDatePickerFor("end")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                  <Text style={[styles.pickerButtonText, !endDateObj && styles.pickerButtonPlaceholder]}>
                    {endDateObj ? formatDate(endDateObj) : "Select date"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {days > 0 && (
              <Text style={styles.daysHint}>
                {days} day{days > 1 ? "s" : ""}
              </Text>
            )}

            <Text style={styles.fieldLabel}>
              Reason ({reason.length}/{REASON_MAX})
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the reason for leave"
              placeholderTextColor="#9AA6B2"
              value={reason}
              onChangeText={(text) => setReason(text.slice(0, REASON_MAX))}
              maxLength={REASON_MAX}
              multiline
            />

            <TouchableOpacity
              style={styles.hostelCard}
              onPress={() => setHostelLeave((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, hostelLeave && styles.checkboxChecked]}>
                {hostelLeave && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <View style={styles.hostelTextWrap}>
                <Text style={styles.hostelTitle}>Also on hostel leave</Text>
                <Text style={styles.hostelSubtitle}>
                  Tick if you are going home — the warden and the mess are informed and your mess charges
                  are paused for those days.
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Supporting document (optional)</Text>
            <TouchableOpacity style={styles.attachButton} onPress={handleAttachment} activeOpacity={0.8}>
              <Ionicons
                name={attached ? "checkmark-circle" : "cloud-upload-outline"}
                size={16}
                color="#2F6FE0"
              />
              <Text style={styles.attachButtonText}>
                {attached ? "Medical certificate attached" : "Attach medical certificate (optional)"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit request</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : historyStatus === "loading" ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        ) : historyStatus === "error" ? (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{historyError ?? "Something went wrong."}</Text>
            <TouchableOpacity onPress={loadHistory} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No leave history yet</Text>
          </View>
        ) : (
          <View style={styles.historyListCard}>
            {history.map((item, index) => (
              <HistoryRow key={item.id} item={item} isLast={index === history.length - 1} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={datePickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerFor(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDatePickerFor(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.calendarNav}>
              <TouchableOpacity onPress={goToPreviousPickerMonth} style={styles.navButton} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color="#2F6FE0" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthLabel}>
                {MONTH_NAMES[pickerMonth]} {pickerYear}
              </Text>
              <TouchableOpacity onPress={goToNextPickerMonth} style={styles.navButton} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color="#2F6FE0" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label, index) => (
                <Text key={index} style={styles.weekdayLabel}>
                  {label}
                </Text>
              ))}
            </View>

            {pickerWeeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return <View key={dayIndex} style={styles.dayCell} />;
                  }
                  const disabled = isBeforeToday(new Date(pickerYear, pickerMonth, day), today);
                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={styles.dayCell}
                      onPress={() => handlePickDate(day)}
                      disabled={disabled}
                    >
                      <Text style={[styles.dayCellText, disabled && styles.dayCellTextDisabled]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function HistoryRow({ item, isLast }: { item: MyLeave; isLast: boolean }) {
  const statusStyle = STATUS_STYLE[item.status];

  return (
    <View style={[styles.historyRow, isLast && styles.historyRowLast]}>
      <View style={styles.historyTopRow}>
        <View style={styles.historyCol}>
          <Text style={styles.historyColLabel}>FROM</Text>
          <Text style={styles.historyColValue}>{formatDate(new Date(item.from_date))}</Text>
        </View>
        <View style={styles.historyCol}>
          <Text style={styles.historyColLabel}>TO</Text>
          <Text style={styles.historyColValue}>{formatDate(new Date(item.to_date))}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{STATUS_LABEL[item.status]}</Text>
        </View>
      </View>
      {item.reason && <Text style={styles.historyReason}>{item.reason}</Text>}
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
  inlineLoading: {
    paddingVertical: 48,
    alignItems: "center",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 16,
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
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 12,
  },
  tabButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  tabButtonTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#374151",
    marginBottom: 6,
  },
  rowFields: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  rowField: {
    flex: 1,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  pickerButtonPlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.regular,
  },
  daysHint: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginBottom: 14,
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
    marginBottom: 16,
  },
  textArea: {
    height: 110,
    textAlignVertical: "top",
  },
  hostelCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  hostelTextWrap: {
    flex: 1,
  },
  hostelTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  hostelSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
    lineHeight: 17,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#B7CBE6",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  attachButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 15,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#B7CBE6",
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  historyListCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  historyRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  historyRowLast: {
    borderBottomWidth: 0,
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyCol: {
    flex: 1,
  },
  historyColLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  historyColValue: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  historyReason: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
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
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  weekRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  dayCellTextDisabled: {
    color: "#D1D5DB",
  },
});
