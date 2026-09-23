import { View, Text } from "react-native";
import { formatDate } from "@/utils/calendar";
import { getChildStationaryRequests } from "@/services/api/parents.api";
import type { MyStationaryRequest, StationaryRequestStatus } from "@/services/api/stationary.api";
import { ParentHistoryShell, rowStyles } from "./ParentHistoryShell";

const STATUS_META: Record<StationaryRequestStatus, { label: string; bg: string; text: string }> = {
  pending_payment: { label: "Payment pending", bg: "#FEF3C7", text: "#D97706" },
  paid: { label: "Paid", bg: "#EAF0FD", text: "#2F6FE0" },
  processing: { label: "Processing", bg: "#EAF0FD", text: "#2F6FE0" },
  ready_for_pickup: { label: "Ready for Pickup", bg: "#F5F3FF", text: "#7C3AED" },
  completed: { label: "Completed", bg: "#F0FDF4", text: "#16A34A" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" },
};

export function ParentStationaryHistoryScreen() {
  return (
    <ParentHistoryShell<MyStationaryRequest>
      title="Copy Center"
      subtitle="Print request history"
      emptyIcon="book-outline"
      emptyText="No print requests yet"
      fetchForChild={getChildStationaryRequests}
      keyFor={(req) => req.id}
      renderItem={(req) => <RequestCard request={req} />}
    />
  );
}

function RequestCard({ request }: { request: MyStationaryRequest }) {
  const meta = STATUS_META[request.status];
  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.topRow}>
        <Text style={rowStyles.title}>{request.file_summary ?? `Request #${request.id}`}</Text>
        <View style={[rowStyles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[rowStyles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={rowStyles.metaText}>
        {formatDate(new Date(request.created_at))} · {request.total_pages} pages · {request.copies}{" "}
        {request.copies === 1 ? "copy" : "copies"} · ₹{request.amount}
      </Text>
      {request.rejection_reason && <Text style={[rowStyles.metaText, { color: "#DC2626" }]}>{request.rejection_reason}</Text>}
    </View>
  );
}
