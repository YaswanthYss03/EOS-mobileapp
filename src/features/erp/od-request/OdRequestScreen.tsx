import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getCalendarWeeks, WEEKDAY_LABELS, MONTH_NAMES, formatDate } from "@/utils/calendar";
import { odBalance, odTypes, mockOdHistory, type MyOdRequest } from "./data/mockOdRequest";

type Tab = "apply" | "history";
type DateField = "start" | "end" | null;

// TODO: this is an apply+history UI over mockOdRequest - wire to a real
// on-duty backend endpoint once one exists. This is the logged-in
// employee's OWN on-duty application (Employee section), not the HoD's
// approval view of student/faculty OD (see erp/od). Reachable from both
// the Employee/Faculty and HoD dashboards.
export function OdRequestScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("apply");
  const [odType, setOdType] = useState(odTypes[0]);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [place, setPlace] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [purpose, setPurpose] = useState("");
  const [datePickerFor, setDatePickerFor] = useState<DateField>(null);
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMonth, setPickerMonth] = useState(7); // August (0-indexed)
  const [history, setHistory] = useState(mockOdHistory);

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

  const pickerWeeks = useMemo(() => getCalendarWeeks(pickerYear, pickerMonth), [pickerYear, pickerMonth]);

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  }, [startDate, endDate]);

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
    if (datePickerFor === "start") {
      setStartDate(picked);
      if (endDate && endDate < picked) setEndDate(picked);
    } else if (datePickerFor === "end") {
      setEndDate(picked);
    }
    setDatePickerFor(null);
  }

  function handleAttachment() {
    toast.info("File attachments are coming soon");
  }

  function resetForm() {
    setOdType(odTypes[0]);
    setPlace("");
    setStartDate(null);
    setEndDate(null);
    setPurpose("");
  }

  function handleSubmit() {
    if (!place.trim()) {
      toast.warning("Add the place or organisation");
      return;
    }
    if (!startDate || !endDate) {
      toast.warning("Select a start and end date");
      return;
    }
    if (!purpose.trim()) {
      toast.warning("Add the purpose of your on-duty request");
      return;
    }
    const newRequest: MyOdRequest = {
      id: `local-${history.length}-${Date.now()}`,
      odType,
      place: place.trim(),
      fromDate: formatDate(startDate),
      toDate: formatDate(endDate),
      days,
      purpose: purpose.trim(),
      status: "pending",
      appliedOn: formatDate(new Date()),
    };
    setHistory((prev) => [newRequest, ...prev]);
    toast.success("On-duty request submitted");
    resetForm();
    setTab("history");
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
          <Text style={styles.headerTitle}>On Duty</Text>
          <Text style={styles.headerSubtitle}>OD requests & approvals</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceCardAvailed}>
            <Text style={styles.balanceLabelAvailed}>OD Availed</Text>
            <Text style={styles.balanceValueAvailed}>{odBalance.availed} days</Text>
          </View>
          <View style={styles.balanceCardRemaining}>
            <Text style={styles.balanceLabelRemaining}>Remaining</Text>
            <Text style={styles.balanceValueRemaining}>{odBalance.remaining} days</Text>
          </View>
        </View>

        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "apply" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("apply")}
          >
            <Text style={[styles.tabSwitchText, tab === "apply" && styles.tabSwitchTextActive]}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "history" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.tabSwitchText, tab === "history" && styles.tabSwitchTextActive]}>History</Text>
          </TouchableOpacity>
        </View>

        {tab === "apply" ? (
          <>
            <Text style={styles.sectionTitle}>Apply On Duty</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>OD Type</Text>
              <TouchableOpacity
                style={styles.selectRow}
                onPress={() => setTypePickerOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.selectValue}>{odType}</Text>
                <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Place / Organisation</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Anna University, Chennai"
                placeholderTextColor="#9AA6B2"
                value={place}
                onChangeText={setPlace}
              />

              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setDatePickerFor("start")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !startDate && styles.dateButtonPlaceholder]}>
                      {startDate ? formatDate(startDate) : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>End Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setDatePickerFor("end")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !endDate && styles.dateButtonPlaceholder]}>
                      {endDate ? formatDate(endDate) : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {days > 0 && (
                <Text style={styles.daysHint}>
                  {days} day{days > 1 ? "s" : ""}
                </Text>
              )}

              <Text style={styles.fieldLabel}>Purpose</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Purpose of the on-duty request"
                placeholderTextColor="#9AA6B2"
                value={purpose}
                onChangeText={setPurpose}
                multiline
              />

              <TouchableOpacity style={styles.attachButton} onPress={handleAttachment} activeOpacity={0.8}>
                <Ionicons name="attach-outline" size={16} color="#2F6FE0" />
                <Text style={styles.attachButtonText}>Attach supporting document (optional)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={styles.submitButtonText}>Submit OD Request</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No on-duty history yet</Text>
          </View>
        ) : (
          history.map((item) => <HistoryCard key={item.id} item={item} />)
        )}
      </ScrollView>

      <Modal
        visible={typePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTypePickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>OD Type</Text>
            {odTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.modalOptionRow}
                onPress={() => {
                  setOdType(type);
                  setTypePickerOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalOptionName}>{type}</Text>
                {odType === type && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
                  return (
                    <TouchableOpacity key={dayIndex} style={styles.dayCell} onPress={() => handlePickDate(day)}>
                      <Text style={styles.dayCellText}>{day}</Text>
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

function HistoryCard({ item }: { item: MyOdRequest }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyType}>{item.odType}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "approved" && styles.statusBadgeApproved,
            item.status === "rejected" && styles.statusBadgeRejected,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              item.status === "approved" && styles.statusBadgeTextApproved,
              item.status === "rejected" && styles.statusBadgeTextRejected,
            ]}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.historyPlace}>{item.place}</Text>
      <Text style={styles.historyDates}>
        {item.fromDate} → {item.toDate} · {item.days} day{item.days > 1 ? "s" : ""}
      </Text>
      <Text style={styles.historyReason}>{item.purpose}</Text>
      <Text style={styles.historyAppliedOn}>Applied on {item.appliedOn}</Text>
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
  balanceRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  balanceCardAvailed: {
    flex: 1,
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    padding: 14,
  },
  balanceLabelAvailed: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#D7E2FA",
  },
  balanceValueAvailed: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#fff",
    marginTop: 4,
  },
  balanceCardRemaining: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  balanceLabelRemaining: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  balanceValueRemaining: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#111827",
    marginTop: 4,
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
  tabSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 10,
  },
  tabSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabSwitchTextActive: {
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
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
    color: "#2F6FE0",
    marginBottom: 6,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  selectValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
    marginBottom: 0,
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateCol: {
    flex: 1,
  },
  dateButton: {
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
  dateButtonText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  dateButtonPlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.regular,
  },
  daysHint: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#2F6FE0",
    marginTop: 6,
    marginBottom: 14,
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
  submitButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  historyCard: {
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
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  historyType: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  statusBadge: {
    backgroundColor: "#E4EBFB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeApproved: {
    backgroundColor: "#F0FDF4",
  },
  statusBadgeRejected: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statusBadgeTextApproved: {
    color: "#16A34A",
  },
  statusBadgeTextRejected: {
    color: "#DC2626",
  },
  historyPlace: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
    marginTop: 6,
  },
  historyDates: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#4B5563",
    marginTop: 2,
  },
  historyReason: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 4,
  },
  historyAppliedOn: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 8,
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
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
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
});
