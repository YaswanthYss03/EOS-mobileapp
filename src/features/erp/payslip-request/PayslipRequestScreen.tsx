import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import {
  createPayslipRequest,
  listMyPayslipRequests,
  type MyPayslipRequest,
} from "@/services/api/payslip-requests.api";
import { months, years } from "./data/mockPayslipRequest";

type Tab = "apply" | "history";
type PickerField = "month" | "year" | null;
type LoadStatus = "loading" | "success" | "error";

const STATUS_LABEL: Record<MyPayslipRequest["status"], string> = {
  pending: "Pending",
  processed: "Approved",
  rejected: "Rejected",
};

function monthLabelFor(monthString: string): string {
  const [yearStr, monthStr] = monthString.split("-");
  const monthName = months[Number(monthStr) - 1] ?? monthStr;
  return `${monthName} ${yearStr}`;
}

const PURPOSE_MAX = 255;

// Wired to POST /me/payslip-requests and GET /me/payslip-requests (real
// payslip_requests rows). Reachable from the Employee-section "Payslip" item
// on both the Employee/Faculty and HoD dashboards. There is no "remarks"
// column or any financial figures on this entity - only month, an optional
// purpose, status, and (once processed) a file_url. The real status enum is
// pending/processed/rejected ("processed" is shown as "Approved" to match
// this screen's existing badge). The download button opens the real
// file_url once HR has processed the request; there is no download for a
// request that hasn't been processed.
export function PayslipRequestScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("apply");
  const [month, setMonth] = useState<string | null>(null);
  const [year, setYear] = useState("2026");
  const [pickerFor, setPickerFor] = useState<PickerField>(null);
  const [purpose, setPurpose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [historyStatus, setHistoryStatus] = useState<LoadStatus>("loading");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<MyPayslipRequest[]>([]);

  const loadHistory = useCallback(() => {
    setHistoryStatus("loading");
    setHistoryError(null);
    listMyPayslipRequests()
      .then((response) => {
        setHistory(response);
        setHistoryStatus("success");
      })
      .catch((err) => {
        setHistoryError(getApiErrorMessage(err, "Couldn't load your payslip requests."));
        setHistoryStatus("error");
      });
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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

  function handleDownload(item: MyPayslipRequest) {
    if (item.file_url) {
      Linking.openURL(item.file_url);
    }
  }

  function resetForm() {
    setMonth(null);
    setPurpose("");
  }

  function handleSubmit() {
    if (!month) {
      toast.warning("Select a month");
      return;
    }

    const monthNumber = months.indexOf(month) + 1;
    const monthString = `${year}-${String(monthNumber).padStart(2, "0")}`;

    setIsSubmitting(true);
    createPayslipRequest({ month: monthString, purpose: purpose.trim() || undefined })
      .then(() => {
        toast.success("Payslip request submitted");
        resetForm();
        setTab("history");
        loadHistory();
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't submit your payslip request."));
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
            <Text style={styles.sectionTitle}>Request Payslip</Text>
            <View style={styles.card}>
              <View style={styles.rowFields}>
                <View style={styles.rowField}>
                  <Text style={styles.fieldLabel}>Month</Text>
                  <TouchableOpacity
                    style={styles.selectRow}
                    onPress={() => setPickerFor("month")}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.selectValue, !month && styles.selectValuePlaceholder]}
                      numberOfLines={1}
                    >
                      {month ?? "Select month"}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#B0B7C3" />
                  </TouchableOpacity>
                </View>
                <View style={styles.rowField}>
                  <Text style={styles.fieldLabel}>Year</Text>
                  <TouchableOpacity
                    style={styles.selectRow}
                    onPress={() => setPickerFor("year")}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectValue}>{year}</Text>
                    <Ionicons name="chevron-down" size={16} color="#B0B7C3" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Purpose</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Home loan documentation"
                placeholderTextColor="#9AA6B2"
                value={purpose}
                onChangeText={(text) => setPurpose(text.slice(0, PURPOSE_MAX))}
                maxLength={PURPOSE_MAX}
              />

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Request History</Text>
            {historyStatus === "loading" ? (
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
        visible={pickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerFor(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerFor(null)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>{pickerFor === "month" ? "Select Month" : "Select Year"}</Text>
            <ScrollView style={styles.modalList}>
              {(pickerFor === "month" ? months : years).map((option) => {
                const selected = pickerFor === "month" ? month === option : year === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={styles.modalOptionRow}
                    onPress={() => {
                      if (pickerFor === "month") setMonth(option);
                      else setYear(option);
                      setPickerFor(null);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalOptionName}>{option}</Text>
                    {selected && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function HistoryCard({ item, onDownload }: { item: MyPayslipRequest; onDownload: () => void }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyTextWrap}>
        <Text style={styles.historyMonth}>{monthLabelFor(item.month)}</Text>
        <Text style={styles.historyRequestedOn}>Requested {formatDate(new Date(item.requested_at))}</Text>
      </View>

      <View
        style={[
          styles.statusBadge,
          item.status === "processed" && styles.statusBadgeApproved,
          item.status === "rejected" && styles.statusBadgeRejected,
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            item.status === "processed" && styles.statusBadgeTextApproved,
            item.status === "rejected" && styles.statusBadgeTextRejected,
          ]}
        >
          {STATUS_LABEL[item.status]}
        </Text>
      </View>

      {item.file_url && (
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
    color: "#374151",
    marginBottom: 6,
  },
  rowFields: {
    flexDirection: "row",
    gap: 10,
  },
  rowField: {
    flex: 1,
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
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  selectValuePlaceholder: {
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
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
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
  submitButtonDisabled: {
    backgroundColor: "#B7CBE6",
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
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
});
