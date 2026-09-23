import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { useCraveoCart } from "@/context/CraveoCartContext";
import type { CraveoDish } from "@/services/api/craveo.api";

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// One dish tile - shared by the Home screen's per-category rows, its search
// results, and the Menu screen's own list (same card, matching the
// reference design's identical veg/non-veg mark + ADD/stepper markup
// everywhere it appears).
export function DishCard({ dish, style }: { dish: CraveoDish; style?: object }) {
  const cart = useCraveoCart();
  const qty = cart.quantityOf(dish.id);
  const outOfStock = !dish.is_available || dish.stock_quantity <= 0;
  const stockLabel = outOfStock ? "Out of stock" : dish.stock_quantity <= 10 ? `${dish.stock_quantity} left` : "Available";

  return (
    <View style={[styles.card, style]}>
      <View style={styles.imageWrap}>
        {dish.image_url ? (
          <Image source={{ uri: dish.image_url }} style={styles.image} />
        ) : (
          <Text style={styles.imageInitials}>{initialsFromName(dish.name)}</Text>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <View style={[styles.vegMark, { borderColor: dish.is_veg ? "#2D6BE0" : "#12243D" }]}>
            <View style={[styles.vegDot, { backgroundColor: dish.is_veg ? "#2D6BE0" : "#12243D" }]} />
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {dish.name}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{dish.price}</Text>
          <Text style={[styles.stockLabel, { color: outOfStock ? "#C23B3B" : "#8A95A5" }]}>{stockLabel}</Text>
        </View>
        {!outOfStock &&
          (qty === 0 ? (
            <TouchableOpacity style={styles.addButton} onPress={() => cart.addOne(dish)} activeOpacity={0.8}>
              <Text style={styles.addButtonText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => cart.removeOne(dish.id)} hitSlop={6}>
                <Ionicons name="remove" size={16} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.stepperQty}>{qty}</Text>
              <TouchableOpacity onPress={() => cart.addOne(dish)} hitSlop={6}>
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        {outOfStock && (
          <View style={styles.outOfStockPill}>
            <Text style={styles.outOfStockText}>Out of stock</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7EBF1",
    overflow: "hidden",
  },
  imageWrap: {
    height: 78,
    backgroundColor: "#EDF1F7",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  imageInitials: { fontSize: 18, fontFamily: fonts.bold, color: "#9AA6B2" },
  body: { padding: 10, gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  vegMark: { width: 12, height: 12, marginTop: 2, borderWidth: 1.5, borderRadius: 2, alignItems: "center", justifyContent: "center" },
  vegDot: { width: 5, height: 5, borderRadius: 2.5 },
  name: { flex: 1, fontSize: 12.5, fontFamily: fonts.semibold, color: "#12243D", minHeight: 32 },
  priceRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 5 },
  price: { fontSize: 14.5, fontFamily: fonts.bold, color: "#12243D" },
  stockLabel: { fontSize: 9.5, fontFamily: fonts.semibold, textAlign: "right" },
  addButton: {
    borderWidth: 1.5,
    borderColor: "#2D6BE0",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  addButtonText: { fontSize: 11.5, fontFamily: fonts.bold, color: "#2D6BE0" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2D6BE0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperQty: { fontSize: 12.5, fontFamily: fonts.bold, color: "#fff" },
  outOfStockPill: {
    backgroundColor: "#F1F2F8",
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  outOfStockText: { fontSize: 11, fontFamily: fonts.bold, color: "#B2B7CF" },
});
