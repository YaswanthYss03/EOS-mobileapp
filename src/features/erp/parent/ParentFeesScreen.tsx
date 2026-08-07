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
import { getChildFees } from "@/services/api/parents.api";
import type { FeeStatus, MyFeeDemand, MyFeePayment, MyFeesResponse, PaymentMode } from "@/services/api/fees.api";
import { useParentChildren } from "./useParentChildren";
import { ChildSelector } from "./ChildSelector";

type Tab = "pay" | "history";
type LoadStatus = "loading" | "success" | "error";
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const STATUS_LABEL: Record<FeeStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
};

const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  dd: "DD",
  netbanking: "Net banking",
};

const AMOUNT_STEP = 100;

function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatFeeDate(dateOnly: string): string {
  return new Date(dateOnly).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function demandSubtitle(demand: MyFeeDemand): string {
  return demand.semester !== null ? `Semester ${demand.semester} · ${demand.academic_year}` : demand.academic_year;
}

// Same real GET /me/fees data/UI as the student's own StudentFeesScreen,
// just scoped to the parent's selected child via
// GET /me/children/:studentId/fees - see parents.api.ts. Payment
// collection itself has no gateway wired up yet (same as the student's own
// screen) - "Pay now" stays a stub.
export function ParentFeesScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { status: childrenStatus, error: childrenError, children, selectedChild, setSelectedChildId, reload: reloadChildren } =
    useParentChildren();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MyFeesResponse | null>(null);

  const [tab, setTab] = useState<Tab>("pay");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [amountInputs, setAmountInputs] = useState<Record<number, string>>({});
  const [semester, setSemester] = useState(1);
  const [semesterPickerOpen, setSemesterPickerOpen] = useState(false);

  const load = useCallback((studentId: number) => {
    setStatus("loading");
    setError(null);
    getChildFees(studentId)
      .then((response) => {
        setData(response);
        setStatus("success");
        const realSemesters = response.demands
          .map((fee) => fee.semester)
          .filter((value): value is number => value !== null && SEMESTERS.includes(value));
        if (realSemesters.length > 0) {
          setSemester(Math.max(...realSemesters));
        }
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load this child's fees."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    if (selectedChild) load(selectedChild.id);
  }, [selectedChild, load]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const allDemands = useMemo(() => data?.demands ?? [], [data]);
  const allPayments = useMemo(() => data?.payments ?? [], [data]);

  const demandIdToSemester = useMemo(
    () => new Map(allDemands.map((fee) => [fee.id, fee.semester])),
    [allDemands],
  );

  const demands = useMemo(
    () => allDemands.filter((fee) => fee.semester === semester),
    [allDemands, semester],
  );

  const payments = useMemo(
    () => allPayments.filter((payment) => demandIdToSemester.get(payment.demand_id) === semester),
    [allPayments, semester, demandIdToSemester],
  );

  const summary = useMemo(
    () => ({
      totalPayable: demands.reduce((sum, fee) => sum + fee.total, 0),
      paid: demands.reduce((sum, fee) => sum + fee.paid, 0),
      outstanding: demands.reduce((sum, fee) => sum + fee.due, 0),
    }),
    [demands],
  );

  const payingNowTotal = useMemo(
    () =>
      demands
        .filter((fee) => selectedIds.has(fee.id))
        .reduce((sum, fee) => sum + (parseInt(amountInputs[fee.id] ?? "", 10) || 0), 0),
    [demands, selectedIds, amountInputs],
  );

  function toggleSelected(fee: MyFeeDemand) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fee.id)) {
        next.delete(fee.id);
      } else {
        next.add(fee.id);
        setAmountInputs((amounts) => ({ ...amounts, [fee.id]: String(fee.due) }));
      }
      return next;
    });
  }

  function setAmountFor(feeId: number, value: string) {
    setAmountInputs((prev) => ({ ...prev, [feeId]: value }));
  }

  function adjustAmountFor(feeId: number, due: number, delta: number) {
    setAmountInputs((prev) => {
      const current = parseInt(prev[feeId] ?? "", 10) || 0;
      return { ...prev, [feeId]: String(clamp(current + delta, 0, due)) };
    });
  }

  function setFullDueFor(feeId: number, due: number) {
    setAmountInputs((prev) => ({ ...prev, [feeId]: String(due) }));
  }

  function handlePay() {
    if (payingNowTotal === 0) {
      toast.warning("Select at least one fee and enter an amount");
      return;
    }
    toast.info("Payment gateway integration is coming soon");
  }

  function handleDownloadReceipt(payment: MyFeePayment) {
    toast.info(`Downloading receipt ${payment.receipt_no} is coming soon`);
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
        <Text style={styles.headerTitle}>Fees</Text>
      </LinearGradient>

      {childrenStatus === "loading" && (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      )}

      {childrenStatus === "error" && (
        <View style={styles.errorNotice}>
          <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
          <Text style={styles.errorNoticeText}>{childrenError ?? "Something went wrong."}</Text>
          <TouchableOpacity onPress={reloadChildren} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {childrenStatus === "success" && children.length === 0 && (
        <View style={styles.errorNotice}>
          <Ionicons name="people-outline" size={22} color="#B0B7C3" />
          <Text style={styles.errorNoticeText}>No linked children found</Text>
        </View>
      )}

      {childrenStatus === "success" && selectedChild && status === "loading" && (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      )}

      {childrenStatus === "success" && selectedChild && status === "error" && (
        <View style={styles.errorNotice}>
          <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
          <Text style={styles.errorNoticeText}>{error ?? "Something went wrong."}</Text>
          <TouchableOpacity onPress={() => load(selectedChild.id)} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {childrenStatus === "success" && selectedChild && status === "success" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ChildSelector children={children} selected={selectedChild} onSelect={(c) => setSelectedChildId(c.id)} />

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Semester</Text>
            <TouchableOpacity
              style={styles.selectRow}
              onPress={() => setSemesterPickerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.selectValue}>Semester {semester}</Text>
              <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
            </TouchableOpacity>
            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryValue}>{formatRupees(summary.totalPayable)}</Text>
                <Text style={styles.summaryLabel}>Total payable</Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={[styles.summaryValue, styles.summaryValuePaid]}>{formatRupees(summary.paid)}</Text>
                <Text style={styles.summaryLabel}>Paid</Text>
              </View>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryValue}>{formatRupees(summary.outstanding)}</Text>
                <Text style={styles.summaryLabel}>Outstanding</Text>
              </View>
            </View>
          </View>

          <View style={styles.tabSwitch}>
            <TouchableOpacity
              style={[styles.tabButton, tab === "pay" && styles.tabButtonActive]}
              onPress={() => setTab("pay")}
            >
              <Text style={[styles.tabButtonText, tab === "pay" && styles.tabButtonTextActive]}>Pay fees</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, tab === "history" && styles.tabButtonActive]}
              onPress={() => setTab("history")}
            >
              <Text style={[styles.tabButtonText, tab === "history" && styles.tabButtonTextActive]}>
                Payment history
              </Text>
            </TouchableOpacity>
          </View>

          {tab === "pay" ? (
            demands.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No fees have been raised yet</Text>
              </View>
            ) : (
              <>
                {demands.map((fee) => (
                  <FeeCard
                    key={fee.id}
                    fee={fee}
                    selected={selectedIds.has(fee.id)}
                    amount={amountInputs[fee.id] ?? String(fee.due)}
                    onToggle={() => toggleSelected(fee)}
                    onAmountChange={(value) => setAmountFor(fee.id, value)}
                    onIncrement={() => adjustAmountFor(fee.id, fee.due, AMOUNT_STEP)}
                    onDecrement={() => adjustAmountFor(fee.id, fee.due, -AMOUNT_STEP)}
                    onFullDue={() => setFullDueFor(fee.id, fee.due)}
                  />
                ))}

                <View style={styles.payFooter}>
                  <View>
                    <Text style={styles.payFooterLabel}>Paying now</Text>
                    <Text style={styles.payFooterValue}>{formatRupees(payingNowTotal)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.payNowButton, payingNowTotal === 0 && styles.payNowButtonDisabled]}
                    onPress={handlePay}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.payNowButtonText}>Pay now</Text>
                  </TouchableOpacity>
                </View>
              </>
            )
          ) : payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={32} color="#B0B7C3" />
              <Text style={styles.emptyStateText}>No payments yet</Text>
            </View>
          ) : (
            payments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} onDownload={() => handleDownloadReceipt(payment)} />
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={semesterPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSemesterPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSemesterPickerOpen(false)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Semester</Text>
            <ScrollView style={styles.modalList}>
              {SEMESTERS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalOptionRow}
                  onPress={() => {
                    setSemester(option);
                    setSemesterPickerOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalOptionName}>Semester {option}</Text>
                  {semester === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function FeeCard({
  fee,
  selected,
  amount,
  onToggle,
  onAmountChange,
  onIncrement,
  onDecrement,
  onFullDue,
}: {
  fee: MyFeeDemand;
  selected: boolean;
  amount: string;
  onToggle: () => void;
  onAmountChange: (value: string) => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onFullDue: () => void;
}) {
  const isFullyPaid = fee.status === "paid";
  const showAmountInput = selected && !isFullyPaid;

  return (
    <View style={styles.feeCard}>
      <View style={styles.feeHeaderRow}>
        <TouchableOpacity
          style={[styles.checkbox, selected && styles.checkboxChecked, isFullyPaid && styles.checkboxDone]}
          onPress={onToggle}
          disabled={isFullyPaid}
          hitSlop={8}
        >
          {(selected || isFullyPaid) && (
            <Ionicons name="checkmark" size={14} color={isFullyPaid ? "#16A34A" : "#fff"} />
          )}
        </TouchableOpacity>
        <View style={styles.feeLabelWrap}>
          <Text style={styles.feeLabel}>{fee.fee_structure_name}</Text>
          <Text style={styles.feeSubtitle}>{demandSubtitle(fee)}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{STATUS_LABEL[fee.status]}</Text>
        </View>
      </View>

      <View style={styles.feeStatsRow}>
        <View style={styles.feeStatCell}>
          <Text style={styles.feeStatLabel}>TOTAL</Text>
          <Text style={styles.feeStatValue}>{formatRupees(fee.total)}</Text>
        </View>
        <View style={[styles.feeStatCell, fee.paid > 0 ? styles.feeStatCellActive : styles.feeStatCellMuted]}>
          <Text style={styles.feeStatLabel}>PAID</Text>
          <Text style={[styles.feeStatValue, fee.paid > 0 && styles.feeStatValueActive]}>
            {formatRupees(fee.paid)}
          </Text>
        </View>
        <View style={[styles.feeStatCell, fee.due > 0 ? styles.feeStatCellActive : styles.feeStatCellMuted]}>
          <Text style={styles.feeStatLabel}>DUE</Text>
          <Text style={[styles.feeStatValue, fee.due > 0 && styles.feeStatValueActive]}>
            {formatRupees(fee.due)}
          </Text>
        </View>
      </View>

      {showAmountInput && (
        <View style={styles.amountRow}>
          <Text style={styles.amountPrefix}>₹</Text>
          <View style={styles.amountInputWrap}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(text) => onAmountChange(text.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
            />
            <View style={styles.amountStepper}>
              <TouchableOpacity onPress={onIncrement} hitSlop={4}>
                <Ionicons name="chevron-up" size={14} color="#9AA6B2" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDecrement} hitSlop={4}>
                <Ionicons name="chevron-down" size={14} color="#9AA6B2" />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity onPress={onFullDue} hitSlop={8}>
            <Text style={styles.fullDueLink}>Full due</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function PaymentCard({ payment, onDownload }: { payment: MyFeePayment; onDownload: () => void }) {
  return (
    <View style={styles.paymentCard}>
      <View style={styles.paymentIconWrap}>
        <Text style={styles.paymentIconText}>₹</Text>
      </View>
      <View style={styles.paymentTextWrap}>
        <Text style={styles.paymentTitle}>{payment.fee_structure_name}</Text>
        <Text style={styles.paymentSubtitle}>
          {formatFeeDate(payment.payment_date)}
          {payment.payment_mode ? ` · ${PAYMENT_MODE_LABEL[payment.payment_mode]}` : ""}
          {payment.is_partial ? " · Partial" : ""}
        </Text>
        <Text style={styles.paymentReceiptNo}>Receipt {payment.receipt_no}</Text>
      </View>
      <View style={styles.paymentRight}>
        <Text style={styles.paymentAmount}>{formatRupees(payment.amount_paid)}</Text>
        <TouchableOpacity style={styles.receiptButton} onPress={onDownload} activeOpacity={0.85}>
          <Ionicons name="download-outline" size={14} color="#2F6FE0" />
          <Text style={styles.receiptButtonText}>Receipt</Text>
        </TouchableOpacity>
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginBottom: 8,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectValue: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: "row",
  },
  summaryCol: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  summaryValuePaid: {
    color: "#2F6FE0",
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
  },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
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
  feeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  feeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  checkboxDone: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  feeLabelWrap: {
    flex: 1,
  },
  feeLabel: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  feeSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  feeStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  feeStatCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  feeStatCellActive: {
    backgroundColor: "#EAF0FD",
  },
  feeStatCellMuted: {
    backgroundColor: "#F7F8FA",
  },
  feeStatLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  feeStatValue: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  feeStatValueActive: {
    color: "#2F6FE0",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  amountPrefix: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  amountInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  amountStepper: {
    gap: 2,
  },
  fullDueLink: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  payFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  payFooterLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  payFooterValue: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 2,
  },
  payNowButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  payNowButtonDisabled: {
    backgroundColor: "#B7CBE6",
  },
  payNowButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
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
  paymentIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentIconText: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  paymentTextWrap: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  paymentSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  paymentReceiptNo: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#B0B7C3",
    marginTop: 2,
  },
  paymentRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  paymentAmount: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  receiptButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  receiptButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
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
