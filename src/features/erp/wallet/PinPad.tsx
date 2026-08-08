import { useEffect, useRef } from "react";
import { View, TextInput, StyleSheet } from "react-native";

const PIN_LENGTH = 4;

// A 4-digit PIN entry: visually just dots, but backed by a real TextInput
// (invisible, stretched over the exact same area as the dot boxes rather
// than pinned to a 1x1 corner) so a tap anywhere on the row is a genuine
// tap ON the input - the standard "OTP box" pattern, reused for
// setup/change/transfer-time entry so the PIN always looks and behaves the
// same everywhere.
//
// autoFocus alone isn't reliable here: this always renders inside a
// react-native Modal, and Modal mounts its children before the native
// overlay has actually finished animating in, so a same-tick .focus() call
// can silently lose the race and never raise the keyboard. Re-attempting
// focus() shortly after mount (below) covers that; parents that reuse this
// across multiple opens of the same Modal should also remount it per-open
// (e.g. `key={visible ? "open" : "closed"}`) so this effect re-fires each time.
export function PinPad({
  value,
  onChange,
  autoFocus = true,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  return (
    <View style={styles.wrap}>
      {Array.from({ length: PIN_LENGTH }).map((_, index) => (
        <View key={index} style={[styles.box, index < value.length && styles.boxFilled]}>
          {index < value.length && <View style={styles.dot} />}
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/[^0-9]/g, "").slice(0, PIN_LENGTH))}
        keyboardType="number-pad"
        maxLength={PIN_LENGTH}
        secureTextEntry
        style={styles.overlayInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  boxFilled: {
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2F6FE0",
  },
  // Rendered last so it sits on top in z-order (capturing every tap) while
  // staying fully transparent - stretched over the whole row rather than
  // the old 1x1-pixel-in-the-corner version, which never actually
  // overlapped anything a user could tap.
  overlayInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
});
