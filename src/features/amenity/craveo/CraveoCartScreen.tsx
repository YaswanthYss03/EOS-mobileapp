import { useCallback } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { confirm } from "@/utils/confirm";
import { useCraveoCart, type CraveoCartLine } from "@/context/CraveoCartContext";

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function CraveoCartScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const cart = useCraveoCart();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  async function handleClearCart() {
    const ok = await confirm({
      title: "Clear cart",
      message: "Remove all items from your cart?",
      confirmText: "Clear",
      destructive: true,
    });
    if (ok) cart.clear();
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2D6BE0", "#1E4FBF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Cart</Text>
            <Text style={styles.headerSubtitle}>
              {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {cart.lines.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="fast-food-outline" size={36} color="#B9BFD6" />
          <Text style={styles.emptyStateText}>Nothing booked yet</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.browseButtonText}>Browse the menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {cart.lines.map((line: CraveoCartLine) => (
              <View key={line.dish.id} style={styles.itemRow}>
                <View style={styles.itemImageWrap}>
                  {line.dish.image_url ? (
                    <Image source={{ uri: line.dish.image_url }} style={styles.itemImage} />
                  ) : (
                    <Text style={styles.itemImageInitials}>{initialsFromName(line.dish.name)}</Text>
                  )}
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {line.dish.name}
                  </Text>
                  <Text style={styles.itemCategory}>{line.dish.category.name}</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity onPress={() => cart.removeOne(line.dish.id)} hitSlop={6}>
                    <Ionicons name="remove" size={14} color="#2D6BE0" />
                  </TouchableOpacity>
                  <Text style={styles.stepperQty}>{line.quantity}</Text>
                  <TouchableOpacity onPress={() => cart.addOne(line.dish)} hitSlop={6}>
                    <Ionicons name="add" size={14} color="#2D6BE0" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemSubtotal}>₹{line.dish.price * line.quantity}</Text>
                <TouchableOpacity onPress={() => cart.removeLine(line.dish.id)} hitSlop={6}>
                  <Ionicons name="close" size={16} color="#B2B7CF" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.clearCartButton} onPress={handleClearCart}>
              <Text style={styles.clearCartText}>Clear cart</Text>
            </TouchableOpacity>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{cart.subtotal}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.payableLabel}>Payable</Text>
                <Text style={styles.payableValue}>₹{cart.total}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
            <View>
              <Text style={styles.footerPayableLabel}>Payable</Text>
              <Text style={styles.footerPayableValue}>₹{cart.total}</Text>
            </View>
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => router.push("/(tabs)/amenity/craveo/payment" as never)}
              activeOpacity={0.85}
            >
              <Text style={styles.payButtonText}>Proceed to pay →</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  emptyStateText: { fontSize: 14, fontFamily: fonts.medium, color: "#5A6284", textAlign: "center" },
  browseButton: { paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12, backgroundColor: "#2D6BE0" },
  browseButtonText: { fontSize: 13.5, fontFamily: fonts.bold, color: "#fff" },
  content: { padding: 16, paddingBottom: 24, gap: 10 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: "#E7EBF1",
  },
  itemImageWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#EDF1F7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemImage: { width: "100%", height: "100%" },
  itemImageInitials: { fontSize: 12, fontFamily: fonts.bold, color: "#9AA6B2" },
  itemTextWrap: { flex: 1, minWidth: 0, gap: 2 },
  itemName: { fontSize: 13, fontFamily: fonts.semibold, color: "#12243D" },
  itemCategory: { fontSize: 11, fontFamily: fonts.regular, color: "#8A95A5" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F1F2F8",
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  stepperQty: { fontSize: 12, fontFamily: fonts.bold, color: "#12243D" },
  itemSubtotal: { fontSize: 13.5, fontFamily: fonts.bold, color: "#12243D", minWidth: 40, textAlign: "right" },
  clearCartButton: { alignSelf: "flex-start", paddingVertical: 4 },
  clearCartText: { fontSize: 12.5, fontFamily: fonts.semibold, color: "#C23B3B" },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7EBF1",
    gap: 8,
    marginTop: 4,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13, fontFamily: fonts.regular, color: "#5A6284" },
  summaryValue: { fontSize: 13, fontFamily: fonts.regular, color: "#5A6284" },
  summaryDivider: { height: 1, backgroundColor: "#E2E5F0", marginVertical: 4 },
  payableLabel: { fontSize: 15.5, fontFamily: fonts.bold, color: "#12243D" },
  payableValue: { fontSize: 15.5, fontFamily: fonts.bold, color: "#12243D" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E7EBF1",
  },
  footerPayableLabel: { fontSize: 11, fontFamily: fonts.regular, color: "#8A95A5" },
  footerPayableValue: { fontSize: 17, fontFamily: fonts.bold, color: "#12243D" },
  payButton: { paddingHorizontal: 22, paddingVertical: 13, borderRadius: 13, backgroundColor: "#2D6BE0" },
  payButtonText: { fontSize: 14.5, fontFamily: fonts.bold, color: "#fff" },
});
