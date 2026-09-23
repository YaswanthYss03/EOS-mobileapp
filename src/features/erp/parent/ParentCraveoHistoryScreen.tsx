import { View, Text } from "react-native";
import { formatDate } from "@/utils/calendar";
import { getChildCraveoOrders } from "@/services/api/parents.api";
import type { CraveoOrder, CraveoOrderStatus } from "@/services/api/craveo.api";
import { ParentHistoryShell, rowStyles } from "./ParentHistoryShell";

const STATUS_META: Record<CraveoOrderStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Pending", bg: "#FEF3C7", text: "#D97706" },
  placed: { label: "Placed", bg: "#EAF0FD", text: "#2F6FE0" },
  accepted: { label: "Accepted", bg: "#EAF0FD", text: "#2F6FE0" },
  preparing: { label: "Preparing", bg: "#EAF0FD", text: "#2F6FE0" },
  ready: { label: "Ready", bg: "#F0FDF4", text: "#16A34A" },
  collected: { label: "Collected", bg: "#F0FDF4", text: "#16A34A" },
  cancelled: { label: "Cancelled", bg: "#FEF2F2", text: "#DC2626" },
};

export function ParentCraveoHistoryScreen() {
  return (
    <ParentHistoryShell<CraveoOrder>
      title="Food Court"
      subtitle="Order history"
      emptyIcon="fast-food-outline"
      emptyText="No orders yet"
      fetchForChild={getChildCraveoOrders}
      keyFor={(order) => order.id}
      renderItem={(order) => <OrderCard order={order} />}
    />
  );
}

function OrderCard({ order }: { order: CraveoOrder }) {
  const meta = STATUS_META[order.status];
  const itemsLabel = order.items.map((i) => `${i.name} x${i.quantity}`).join(", ");
  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.topRow}>
        <Text style={rowStyles.title}>{itemsLabel || "Order"}</Text>
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
