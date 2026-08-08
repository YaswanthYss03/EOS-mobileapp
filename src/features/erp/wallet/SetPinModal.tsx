import { useState } from "react";
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { setWalletPin } from "@/services/api/wallet.api";
import { PinPad } from "./PinPad";

type Step = "enter" | "confirm";

// First-time wallet PIN setup - "set by user in first time login when they
// open the wallet". Enter once, re-enter to confirm (catches fat-finger
// typos before they lock the PIN in), then POST /me/wallet/pin.
export function SetPinModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<Step>("enter");
  const [firstPin, setFirstPin] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep("enter");
    setFirstPin("");
    setPin("");
  }

  function handleChange(next: string) {
    setPin(next);
    if (next.length !== 4) return;

    if (step === "enter") {
      setFirstPin(next);
      setPin("");
      setStep("confirm");
      return;
    }

    if (next !== firstPin) {
      toast.warning("PINs don't match - try again");
      setPin("");
      setFirstPin("");
      setStep("enter");
      return;
    }

    submit(next);
  }

  async function submit(confirmedPin: string) {
    setSubmitting(true);
    try {
      await setWalletPin(confirmedPin);
      toast.success("Wallet PIN set");
      reset();
      onDone();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't set your PIN. Please try again"));
      setPin("");
      setFirstPin("");
      setStep("enter");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              reset();
              onClose();
            }}
            hitSlop={8}
          >
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed-outline" size={22} color="#2F6FE0" />
          </View>
          <Text style={styles.title}>{step === "enter" ? "Set your wallet PIN" : "Confirm your PIN"}</Text>
          <Text style={styles.subtitle}>
            {step === "enter"
              ? "You'll use this 4-digit PIN to send money from your wallet."
              : "Enter the same PIN again to confirm."}
          </Text>

          <View style={styles.pinWrap}>
            {submitting ? (
              <ActivityIndicator color="#2F6FE0" />
            ) : (
              // Keyed on `visible` so this remounts (and re-runs its
              // autofocus effect) every time the modal re-opens, rather
              // than only once on this whole screen's first render - see
              // PinPad's own doc comment for why a bare autoFocus prop
              // isn't reliable inside a Modal.
              <PinPad key={visible ? "open" : "closed"} value={pin} onChange={handleChange} />
            )}
          </View>
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
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  pinWrap: {
    minHeight: 56,
    justifyContent: "center",
  },
});
