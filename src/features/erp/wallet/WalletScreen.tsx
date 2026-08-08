import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import RazorpayCheckout from "react-native-razorpay";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import { useAuth } from "@/context/AuthContext";
import {
  getWallet,
  getWalletTransactions,
  createWalletTopupOrder,
  verifyWalletTopup,
  type WalletInfo,
  type WalletTransaction,
} from "@/services/api/wallet.api";
import { SetPinModal } from "./SetPinModal";

function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// The QR a wallet shows for OTHERS to scan and pay into it - a fixed
// custom-scheme prefix distinguishes "this is an EOS wallet QR" from any
// other UUID-shaped QR someone might scan by mistake (see ScanToPayScreen's
// parsing of the same prefix).
export function walletQrPayload(qrToken: string) {
  return `eos-wallet:${qrToken}`;
}

function WalletHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Wallet</Text>
    </LinearGradient>
  );
}

// Wired to EOS-backend's wallet module - see
// @/services/api/wallet.api.ts. Reachable from the Student/Faculty/HoD
// dashboards only ("Wallet is applicable for Student and faculty/HoD
// only") - every other role's dashboard simply doesn't have this tile, and
// the backend 403s regardless if somehow reached.
export function WalletScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useAuth();

  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupSubmitting, setTopupSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [walletInfo, txns] = await Promise.all([getWallet(), getWalletTransactions()]);
      setWallet(walletInfo);
      setTransactions(txns.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't load your wallet"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <WalletHeader onBack={() => router.back()} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router]),
  );

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  function openSendMoney() {
    if (!wallet?.pin_set) {
      toast.warning("Set up your wallet PIN first");
      setPinModalOpen(true);
      return;
    }
    router.push("/(tabs)/erp/wallet/scan" as never);
  }

  function openTopup() {
    setTopupAmount("");
    setTopupModalOpen(true);
  }

  async function submitTopup() {
    const amount = Number(topupAmount);
    if (!amount || amount < 1) {
      toast.warning("Enter a valid amount");
      return;
    }

    setTopupSubmitting(true);
    try {
      const order = await createWalletTopupOrder(amount);
      setTopupModalOpen(false);

      const checkoutResult = await RazorpayCheckout.open({
        key: order.key_id,
        order_id: order.order_id,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "EOS Wallet Top-up",
        description: "Add money to your wallet",
        prefill: user?.email ? { email: user.email } : undefined,
        theme: { color: "#2F6FE0" },
      });

      const verified = await verifyWalletTopup({
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      });
      setWallet((prev) => (prev ? { ...prev, balance: verified.balance } : prev));
      toast.success("Money added to your wallet");
      load();
    } catch (error: any) {
      // RazorpayCheckout's own cancel/failure rejection shape ({code,
      // description}) is distinct from our axios error shape - only the
      // latter has getApiErrorMessage's expected response.data.message.
      if (error?.response) {
        toast.error(getApiErrorMessage(error, "Payment verification failed"));
      } else if (error?.description) {
        toast.info(error.description);
      } else {
        toast.error("Top-up didn't go through");
      }
    } finally {
      setTopupSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.centerState}>
          <ActivityIndicator color="#2F6FE0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2F6FE0" />}
      >
        <LinearGradient colors={["#2F6FE0", "#1A3D8F"]} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceValue}>{formatRupees(wallet?.balance ?? 0)}</Text>
          <View style={styles.balanceActionsRow}>
            <TouchableOpacity style={styles.balanceAction} onPress={openTopup} activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={16} color="#2F6FE0" />
              <Text style={styles.balanceActionText}>Add money</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.balanceAction} onPress={() => setQrModalOpen(true)} activeOpacity={0.85}>
              <Ionicons name="qr-code-outline" size={16} color="#2F6FE0" />
              <Text style={styles.balanceActionText}>My QR</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <TouchableOpacity style={styles.sendButton} onPress={openSendMoney} activeOpacity={0.85}>
          <Ionicons name="scan-outline" size={18} color="#fff" />
          <Text style={styles.sendButtonText}>Scan & Send Money</Text>
        </TouchableOpacity>

        {!wallet?.pin_set && (
          <TouchableOpacity style={styles.pinBanner} onPress={() => setPinModalOpen(true)} activeOpacity={0.85}>
            <Ionicons name="lock-closed-outline" size={16} color="#B45309" />
            <Text style={styles.pinBannerText}>Set up your wallet PIN to send money</Text>
            <Ionicons name="chevron-forward" size={16} color="#B45309" />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No transactions yet</Text>
          </View>
        ) : (
          transactions.map((txn) => <TransactionRow key={txn.id} txn={txn} />)
        )}
      </ScrollView>

      <SetPinModal
        visible={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onDone={() => {
          setPinModalOpen(false);
          load();
        }}
      />

      <Modal visible={qrModalOpen} transparent animationType="fade" onRequestClose={() => setQrModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.qrCard}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setQrModalOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.qrTitle}>Your Wallet QR</Text>
            <Text style={styles.qrSubtitle}>Others can scan this to send you money</Text>
            <View style={styles.qrWrap}>
              {wallet && <QRCode value={walletQrPayload(wallet.qr_token)} size={200} />}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={topupModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTopupModalOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.qrCard}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setTopupModalOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.qrTitle}>Add Money</Text>
            <Text style={styles.qrSubtitle}>Top up your wallet via Razorpay</Text>
            <View style={styles.amountInputWrap}>
              <Text style={styles.amountPrefix}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#9AA6B2"
                keyboardType="number-pad"
                value={topupAmount}
                onChangeText={(text) => setTopupAmount(text.replace(/[^0-9]/g, ""))}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.confirmButton, topupSubmitting && styles.confirmButtonDisabled]}
              onPress={submitTopup}
              activeOpacity={0.85}
              disabled={topupSubmitting}
            >
              {topupSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Proceed to pay</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const TXN_META: Record<
  WalletTransaction["source"],
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  cash: { icon: "cash-outline", label: "Cash" },
  razorpay: { icon: "card-outline", label: "Top-up" },
  adjustment: { icon: "settings-outline", label: "Adjustment" },
  purchase: { icon: "storefront-outline", label: "Purchase" },
  transfer: { icon: "swap-horizontal-outline", label: "Transfer" },
};

