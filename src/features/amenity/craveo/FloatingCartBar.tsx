import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { useCraveoCart } from "@/context/CraveoCartContext";

// Shown at the bottom of Home/Menu whenever the cart isn't empty - matches
// the reference design's "showCartBar" bar exactly. Padded up by the
// device's own safe-area bottom inset, same reasoning as the Stationery
// Store's own FloatingCartBar (these screens' SafeAreaView opts out of
// edges entirely).
export function FloatingCartBar({ basePath }: { basePath: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useCraveoCart();
  if (cart.itemCount === 0) return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(14, insets.bottom + 8) }]}>
      <View>
        <Text style={styles.itemsLabel}>
          {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"} in cart
        </Text>
        <Text style={styles.payableLabel}>₹{cart.total} payable</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => router.push(`${basePath}/cart` as never)} activeOpacity={0.85}>
        <Text style={styles.buttonText}>View cart</Text>
        <Ionicons name="arrow-forward" size={14} color="#1E4FBF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#2D6BE0",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  itemsLabel: { fontSize: 11, fontFamily: fonts.regular, color: "rgba(255,255,255,0.85)" },
  payableLabel: { fontSize: 14.5, fontFamily: fonts.bold, color: "#fff", marginTop: 1 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  buttonText: { fontSize: 12.5, fontFamily: fonts.bold, color: "#1E4FBF" },
});
