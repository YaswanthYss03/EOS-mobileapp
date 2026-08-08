import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { resolveWalletQrToken, transferWalletFunds } from "@/services/api/wallet.api";
import { PinPad } from "./PinPad";

const QR_PREFIX = "eos-wallet:";

type Stage = "scanning" | "resolving" | "confirm" | "sending";

function ScanHeader({ onBack }: { onBack: () => void }) {
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
      <Text style={styles.headerTitle}>Send Money</Text>
    </LinearGradient>
  );
}

// The "scan receiver's QR, enter amount, enter PIN" flow, reachable from
// WalletScreen's "Scan & Send Money" button (only once a PIN is set - see
// WalletScreen.openSendMoney). See @/services/api/wallet.api.ts.
export function ScanToPayScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [stage, setStage] = useState<Stage>("scanning");
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [receiverEmail, setReceiverEmail] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  // Bumped on every failed attempt so the PinPad below remounts (and
  // re-runs its autofocus) after a wrong PIN, rather than just sitting
  // there unfocused - see handlePinComplete's catch block.
  const [pinAttempt, setPinAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <ScanHeader onBack={() => router.back()} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router]),
  );

  async function handleScanned(result: BarcodeScanningResult) {
    if (stage !== "scanning") return; // ignore extra fires while already resolving
    if (!result.data.startsWith(QR_PREFIX)) {
      toast.warning("That's not an EOS Wallet QR code");
      return;
    }

    const token = result.data.slice(QR_PREFIX.length);
    setStage("resolving");
    try {
      const receiver = await resolveWalletQrToken(token);
      setQrToken(token);
      setReceiverEmail(receiver.email);
      setStage("confirm");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't read this QR code"));
      setStage("scanning");
    }
  }

  function resetToScan() {
    setStage("scanning");
    setQrToken(null);
    setReceiverEmail(null);
    setAmount("");
    setPin("");
  }

  async function handlePinComplete(enteredPin: string) {
    if (!qrToken) return;
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < 1) {
      toast.warning("Enter a valid amount");
      setPin("");
      return;
    }

    setStage("sending");
    try {
      const result = await transferWalletFunds(qrToken, numericAmount, enteredPin);
      toast.success(`Sent ₹${numericAmount.toLocaleString("en-IN")} to ${receiverEmail}`);
      router.replace({
        pathname: "/(tabs)/erp/wallet" as never,
        params: { newBalance: String(result.balance) },
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't complete the transfer"));
      setPin("");
      setPinAttempt((n) => n + 1);
      setStage("confirm");
    }
  }

  if (stage === "scanning" || stage === "resolving") {
    if (!permission) {
      return (
        <SafeAreaView style={styles.container} edges={[]}>
          <View style={styles.centerState}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        </SafeAreaView>
      );
    }

    if (!permission.granted) {
      return (
        <SafeAreaView style={styles.container} edges={[]}>
          <View style={styles.centerState}>
            <Ionicons name="camera-outline" size={40} color="#B0B7C3" />
            <Text style={styles.permissionText}>Camera access is needed to scan a wallet QR code</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.85}>
              <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleScanned}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>
            {stage === "resolving" ? "Checking QR code..." : "Point your camera at the receiver's wallet QR"}
          </Text>
          {stage === "resolving" && <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />}
        </View>
      </View>
    );
  }

  // stage === "confirm" | "sending"
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.confirmWrap}>
        <View style={styles.receiverCard}>
          <View style={styles.receiverAvatar}>
            <Ionicons name="person" size={22} color="#2F6FE0" />
          </View>
          <Text style={styles.receiverLabel}>Paying</Text>
          <Text style={styles.receiverEmail}>{receiverEmail}</Text>
          <TouchableOpacity onPress={resetToScan} disabled={stage === "sending"}>
            <Text style={styles.changeRecipientText}>Not the right person? Scan again</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Amount</Text>
        <View style={styles.amountInputWrap}>
          <Text style={styles.amountPrefix}>₹</Text>
          <Text
            style={styles.amountValue}
            // A plain Text acting as the amount "input" would need a real
            // TextInput to be editable - use one, styled to match.
          >
            {amount || "0"}
          </Text>
        </View>
        {stage === "confirm" && (
          <AmountKeypad value={amount} onChange={setAmount} />
        )}

        {stage === "confirm" && amount && Number(amount) > 0 && (
          <View style={styles.pinSection}>
            <Text style={styles.fieldLabel}>Enter your wallet PIN to confirm</Text>
            <View style={styles.pinWrap}>
              <PinPad
                key={pinAttempt}
                value={pin}
                onChange={(next) => {
                  setPin(next);
                  if (next.length === 4) handlePinComplete(next);
                }}
              />
            </View>
          </View>
        )}

        {stage === "sending" && (
          <View style={styles.sendingOverlay}>
            <ActivityIndicator color="#2F6FE0" size="large" />
            <Text style={styles.sendingText}>Sending money...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// A simple numeric keypad for the amount - kept local to this screen since
// nothing else in the app needs a free-standing amount entry pad like this
// (everywhere else uses a plain TextInput; this one sits under a receiver
// card with a PIN pad appearing right below it, so a real TextInput's
// keyboard would fight the PIN pad's for screen space).
function AmountKeypad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  return (
    <View style={styles.keypad}>
      {keys.map((key, index) => (
        <TouchableOpacity
          key={index}
          style={styles.keypadKey}
          disabled={key === ""}
          onPress={() => {
            if (key === "⌫") onChange(value.slice(0, -1));
            else if (key !== "") onChange((value + key).slice(0, 6));
          }}
          activeOpacity={key ? 0.6 : 1}
        >
          <Text style={styles.keypadKeyText}>{key}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
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
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
  },
  permissionText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#D1D5DB",
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: "#2F6FE0",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  permissionButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    marginBottom: 20,
  },
  scanHint: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#fff",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmWrap: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    padding: 16,
  },
  receiverCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  receiverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  receiverLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
  receiverEmail: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginTop: 2,
    marginBottom: 10,
  },
  changeRecipientText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 10,
  },
  amountInputWrap: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  amountPrefix: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: "#111827",
    marginRight: 4,
  },
  amountValue: {
    fontSize: 40,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  keypadKey: {
    width: "33.33%",
    aspectRatio: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  keypadKeyText: {
    fontSize: 22,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  pinSection: {
    marginTop: 24,
  },
  pinWrap: {
    alignItems: "center",
  },
  sendingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(247,248,250,0.9)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  sendingText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
});
