import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import RazorpayCheckout from "react-native-razorpay";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonStatCards, SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { downloadPdf } from "@/utils/pdfDownload";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getMyFees,
  createFeePaymentOrder,
  verifyFeePayment,
  downloadFeeReceipt,
  type FeeStatus,
  type MyFeeDemand,
  type MyFeePayment,
  type MyFeesResponse,
  type PaymentMode,
} from "@/services/api/fees.api";

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
  razorpay: "Online",
};

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

function StatusPill({ status }: { status: FeeStatus }) {
  const pillStyle =
    status === "paid"
      ? { bg: styles.pillBgPaid, text: styles.pillTextPaid }
      : status === "partial"
        ? { bg: styles.pillBgPartial, text: styles.pillTextPartial }
        : { bg: styles.pillBgPending, text: styles.pillTextPending };
  return (
    <View style={[styles.pill, pillStyle.bg]}>
      <Text style={[styles.pillText, pillStyle.text]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

function useRotateStyle(expanded: boolean) {
  const anim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: expanded ? 1 : 0, duration: 180, useNativeDriver: true }).start();
  }, [anim, expanded]);
  return { transform: [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] };
}

// Wired to GET /me/fees (real student_fee_demand_mapping + fee_payments
// rows). Each fee item is its own independent accordion now - "Pay now" pays
// just that one demand (no more multi-select-then-pay-together flow); a
// checkbox on each row is a plain paid/unpaid status marker, not a toggle.
// Reachable from the Student dashboard's "Fees" quick-access item.
export function StudentFeesScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MyFeesResponse | null>(null);

  const [tab, setTab] = useState<Tab>("pay");
  const [semester, setSemester] = useState(1);
  const [semesterPickerOpen, setSemesterPickerOpen] = useState(false);
  const [payingFeeId, setPayingFeeId] = useState<number | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<number | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    getMyFees()
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
        setError(getApiErrorMessage(err, "Couldn't load your fees."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const demands = useMemo(
    () => allDemands.filter((fee) => fee.semester === semester),
    [allDemands, semester],
  );

  // History shows every past payment across every semester in one card,
  // newest first - not scoped to the semester strip above (that strip's
  // Total/Paid/Due only ever describes the Pay tab's current semester).
  const demandById = useMemo(() => new Map(allDemands.map((fee) => [fee.id, fee])), [allDemands]);

  const paymentsSorted = useMemo(
    () => [...allPayments].sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1)),
    [allPayments],
  );

  const summary = useMemo(
    () => ({
      totalPayable: demands.reduce((sum, fee) => sum + fee.total, 0),
      paid: demands.reduce((sum, fee) => sum + fee.paid, 0),
      outstanding: demands.reduce((sum, fee) => sum + fee.due, 0),
    }),
    [demands],
  );

  async function handlePayOne(fee: MyFeeDemand, amount: number) {
    if (amount <= 0) {
      toast.warning("Enter an amount to pay");
      return;
    }
    setPayingFeeId(fee.id);
    try {
      const order = await createFeePaymentOrder(fee.id, amount);

      const checkoutResult = await RazorpayCheckout.open({
        key: order.key_id,
        order_id: order.order_id,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "EOS Fee Payment",
        description: fee.fee_structure_name,
        prefill: user?.email ? { email: user.email } : undefined,
        theme: { color: "#2F6FE0" },
      });

      await verifyFeePayment({
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      });

      toast.success("Payment successful");
      load();
    } catch (err: any) {
      // RazorpayCheckout's own cancel/failure rejection shape ({code,
      // description}) is distinct from our axios error shape - only the
      // latter has getApiErrorMessage's expected response.data.message.
      if (err?.response) {
        toast.error(getApiErrorMessage(err, "Payment verification failed"));
      } else if (err?.description) {
        toast.info(err.description);
      } else {
        toast.error("Payment didn't go through");
      }
    } finally {
      setPayingFeeId(null);
    }
  }

  async function handleDownloadReceipt(payment: MyFeePayment) {
    if (downloadingReceiptId !== null) return;
    setDownloadingReceiptId(payment.id);
    try {
      const file = await downloadFeeReceipt(payment.id, payment.receipt_no);
      const result = await downloadPdf(file.uri, payment.receipt_no, `Receipt ${payment.receipt_no}`);
      if (result === "downloaded") toast.success(`Receipt ${payment.receipt_no} downloaded`);
      else if (result === "unavailable") toast.success(`Receipt saved to ${file.uri}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't download the receipt."));
    } finally {
      setDownloadingReceiptId(null);
    }
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
        <Text style={styles.headerTitle}>Pay fees</Text>
      </LinearGradient>

      {status === "loading" && (
        <View style={styles.content}>
          <SkeletonStatCards count={3} style={{ marginBottom: 16 }} />
          <SkeletonListRows count={4} />
        </View>
      )}

      {status === "error" && (
        <View style={styles.errorNotice}>
          <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
          <Text style={styles.errorNoticeText}>{error ?? "Something went wrong."}</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Compact semester strip - label + dropdown value on the left,
              Total/Paid/Due stat groups inline on the right. */}
          <TouchableOpacity
            style={styles.semesterStrip}
            onPress={() => setSemesterPickerOpen(true)}
            activeOpacity={0.8}
          >
            <View style={styles.semesterStripLeft}>
              <Text style={styles.semesterStripLabel}>Semester</Text>
              <View style={styles.semesterStripValueRow}>
                <Text style={styles.semesterStripValue}>Semester {semester}</Text>
                <Ionicons name="chevron-down" size={14} color="#2F6FE0" />
              </View>
            </View>
            <View style={styles.semesterStripStats}>
              <View style={styles.semesterStat}>
                <Text style={styles.semesterStatValue} numberOfLines={1}>
                  {formatRupees(summary.totalPayable)}
                </Text>
                <Text style={styles.semesterStatLabel}>Total</Text>
              </View>
              <View style={styles.semesterStat}>
                <Text style={[styles.semesterStatValue, styles.semesterStatValuePaid]} numberOfLines={1}>
                  {formatRupees(summary.paid)}
                </Text>
                <Text style={styles.semesterStatLabel}>Paid</Text>
              </View>
              <View style={styles.semesterStat}>
                <Text style={styles.semesterStatValue} numberOfLines={1}>
                  {formatRupees(summary.outstanding)}
                </Text>
                <Text style={styles.semesterStatLabel}>Due</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.tabSwitch}>
            <TouchableOpacity
              style={[styles.tabButton, tab === "pay" && styles.tabButtonActive]}
              onPress={() => setTab("pay")}
            >
              <Text style={[styles.tabButtonText, tab === "pay" && styles.tabButtonTextActive]}>Pay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, tab === "history" && styles.tabButtonActive]}
              onPress={() => setTab("history")}
            >
              <Text style={[styles.tabButtonText, tab === "history" && styles.tabButtonTextActive]}>History</Text>
            </TouchableOpacity>
          </View>

          {tab === "pay" ? (
            demands.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No fees have been raised for you yet</Text>
              </View>
            ) : (
              demands.map((fee) => (
                <FeeAccordionCard
                  key={fee.id}
                  fee={fee}
                  paying={payingFeeId === fee.id}
                  onPay={(amount) => handlePayOne(fee, amount)}
                />
              ))
            )
          ) : paymentsSorted.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={32} color="#B0B7C3" />
              <Text style={styles.emptyStateText}>No payments yet</Text>
            </View>
          ) : (
            <View style={styles.historyCard}>
              {paymentsSorted.map((payment, index) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  demand={demandById.get(payment.demand_id)}
                  divider={index > 0}
                  downloading={downloadingReceiptId === payment.id}
                  onDownload={() => handleDownloadReceipt(payment)}
                />
              ))}
            </View>
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

function FeeAccordionCard({
  fee,
  paying,
  onPay,
}: {
  fee: MyFeeDemand;
  paying: boolean;
  onPay: (amount: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState(String(fee.due));
  const isFullyPaid = fee.status === "paid";
  const rotateStyle = useRotateStyle(expanded);
  const amountValue = clamp(parseInt(amount, 10) || 0, 0, fee.due);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.accordionHeaderRow}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.8}
      >
        <View style={styles.feeLabelWrap}>
          <Text style={styles.feeLabel}>{fee.fee_structure_name}</Text>
          <Text style={styles.feeSubtitle}>{demandSubtitle(fee)}</Text>
        </View>
        <StatusPill status={fee.status} />
        <Animated.View style={rotateStyle}>
          <Ionicons name="chevron-down" size={18} color="#9AA6B2" />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accordionBody}>
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

          {!isFullyPaid && (
            <>
              <View style={styles.amountRow}>
                <Text style={styles.amountPrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                />
                <TouchableOpacity onPress={() => setAmount(String(fee.due))} hitSlop={8}>
                  <Text style={styles.fullDueLink}>Full due</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.payNowRow}>
                <View>
                  <Text style={styles.payNowLabel}>Paying now</Text>
                  <Text style={styles.payNowValue}>{formatRupees(amountValue)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.payNowButton, (amountValue === 0 || paying) && styles.payNowButtonDisabled]}
                  onPress={() => onPay(amountValue)}
                  disabled={amountValue === 0 || paying}
                  activeOpacity={0.85}
                >
                  {paying ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.payNowButtonText}>Pay now</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function PaymentRow({
  payment,
  demand,
  divider,
  downloading,
  onDownload,
}: {
  payment: MyFeePayment;
  demand: MyFeeDemand | undefined;
  divider: boolean;
  downloading: boolean;
  onDownload: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rotateStyle = useRotateStyle(expanded);
  const subtitle = demand
    ? demandSubtitle(demand)
    : new Date(payment.payment_date).getFullYear().toString();

  return (
    <View style={[styles.historyRowWrap, divider && styles.historyRowDivider]}>
      <TouchableOpacity
        style={styles.accordionHeaderRow}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.8}
      >
        <View style={styles.feeLabelWrap}>
          <Text style={styles.feeLabel}>{payment.fee_structure_name}</Text>
          <Text style={styles.feeSubtitle}>{subtitle}</Text>
        </View>
        <StatusPill status="paid" />
        <Animated.View style={rotateStyle}>
          <Ionicons name="chevron-down" size={18} color="#9AA6B2" />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.accordionBody}>
          <View style={styles.feeStatsRow}>
            <View style={styles.feeStatCell}>
              <Text style={styles.feeStatLabel}>TOTAL</Text>
              <Text style={styles.feeStatValue}>{demand ? formatRupees(demand.total) : "-"}</Text>
            </View>
            <View style={[styles.feeStatCell, styles.feeStatCellActive]}>
              <Text style={styles.feeStatLabel}>PAID</Text>
              <Text style={[styles.feeStatValue, styles.feeStatValueActive]}>
                {formatRupees(payment.amount_paid)}
              </Text>
            </View>
            <View style={styles.feeStatCell}>
              <Text style={styles.feeStatLabel}>PAID ON</Text>
              <Text style={styles.feeStatValue}>{formatFeeDate(payment.payment_date)}</Text>
            </View>
          </View>

          <View style={styles.receiptRow}>
            <View>
              <Text style={styles.payNowLabel}>Receipt No.</Text>
              <Text style={styles.receiptNoValue}>{payment.receipt_no}</Text>
              {payment.payment_mode && (
                <Text style={styles.feeSubtitle}>
                  {PAYMENT_MODE_LABEL[payment.payment_mode]}
                  {payment.is_partial ? " · Partial" : ""}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={onDownload}
              disabled={downloading}
              activeOpacity={0.85}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#2F6FE0" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={14} color="#2F6FE0" />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },

  // Compact semester strip
  semesterStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  semesterStripLeft: {
    marginRight: 12,
  },
  semesterStripLabel: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  semesterStripValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  semesterStripValue: {
    fontSize: 14.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  semesterStripStats: {
    flexDirection: "row",
    gap: 16,
  },
  semesterStat: {
    alignItems: "center",
    minWidth: 56,
  },
  semesterStatValue: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#111827",
    textAlign: "center",
  },
  semesterStatValuePaid: {
    color: "#2F6FE0",
  },
  semesterStatLabel: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 3,
    textAlign: "center",
  },

  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 0,
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

  // Fee accordion (Pay tab) + history rows share these
  accordionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  feeLabelWrap: {
    flex: 1,
  },
  feeLabel: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  feeSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  pillBgPaid: { backgroundColor: "#EAF0FD" },
  pillTextPaid: { color: "#2F6FE0" },
  pillBgPending: { backgroundColor: "#FEF3C7" },
  pillTextPending: { color: "#B45309" },
  pillBgPartial: { backgroundColor: "#EAF0FD" },
  pillTextPartial: { color: "#2F6FE0" },

  accordionBody: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
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
    backgroundColor: "#F7F8FA",
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
    fontSize: 14,
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
  },
  amountPrefix: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  amountInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  fullDueLink: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  payNowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  payNowLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  payNowValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 2,
  },
  payNowButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  payNowButtonDisabled: {
    backgroundColor: "#B7CBE6",
  },
  payNowButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },

  // History - one card, many rows
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  historyRowWrap: {
    paddingVertical: 14,
  },
  historyRowDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  receiptNoValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
    marginTop: 2,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  downloadButtonText: {
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
