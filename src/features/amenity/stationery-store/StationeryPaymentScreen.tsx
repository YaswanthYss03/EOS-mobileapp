import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import { fonts } from "@/theme";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { toast } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";
import { getApiErrorMessage } from "@/services/api/client";
import { getWallet } from "@/services/api/wallet.api";
import {
  checkoutStationeryWithWallet,
  createStationeryRazorpayOrder,
  verifyStationeryRazorpayPayment,
} from "@/services/api/stationery.api";
import { useStationeryCart } from "@/context/StationeryCartContext";
import { PinPad } from "@/features/erp/wallet/PinPad";
import { SetPinModal } from "@/features/erp/wallet/SetPinModal";

function hasWallet(role: string | null): boolean {
  return role !== "parent" && role !== "alumni" && role !== "principal" && role !== "correspondent";
}

type Method = "wallet" | "razorpay";

export function StationeryPaymentScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const role = useRole();
  const cart = useStationeryCart();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const walletEligible = hasWallet(role);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [method, setMethod] = useState<Method>("razorpay");
  const [submitting, setSubmitting] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [pin, setPin] = useState("");
  const [pinAttempt, setPinAttempt] = useState(0);

  useEffect(() => {
    if (!walletEligible) return;
    getWallet()
      .then((w) => {
        setWalletBalance(w.balance);
        setPinSet(w.pin_set);
        if (w.balance >= cart.total) setMethod("wallet");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletEligible]);

  const walletInsufficient = walletBalance !== null && walletBalance < cart.total;

  function goBack() {
    router.back();
  }

  function startWalletPayment() {
    if (pinSet === false) {
      setShowSetPinModal(true);
      return;
    }
    setPin("");
    setPinModalOpen(true);
  }

  async function handleWalletPinComplete(enteredPin: string) {
    setSubmitting(true);
    try {
      const order = await checkoutStationeryWithWallet(
        cart.lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        enteredPin,
      );
      setPinModalOpen(false);
      cart.clear();
      router.replace(`/(tabs)/amenity/stationery-store/success?orderId=${order.id}` as never);
    } catch (err: any) {
      setPin("");
      setPinAttempt((n) => n + 1);
      toast.error(getApiErrorMessage(err, "Payment failed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRazorpayPayment() {
    setSubmitting(true);
    try {
      const order = await createStationeryRazorpayOrder(
        cart.lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      );
      const checkoutResult = await RazorpayCheckout.open({
        key: order.key_id,
        order_id: order.order_id,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: "Stationery Store",
        description: `${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}`,
        prefill: user?.email ? { email: user.email } : undefined,
        theme: { color: "#2F6FE0" },
      });
      const verified = await verifyStationeryRazorpayPayment({
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      });
      cart.clear();
      router.replace(`/(tabs)/amenity/stationery-store/success?orderId=${verified.id}` as never);
    } catch (error: any) {
      // RazorpayCheckout's own cancel/failure rejection shape ({code,
      // description}) is distinct from our axios error shape - same split
      // WalletScreen's own topup flow already uses.
      if (error?.response) {
        toast.error(getApiErrorMessage(error, "Payment verification failed"));
      } else if (error?.description) {
        toast.info(error.description);
      } else {
        toast.error("Payment didn't go through");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handlePayNow() {
    if (method === "wallet") startWalletPayment();
    else handleRazorpayPayment();
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Payment</Text>
            <Text style={styles.headerSubtitle}>Secured by campus payment gateway</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCount}>
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
          </Text>
          <Text style={styles.summaryTotal}>₹{cart.total}</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>PAY WITH</Text>
          <View style={{ gap: 8 }}>
            {walletEligible && (
              <TouchableOpacity
                style={[styles.methodRow, method === "wallet" && styles.methodRowActive, walletInsufficient && styles.methodRowDisabled]}
                onPress={() => !walletInsufficient && setMethod("wallet")}
                disabled={walletInsufficient}
                activeOpacity={0.8}
              >
                <Ionicons name="wallet-outline" size={18} color="#2F6FE0" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>Wallet</Text>
                  <Text style={[styles.methodSub, walletInsufficient && styles.methodSubError]}>
                    {walletBalance === null
                      ? "Loading…"
                      : walletInsufficient
                        ? "Insufficient balance"
                        : `Balance ₹${walletBalance} · instant`}
                  </Text>
                </View>
                <View style={[styles.radio, method === "wallet" && styles.radioActive]} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.methodRow, method === "razorpay" && styles.methodRowActive]}
              onPress={() => setMethod("razorpay")}
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={18} color="#2F6FE0" />
              <View style={{ flex: 1 }}>
                <Text style={styles.methodLabel}>UPI</Text>
                <Text style={styles.methodSub}>GPay, PhonePe, Paytm</Text>
              </View>
              <View style={[styles.radio, method === "razorpay" && styles.radioActive]} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.noteRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#8B92B0" style={{ marginTop: 1 }} />
          <Text style={styles.noteText}>
            Charges post to your student ledger in the ERP. Unclaimed orders are refunded automatically.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
        <TouchableOpacity
          style={[styles.payButton, submitting && styles.payButtonDisabled]}
          onPress={handlePayNow}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Pay ₹{cart.total} securely</Text>
          )}
        </TouchableOpacity>
      </View>

      <SetPinModal
        visible={showSetPinModal}
        onClose={() => setShowSetPinModal(false)}
        onDone={() => {
          setShowSetPinModal(false);
          setPinSet(true);
          setPin("");
          setPinModalOpen(true);
        }}
      />

      <Modal visible={pinModalOpen} transparent animationType="fade" onRequestClose={() => setPinModalOpen(false)}>
        <View style={styles.pinOverlay}>
          <View style={styles.pinCard}>
            <TouchableOpacity style={styles.pinCloseButton} onPress={() => setPinModalOpen(false)} hitSlop={8}>
              <Ionicons name="close" size={20} color="#5A6284" />
            </TouchableOpacity>
            <Text style={styles.pinTitle}>Enter your wallet PIN to confirm</Text>
            <Text style={styles.pinAmount}>₹{cart.total}</Text>
            {submitting ? (
              <ActivityIndicator color="#2F6FE0" style={{ marginTop: 20 }} />
            ) : (
              <View style={styles.pinPadWrap}>
                <PinPad
                  key={pinAttempt}
                  value={pin}
                  onChange={(next) => {
                    setPin(next);
                    if (next.length === 4) handleWalletPinComplete(next);
                  }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  headerSubtitle: { fontSize: 11.5, fontFamily: fonts.regular, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 20 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    gap: 3,
  },
  summaryCount: { fontSize: 12, fontFamily: fonts.regular, color: "#8B92B0" },
  summaryTotal: { fontSize: 20, fontFamily: fonts.bold, color: "#181E3D" },
  sectionTitle: { fontSize: 12, fontFamily: fonts.bold, color: "#8B92B0", letterSpacing: 0.6, marginBottom: 10 },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1.5,
    borderColor: "#E2E5F0",
  },
  methodRowActive: { borderColor: "#2F6FE0" },
  methodRowDisabled: { opacity: 0.55 },
  methodLabel: { fontSize: 13.5, fontFamily: fonts.semibold, color: "#1C2246" },
  methodSub: { fontSize: 11.5, fontFamily: fonts.regular, color: "#8B92B0", marginTop: 1 },
  methodSubError: { color: "#C23B3B" },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#E2E5F0" },
  radioActive: { borderColor: "#2F6FE0", backgroundColor: "#2F6FE0" },
  noteRow: { flexDirection: "row", gap: 6 },
  noteText: { flex: 1, fontSize: 11.5, fontFamily: fonts.regular, color: "#8B92B0", lineHeight: 17 },
  footer: { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#EEF0F4" },
  payButton: { width: "100%", paddingVertical: 14, borderRadius: 13, backgroundColor: "#2F6FE0", alignItems: "center" },
  payButtonDisabled: { opacity: 0.7 },
  payButtonText: { fontSize: 15, fontFamily: fonts.bold, color: "#fff" },
  pinOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", padding: 24 },
  pinCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center" },
  pinCloseButton: { position: "absolute", top: 14, right: 14 },
  pinTitle: { fontSize: 14, fontFamily: fonts.semibold, color: "#1C2246", textAlign: "center" },
  pinAmount: { fontSize: 22, fontFamily: fonts.bold, color: "#181E3D", marginTop: 6 },
  pinPadWrap: { marginTop: 20 },
});
