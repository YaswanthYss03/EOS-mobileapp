import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { useStationeryCart } from "@/context/StationeryCartContext";
import type { StationeryProduct } from "@/services/api/stationery.api";

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// One product tile - shared by the Home screen's per-category rows, its
// search results grid, and the Category screen's own grid (same card,
// three call sites), matching the reference design's identical product
// card markup across all three.
export function ProductCard({ product, style }: { product: StationeryProduct; style?: object }) {
  const cart = useStationeryCart();
  const qty = cart.quantityOf(product.id);
  const outOfStock = product.stock_quantity <= 0;
  const stockLabel = outOfStock ? "Out of stock" : product.stock_quantity <= 10 ? `Only ${product.stock_quantity} left` : "In stock";
  const stockColor = outOfStock ? "#C23B3B" : product.stock_quantity <= 10 ? "#C2822A" : "#1E7A41";

  return (
    <View style={[styles.card, style]}>
      <View style={styles.imageWrap}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.image} />
        ) : (
          <Text style={styles.imageInitials}>{initialsFromName(product.name)}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{product.price}</Text>
          <Text style={[styles.stockLabel, { color: stockColor }]}>{stockLabel}</Text>
        </View>
        {!outOfStock &&
          (qty === 0 ? (
            <TouchableOpacity style={styles.addButton} onPress={() => cart.addOne(product)} activeOpacity={0.8}>
              <Text style={styles.addButtonText}>ADD</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => cart.removeOne(product.id)} hitSlop={6}>
                <Ionicons name="remove" size={16} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.stepperQty}>{qty}</Text>
              <TouchableOpacity onPress={() => cart.addOne(product)} hitSlop={6}>
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    overflow: "hidden",
  },
  imageWrap: {
    height: 78,
    backgroundColor: "#F1F3F6",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: "100%", height: "100%" },
  imageInitials: { fontSize: 18, fontFamily: fonts.bold, color: "#9AA6B2" },
  body: { padding: 10, gap: 6 },
  name: { fontSize: 12.5, fontFamily: fonts.semibold, color: "#111827", minHeight: 32 },
  priceRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 5 },
  price: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  stockLabel: { fontSize: 9.5, fontFamily: fonts.semibold, textAlign: "right" },
  addButton: {
    borderWidth: 1.5,
    borderColor: "#2F6FE0",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  addButtonText: { fontSize: 11.5, fontFamily: fonts.bold, color: "#2F6FE0" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2F6FE0",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperQty: { fontSize: 12.5, fontFamily: fonts.bold, color: "#fff" },
  outOfStockPill: {
    backgroundColor: "#F1F2F8",
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: "center",
  },
  outOfStockText: { fontSize: 11, fontFamily: fonts.bold, color: "#B2B7CF" },
});
