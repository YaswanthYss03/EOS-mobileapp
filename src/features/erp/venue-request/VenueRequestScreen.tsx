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
import { venues, timeSlots, mockVenueHistory, type VenueBookingRequest } from "./data/mockVenueRequest";

type Tab = "apply" | "history";
type DateField = "from" | "to" | null;
type ListPickerField = "venue" | "fromTime" | "toTime" | null;

// TODO: this is an apply+history UI over mockVenueRequest - wire to a real
// venue-booking backend endpoint once one exists. Reachable from the
// Employee-section "Venue" item on both the Employee/Faculty and HoD
// dashboards.
export function VenueRequestScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("apply");
  const [venueName, setVenueName] = useState<string | null>(null);
  const [fromDateObj, setFromDateObj] = useState<Date | null>(null);
  const [toDateObj, setToDateObj] = useState<Date | null>(null);
  const [fromTime, setFromTime] = useState<string | null>(null);
  const [toTime, setToTime] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [capacity, setCapacity] = useState("");
  const [datePickerFor, setDatePickerFor] = useState<DateField>(null);
  const [listPickerFor, setListPickerFor] = useState<ListPickerField>(null);
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMonth, setPickerMonth] = useState(7); // August (0-indexed)
  const [history, setHistory] = useState(mockVenueHistory);

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

  const listPickerOptions = listPickerFor === "venue" ? venues : listPickerFor ? timeSlots : [];
  const listPickerTitle =
    listPickerFor === "venue" ? "Select Venue" : listPickerFor === "fromTime" ? "From Time" : "To Time";
  const listPickerSelected =
    listPickerFor === "venue" ? venueName : listPickerFor === "fromTime" ? fromTime : toTime;

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
    if (datePickerFor === "from") {
      setFromDateObj(picked);
      if (toDateObj && toDateObj < picked) setToDateObj(picked);
    } else if (datePickerFor === "to") {
      setToDateObj(picked);
    }
    setDatePickerFor(null);
  }

  function handleSelectListOption(value: string) {
    if (listPickerFor === "venue") setVenueName(value);
    else if (listPickerFor === "fromTime") setFromTime(value);
    else if (listPickerFor === "toTime") setToTime(value);
    setListPickerFor(null);
  }

  function resetForm() {
    setVenueName(null);
    setFromDateObj(null);
    setToDateObj(null);
    setFromTime(null);
    setToTime(null);
    setPurpose("");
    setCapacity("");
  }

  function handleSubmit() {
    if (!venueName) {
      toast.warning("Select a venue");
      return;
    }
    if (!fromDateObj || !toDateObj) {
      toast.warning("Select a from and to date");
      return;
    }
    if (!fromTime || !toTime) {
      toast.warning("Select a from and to time");
      return;
    }
    if (!purpose.trim()) {
      toast.warning("Add the purpose of the booking");
      return;
    }
    if (!capacity.trim()) {
      toast.warning("Add the capacity required");
      return;
    }
    const newRequest: VenueBookingRequest = {
      id: `local-${history.length}-${Date.now()}`,
      venueName,
      fromDate: formatDate(fromDateObj),
      toDate: formatDate(toDateObj),
      fromTime,
      toTime,
      purpose: purpose.trim(),
      capacity: capacity.trim(),
      status: "pending",
      appliedOn: formatDate(new Date()),
    };
    setHistory((prev) => [newRequest, ...prev]);
    toast.success("Booking request submitted");
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
          <Text style={styles.headerTitle}>Venue</Text>
          <Text style={styles.headerSubtitle}>Booking requests</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
            <Text style={styles.sectionTitle}>New Venue Request</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Venue Name</Text>
              <TouchableOpacity
                style={styles.selectRow}
                onPress={() => setListPickerFor("venue")}
                activeOpacity={0.8}
              >
                <Text style={[styles.selectValue, !venueName && styles.selectValuePlaceholder]}>
                  {venueName ?? "Select venue"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
              </TouchableOpacity>

              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>From Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setDatePickerFor("from")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !fromDateObj && styles.dateButtonPlaceholder]}>
                      {fromDateObj ? formatDate(fromDateObj) : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>To Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setDatePickerFor("to")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !toDateObj && styles.dateButtonPlaceholder]}>
                      {toDateObj ? formatDate(toDateObj) : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>From Time</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setListPickerFor("fromTime")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !fromTime && styles.dateButtonPlaceholder]}>
                      {fromTime ?? "Select time"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.fieldLabel}>To Time</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setListPickerFor("toTime")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="time-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !toTime && styles.dateButtonPlaceholder]}>
                      {toTime ?? "Select time"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Purpose</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Guest lecture on Deep Learning"
                placeholderTextColor="#9AA6B2"
                value={purpose}
                onChangeText={setPurpose}
              />

              <Text style={styles.fieldLabel}>Capacity Required</Text>
              <TextInput
                style={[styles.input, styles.inputLast]}
                placeholder="e.g. 120"
                placeholderTextColor="#9AA6B2"
                value={capacity}
                onChangeText={(text) => setCapacity(text.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={styles.submitButtonText}>Submit Booking Request</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No booking history yet</Text>
          </View>
        ) : (
          history.map((item) => <HistoryCard key={item.id} item={item} />)
        )}
      </ScrollView>

      <Modal
        visible={listPickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setListPickerFor(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setListPickerFor(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>{listPickerTitle}</Text>
            <ScrollView style={styles.modalList}>
              {listPickerOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOptionRow}
                  onPress={() => handleSelectListOption(option)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionName}>{option}</Text>
                  {listPickerSelected === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
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

function HistoryCard({ item }: { item: VenueBookingRequest }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyType}>{item.venueName}</Text>
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
      <Text style={styles.historyDates}>
        {item.fromDate} · {item.fromTime} → {item.toDate} · {item.toTime}
      </Text>
      <Text style={styles.historyReason}>{item.purpose}</Text>
      <Text style={styles.historyCapacity}>Capacity: {item.capacity}</Text>
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
  selectValuePlaceholder: {
    color: "#9AA6B2",
    fontFamily: fonts.regular,
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
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
  inputLast: {
    marginBottom: 16,
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
  historyDates: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#4B5563",
    marginTop: 6,
  },
  historyReason: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 4,
  },
  historyCapacity: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
  },
  historyAppliedOn: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
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
