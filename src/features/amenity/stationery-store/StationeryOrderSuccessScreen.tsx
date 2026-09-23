import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { fonts } from "@/theme";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonDetailBlock, SkeletonListRows } from "@/components/ui/Skeleton";
import { getApiErrorMessage } from "@/services/api/client";
import { getMyStationeryOrder, type StationeryOrder } from "@/services/api/stationery.api";

const METHOD_LABEL: Record<string, string> = { wallet: "Wallet", razorpay: "UPI" };

export function StationeryOrderSuccessScreen({ orderId }: { orderId: number }) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [order, setOrder] = useState<StationeryOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyStationeryOrder(orderId)
      .then((o) => {
        setOrder(o);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load your order."));
        setStatus("error");
      });
  }, [orderId]);

  function done() {
    router.replace("/(tabs)/amenity/stationery-store" as never);
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 26 }]}
      >
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={26} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>Paid · order confirmed</Text>
        {order && (
          <Text style={styles.headerSubtitle}>
            ₹{order.total_amount} · {METHOD_LABEL[order.payment_method]}
          </Text>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {status === "loading" && (
          <>
            <SkeletonDetailBlock />
            <SkeletonListRows count={2} style={{ marginTop: 14 }} />
          </>
        )}
        {status === "error" && <Text style={styles.centerStateText}>{error}</Text>}
        {status === "success" && order && (
          <>
            <View style={styles.tokenCard}>
              <Text style={styles.tokenLabel}>PICKUP TOKEN</Text>
              <Text style={styles.tokenValue}>{order.pickup_token}</Text>
              {order.pickup_token && (
                <View style={styles.qrWrap}>
                  <QRCode value={order.pickup_token} size={120} />
                </View>
              )}
              <Text style={styles.tokenHint}>
                Show this token at the Stationery Counter to collect your order. Held for 30 minutes once ready.
              </Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>ORDER</Text>
              <View style={styles.itemsCard}>
                {order.stationery_order_items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.product_name} × {item.quantity}
                    </Text>
                    <Text style={styles.itemPrice}>₹{item.subtotal}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
        <TouchableOpacity style={styles.doneButton} onPress={done} activeOpacity={0.85}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: { alignItems: "center", gap: 8, paddingHorizontal: 24, paddingBottom: 22 },
  checkCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  headerSubtitle: { fontSize: 12.5, fontFamily: fonts.regular, color: "rgba(255,255,255,0.8)" },
  content: { padding: 20, paddingBottom: 24, gap: 14 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingVertical: 40 },
  tokenCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEF0F4",
  },
  tokenLabel: { fontSize: 11, fontFamily: fonts.bold, color: "#8B92B0", letterSpacing: 0.8 },
  tokenValue: { fontSize: 24, fontFamily: fonts.bold, color: "#181E3D", letterSpacing: 1 },
  qrWrap: { padding: 8 },
  tokenHint: { fontSize: 11.5, fontFamily: fonts.regular, color: "#8B92B0", textAlign: "center", lineHeight: 17 },
  sectionTitle: { fontSize: 12, fontFamily: fonts.bold, color: "#8B92B0", letterSpacing: 0.6, marginBottom: 10 },
  itemsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#EEF0F4", gap: 10 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  itemName: { flex: 1, fontSize: 12.5, fontFamily: fonts.regular, color: "#3A4066" },
  itemPrice: { fontSize: 12.5, fontFamily: fonts.bold, color: "#1C2246" },
  footer: { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#EEF0F4" },
  doneButton: { width: "100%", paddingVertical: 14, borderRadius: 13, backgroundColor: "#2F6FE0", alignItems: "center" },
  doneButtonText: { fontSize: 15, fontFamily: fonts.bold, color: "#fff" },
});
