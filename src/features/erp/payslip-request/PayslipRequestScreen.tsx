import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { formatDate } from "@/utils/calendar";
import { availableMonths, mockPayslipHistory, type PayslipRequest } from "./data/mockPayslipRequest";

type Tab = "apply" | "history";

// TODO: this is an apply+history UI over mockPayslipRequest - wire to a real
// payroll backend endpoint once one exists. Reachable from the
// Employee-section "Payslip" item on both the Employee/Faculty and HoD
// dashboards.
export function PayslipRequestScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("history");
  const [month, setMonth] = useState<string | null>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [history, setHistory] = useState(mockPayslipHistory);

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

  function handleDownload(item: PayslipRequest) {
    toast.info(`Downloading ${item.monthLabel} payslip is coming soon`);
  }

  function handleSubmit() {
    if (!month) {
      toast.warning("Select a month");
      return;
    }
    const newRequest: PayslipRequest = {
      id: `local-${history.length}-${Date.now()}`,
      monthLabel: month,
      requestedOn: formatDate(new Date()),
      status: "pending",
    };
    setHistory((prev) => [newRequest, ...prev]);
    toast.success("Payslip request submitted");
    setMonth(null);
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
          <Text style={styles.headerTitle}>Payslip Request</Text>
          <Text style={styles.headerSubtitle}>Salary slips & archives</Text>
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
            <Text style={styles.sectionTitle}>New Payslip Request</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Select Month</Text>
              <TouchableOpacity
                style={styles.selectRow}
                onPress={() => setMonthPickerOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.selectValue, !month && styles.selectValuePlaceholder]}>
                  {month ?? "Select month"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Request History</Text>
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No payslip requests yet</Text>
              </View>
            ) : (
              history.map((item) => (
                <HistoryCard key={item.id} item={item} onDownload={() => handleDownload(item)} />
              ))
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={monthPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMonthPickerOpen(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Select Month</Text>
            {availableMonths.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOptionRow}
                onPress={() => {
                  setMonth(option);
                  setMonthPickerOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalOptionName}>{option}</Text>
                {month === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function HistoryCard({ item, onDownload }: { item: PayslipRequest; onDownload: () => void }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTextWrap}>
        <Text style={styles.historyMonth}>{item.monthLabel}</Text>
        <Text style={styles.historyRequestedOn}>Requested {item.requestedOn}</Text>
      </View>

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

      {item.status === "approved" && (
        <TouchableOpacity style={styles.downloadButton} onPress={onDownload} hitSlop={8}>
          <Ionicons name="download-outline" size={16} color="#2F6FE0" />
        </TouchableOpacity>
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
    marginBottom: 16,
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
  historyTextWrap: {
    flex: 1,
  },
  historyMonth: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  historyRequestedOn: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    color: "#D97706",
  },
  statusBadgeTextApproved: {
    color: "#16A34A",
  },
  statusBadgeTextRejected: {
    color: "#DC2626",
  },
  downloadButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#B7CBE6",
    alignItems: "center",
    justifyContent: "center",
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
});