function TransactionRow({ txn }: { txn: WalletTransaction }) {
  const isCredit = txn.txn_type === "credit";
  const meta = TXN_META[txn.source];

  let subtitle = meta.label;
  if (txn.source === "transfer" && txn.counterparty_email) {
    subtitle = isCredit ? `From ${txn.counterparty_email}` : `To ${txn.counterparty_email}`;
  } else if (txn.source === "purchase" && txn.outlet) {
    subtitle = txn.outlet.name;
  }

  return (
    <View style={styles.txnRow}>
      <View style={[styles.txnIconWrap, isCredit ? styles.txnIconWrapCredit : styles.txnIconWrapDebit]}>
        <Ionicons name={meta.icon} size={16} color={isCredit ? "#16A34A" : "#DC2626"} />
      </View>
      <View style={styles.txnTextWrap}>
        <Text style={styles.txnSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        <Text style={styles.txnDate}>
          {formatDate(new Date(txn.created_at))}
          {txn.status !== "success" ? ` · ${txn.status}` : ""}
        </Text>
      </View>
      <Text style={[styles.txnAmount, isCredit ? styles.txnAmountCredit : styles.txnAmountDebit]}>
        {isCredit ? "+" : "-"}
        {formatRupees(txn.amount)}
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#D7E2FA",
  },
  balanceValue: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: "#fff",
    marginTop: 4,
    marginBottom: 16,
  },
  balanceActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  balanceAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  balanceActionText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 16,
  },
  sendButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  pinBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  pinBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#92400E",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
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
  txnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  txnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  txnIconWrapCredit: {
    backgroundColor: "#F0FDF4",
  },
  txnIconWrapDebit: {
    backgroundColor: "#FEF2F2",
  },
  txnTextWrap: {
    flex: 1,
  },
  txnSubtitle: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  txnDate: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  txnAmountCredit: {
    color: "#16A34A",
  },
  txnAmountDebit: {
    color: "#DC2626",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  qrCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 4,
  },
  qrSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  qrWrap: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    minWidth: 180,
  },
  amountPrefix: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: "#6B7280",
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  confirmButton: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 14,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
