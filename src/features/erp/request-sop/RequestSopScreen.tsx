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
import { sopServiceTypes, mockSopHistory, type SopRequest } from "./data/mockRequestSop";

type Tab = "new" | "history";

// TODO: this is a raise+history UI over mockRequestSop - wire to a real
// facilities backend endpoint once one exists. Reachable from the
// Secretary dashboard's "Request SOP" item.
export function RequestSopScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("new");
  const [serviceType, setServiceType] = useState(sopServiceTypes[0]);
  const [location, setLocation] = useState("");
  const [units, setUnits] = useState("");
  const [neededBy, setNeededBy] = useState<Date | null>(null);
  const [complaintDetails, setComplaintDetails] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(2026);
  const [pickerMonth, setPickerMonth] = useState(7); // August (0-indexed)
  const [history, setHistory] = useState(mockSopHistory);

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
    setNeededBy(new Date(pickerYear, pickerMonth, day));
    setDatePickerOpen(false);
  }

  function handleAttachment() {
    toast.info("Photo attachments are coming soon");
  }

  function resetForm() {
    setServiceType(sopServiceTypes[0]);
    setLocation("");
    setUnits("");
    setNeededBy(null);
    setComplaintDetails("");
  }

  function handleSubmit() {
    if (!location.trim()) {
      toast.warning("Add the location");
      return;
    }
    if (!units.trim()) {
      toast.warning("Add the number of units");
      return;
    }
    if (!neededBy) {
      toast.warning("Select a needed-by date");
      return;
    }
    if (!complaintDetails.trim()) {
      toast.warning("Add the complaint details");
      return;
    }

    const newRequest: SopRequest = {
      id: `local-${history.length}-${Date.now()}`,
      serviceType,
      location: location.trim(),
      units: units.trim(),
      neededBy: formatDate(neededBy),
      complaintDetails: complaintDetails.trim(),
      ref: `SOP/CSE/2026/${String(15 + history.length).padStart(3, "0")}`,
      raisedOn: formatDate(new Date()),
      status: "pending",
    };
    setHistory((prev) => [newRequest, ...prev]);
    toast.success("Service request raised");
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
          <Text style={styles.headerTitle}>Request SOP</Text>
          <Text style={styles.headerSubtitle}>Service order · maintenance work</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "new" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("new")}
          >
            <Text style={[styles.tabSwitchText, tab === "new" && styles.tabSwitchTextActive]}>New request</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabSwitchButton, tab === "history" && styles.tabSwitchButtonActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.tabSwitchText, tab === "history" && styles.tabSwitchTextActive]}>
              History ({history.length})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "new" ? (
          <>
            <Text style={styles.sectionTitle}>New Service Request</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Service Needed</Text>
              <View style={styles.chipRow}>
                {sopServiceTypes.map((type) => {
                  const selected = serviceType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setServiceType(type)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Server room · Block C, second floor"
                placeholderTextColor="#9AA6B2"
                value={location}
                onChangeText={setLocation}
              />

              <View style={styles.rowFields}>
                <View style={styles.rowField}>
                  <Text style={styles.fieldLabel}>Units</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 6"
                    placeholderTextColor="#9AA6B2"
                    value={units}
                    onChangeText={(text) => setUnits(text.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.rowField}>
                  <Text style={styles.fieldLabel}>Needed By</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setDatePickerOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={14} color="#2F6FE0" />
                    <Text style={[styles.dateButtonText, !neededBy && styles.dateButtonPlaceholder]}>
                      {neededBy ? formatDate(neededBy) : "Select date"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Complaint Details</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Two ACs not cooling, gas top-up needed before the semester exams"
                placeholderTextColor="#9AA6B2"
                value={complaintDetails}
                onChangeText={setComplaintDetails}
                multiline
              />

              <TouchableOpacity style={styles.attachButton} onPress={handleAttachment} activeOpacity={0.8}>
                <Ionicons name="cloud-upload-outline" size={18} color="#2F6FE0" />
                <Text style={styles.attachButtonText}>Attach a photo of the fault (optional)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={styles.submitButtonText}>Raise Service Request</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No requests raised yet</Text>
          </View>
        ) : (
          history.map((item) => <HistoryCard key={item.id} item={item} />)
        )}
      </ScrollView>

      <Modal
        visible={datePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDatePickerOpen(false)}>
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

function HistoryCard({ item }: { item: SopRequest }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyItem}>{item.serviceType}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "forwarded" && styles.statusBadgeForwarded,
            item.status === "returned" && styles.statusBadgeReturned,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              item.status === "forwarded" && styles.statusBadgeTextForwarded,
              item.status === "returned" && styles.statusBadgeTextReturned,
            ]}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.historyRef}>
        {item.ref} · {item.raisedOn}
      </Text>
      <Text style={styles.historySpec}>{item.location}</Text>
      <Text style={styles.historyComplaint}>{item.complaintDetails}</Text>
      <Text style={styles.historyMeta}>
        {item.units} unit{Number(item.units) === 1 ? "" : "s"} · Needed by {item.neededBy}
      </Text>
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  chipTextSelected: {
    color: "#fff",
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
  },
  rowFields: {
    flexDirection: "row",
    gap: 10,
  },
  rowField: {
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
    marginBottom: 14,
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
  historyItem: {
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
  statusBadgeForwarded: {
    backgroundColor: "#F0FDF4",
  },
  statusBadgeReturned: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statusBadgeTextForwarded: {
    color: "#16A34A",
  },
  statusBadgeTextReturned: {
    color: "#DC2626",
  },
  historyRef: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
    marginBottom: 8,
  },
  historySpec: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  historyComplaint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#374151",
    marginTop: 4,
  },
  historyMeta: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#6B7280",
    marginTop: 6,
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
