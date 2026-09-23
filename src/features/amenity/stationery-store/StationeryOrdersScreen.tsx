import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "@/theme";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import { listMyStationeryOrders, type StationeryOrder, type StationeryOrderStatus } from "@/services/api/stationery.api";

const STATUS_META: Record<StationeryOrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#C2822A", bg: "#FDF1E3" },
  confirmed: { label: "Confirmed", color: "#3D5CE0", bg: "#E8ECFB" },
  preparing: { label: "Preparing", color: "#3D5CE0", bg: "#E8ECFB" },
  ready_for_pickup: { label: "Ready for Pickup", color: "#7A4FD6", bg: "#F0E9FB" },
  collected: { label: "Collected", color: "#1E7A41", bg: "#E7F6EC" },
  cancelled: { label: "Cancelled", color: "#C23B3B", bg: "#FDEEEE" },
};

export function StationeryOrdersScreen() {
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
  const [orders, setOrders] = useState<StationeryOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    listMyStationeryOrders()
      .then((rows) => {
        setOrders(rows);
        setStatus("success");
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load your orders."));
        setStatus("error");
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
      </LinearGradient>

      {status === "loading" && <SkeletonListRows count={4} style={styles.content} />}
      {status === "error" && <Text style={styles.centerStateText}>{error}</Text>}
      {status === "success" && orders.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={36} color="#B9BFD6" />
          <Text style={styles.emptyStateText}>No orders yet</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.browseButtonText}>Browse Stationery</Text>
          </TouchableOpacity>
        </View>
      )}
      {status === "success" && orders.length > 0 && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {orders.map((order) => {
            const meta = STATUS_META[order.status];
            const expanded = expandedId === order.id;
            const itemCount = order.stationery_order_items.reduce((sum, i) => sum + i.quantity, 0);
            return (
              <View key={order.id} style={styles.orderCard}>
                <TouchableOpacity
                  style={styles.orderHeaderRow}
                  onPress={() => setExpandedId(expanded ? null : order.id)}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={styles.orderId}>Order #{order.id}</Text>
                    <Text style={styles.orderMeta}>
                      {formatDate(new Date(order.created_at))} · {itemCount} {itemCount === 1 ? "item" : "items"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 5 }}>
                    <Text style={styles.orderTotal}>₹{order.total_amount}</Text>
                    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {expanded && (
                  <View style={styles.expandedWrap}>
                    {order.stationery_order_items.map((item) => (
                      <View key={item.id} style={styles.expandedItemRow}>
                        <Text style={styles.expandedItemName}>
                          {item.product_name} × {item.quantity}
                        </Text>
                        <Text style={styles.expandedItemPrice}>₹{item.subtotal}</Text>
                      </View>
                    ))}
                    {order.pickup_token && (
                      <Text style={styles.pickupTokenText}>Pickup token: {order.pickup_token}</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
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
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingVertical: 40 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40 },
  emptyStateText: { fontSize: 14, fontFamily: fonts.medium, color: "#5A6284" },
  browseButton: { paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12, backgroundColor: "#2F6FE0" },
  browseButtonText: { fontSize: 13.5, fontFamily: fonts.bold, color: "#fff" },
  content: { padding: 16, gap: 12 },
  orderCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#EEF0F4", gap: 8 },
  orderHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontSize: 13.5, fontFamily: fonts.bold, color: "#1C2246" },
  orderMeta: { fontSize: 11.5, fontFamily: fonts.regular, color: "#8B92B0", marginTop: 2 },
  orderTotal: { fontSize: 14, fontFamily: fonts.bold, color: "#1C2246" },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10.5, fontFamily: fonts.bold },
  expandedWrap: { borderTopWidth: 1, borderTopColor: "#F0F1F7", paddingTop: 8, gap: 5 },
  expandedItemRow: { flexDirection: "row", justifyContent: "space-between" },
  expandedItemName: { fontSize: 12.5, fontFamily: fonts.regular, color: "#5A6284" },
  expandedItemPrice: { fontSize: 12.5, fontFamily: fonts.regular, color: "#5A6284" },
  pickupTokenText: { fontSize: 11.5, fontFamily: fonts.regular, color: "#8B92B0", marginTop: 4 },
});
