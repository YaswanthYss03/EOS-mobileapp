import { View, Text } from "react-native";
import { formatDate } from "@/utils/calendar";
import { getChildStationeryOrders } from "@/services/api/parents.api";
import type { StationeryOrder, StationeryOrderStatus } from "@/services/api/stationery.api";
import { ParentHistoryShell, rowStyles } from "./ParentHistoryShell";

const STATUS_META: Record<StationeryOrderStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Pending", bg: "#FEF3C7", text: "#D97706" },
  confirmed: { label: "Confirmed", bg: "#EAF0FD", text: "#2F6FE0" },
  preparing: { label: "Preparing", bg: "#EAF0FD", text: "#2F6FE0" },
  ready_for_pickup: { label: "Ready for Pickup", bg: "#F5F3FF", text: "#7C3AED" },
  collected: { label: "Collected", bg: "#F0FDF4", text: "#16A34A" },
  cancelled: { label: "Cancelled", bg: "#FEF2F2", text: "#DC2626" },
};

export function ParentStationeryHistoryScreen() {
  return (
    <ParentHistoryShell<StationeryOrder>
      title="Stationery Store"
      subtitle="Order history"
      emptyIcon="cart-outline"
      emptyText="No orders yet"
      fetchForChild={getChildStationeryOrders}
      keyFor={(order) => order.id}
      renderItem={(order) => <OrderCard order={order} />}
    />
  );
}

function OrderCard({ order }: { order: StationeryOrder }) {
  const meta = STATUS_META[order.status];
  const itemCount = order.stationery_order_items.reduce((sum, i) => sum + i.quantity, 0);
  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.topRow}>
        <Text style={rowStyles.title}>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </Text>
        <View style={[rowStyles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[rowStyles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={rowStyles.metaText}>
        {formatDate(new Date(order.created_at))} · ₹{order.total_amount}
        {order.pickup_token ? ` · Token ${order.pickup_token}` : ""}
      </Text>
    </View>
  );
}
