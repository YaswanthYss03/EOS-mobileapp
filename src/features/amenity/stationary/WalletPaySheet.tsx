import { View, Text, Modal, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { PinPad } from "@/features/erp/wallet/PinPad";

// "Pay from your wallet": what it costs, what the wallet holds, and the wallet PIN. The PIN pad hands the PIN
// over as soon as the fourth digit is typed, the same as sending money from the wallet does. The PIN itself is
// only ever checked by the server.
export function WalletPaySheet({
  visible,
  amount,
  balance,
  pin,
  onPinChange,
  attempt,
  paying,
  error,
  onPinComplete,
  onCancel,
  onAddMoney,
}: {
  visible: boolean;
  /** What the request will cost. */
  amount: number;
  /** What the wallet holds, when it is known. */
  balance: number | null;
  pin: string;
  onPinChange: (pin: string) => void;
  /** Bumped after a wrong PIN so the pad remounts and focuses again. */
  attempt: number;
  paying: boolean;
  error: string | null;
  onPinComplete: (pin: string) => void;
  onCancel: () => void;
  onAddMoney: () => void;
}) {
  const short = balance !== null && balance < amount;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={paying ? undefined : onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {!paying && (
            <TouchableOpacity style={styles.closeButton} onPress={onCancel} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel payment">
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}

          <View style={styles.iconWrap}>
            <Ionicons name="wallet-outline" size={22} color="#2F6FE0" />
          </View>
          <Text style={styles.title}>Pay from your wallet</Text>
          <Text style={styles.amount}>₹{amount.toLocaleString("en-IN")}</Text>
          {balance !== null && (
            <Text style={[styles.balance, short && styles.balanceShort]}>
              Wallet balance ₹{balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              {short ? " - not enough" : ""}
            </Text>
          )}

          {short ? (
            <TouchableOpacity style={styles.addMoneyButton} onPress={onAddMoney} activeOpacity={0.85} accessibilityRole="button">
              <Text style={styles.addMoneyText}>Add money to your wallet</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.subtitle}>Enter your 4-digit wallet PIN to pay.</Text>
              <View style={styles.pinWrap}>
                {paying ? (
                  <View style={styles.payingRow}>
                    <ActivityIndicator color="#2F6FE0" />
                    <Text style={styles.payingText}>Paying...</Text>
                  </View>
                ) : (
                  <PinPad
                    key={`${visible ? "open" : "closed"}-${attempt}`}
                    value={pin}
                    onChange={(next) => {
                      onPinChange(next);
                      if (next.length === 4) onPinComplete(next);
                    }}
                  />
                )}
              </View>
            </>
          )}

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              <Ionicons name="alert-circle" size={16} color="#B91C1C" />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
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
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  amount: {
    fontSize: 30,
    fontFamily: fonts.bold,
    color: "#1E3A8A",
    marginBottom: 4,
  },
  balance: {
    fontSize: 12.5,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginBottom: 18,
    textAlign: "center",
  },
  balanceShort: {
    color: "#DC2626",
    fontFamily: fonts.semibold,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  pinWrap: {
    minHeight: 56,
    justifyContent: "center",
  },
  payingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  payingText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#374151",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: "stretch",
  },
  error: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#B91C1C",
    textAlign: "center",
  },
  addMoneyButton: {
    backgroundColor: "#2F6FE0",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addMoneyText: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 13,
  },
});
