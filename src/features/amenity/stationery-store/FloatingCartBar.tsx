import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { useStationeryCart } from "@/context/StationeryCartContext";

// Shown at the bottom of the Home/Category screens whenever the cart isn't
// empty - matches the reference design's showFloatingCart exactly (see
// Stationery Login.dc.html). Padded up by the device's own safe-area bottom
// inset (these screens' own SafeAreaView opts out of edges entirely, same
// reasoning as their header's manual insets.top) so this bar sits above a
// gesture-nav home indicator instead of underneath/behind it.
export function FloatingCartBar({ basePath }: { basePath: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useStationeryCart();
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
        <Ionicons name="arrow-forward" size={14} color="#2F6FE0" />
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
    backgroundColor: "#1A3D8F",
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
  itemsLabel: { fontSize: 11, fontFamily: fonts.regular, color: "rgba(255,255,255,0.8)" },
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
  buttonText: { fontSize: 12.5, fontFamily: fonts.bold, color: "#2F6FE0" },
});
