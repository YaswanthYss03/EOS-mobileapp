import { View, Text } from "react-native";
import { formatDate } from "@/utils/calendar";
import { getChildLibraryHistory, type ParentChildBorrowRecord } from "@/services/api/parents.api";
import { ParentHistoryShell, rowStyles } from "./ParentHistoryShell";

const STATUS_META: Record<ParentChildBorrowRecord["status"], { label: string; bg: string; text: string }> = {
  borrowed: { label: "Borrowed", bg: "#EAF0FD", text: "#2F6FE0" },
  returned: { label: "Returned", bg: "#F0FDF4", text: "#16A34A" },
  lost: { label: "Lost", bg: "#FEF2F2", text: "#DC2626" },
  damaged: { label: "Damaged", bg: "#FEF2F2", text: "#DC2626" },
};

export function ParentLibraryHistoryScreen() {
  return (
    <ParentHistoryShell<ParentChildBorrowRecord>
      title="Library"
      subtitle="Borrow history"
      emptyIcon="library-outline"
      emptyText="No borrow records yet"
      fetchForChild={getChildLibraryHistory}
      keyFor={(record) => record.id}
      renderItem={(record) => <RecordCard record={record} />}
    />
  );
}

function RecordCard({ record }: { record: ParentChildBorrowRecord }) {
  const meta = STATUS_META[record.status];
  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.topRow}>
        <Text style={rowStyles.title}>{record.book.title}</Text>
        <View style={[rowStyles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[rowStyles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={rowStyles.metaText}>
        Borrowed {formatDate(new Date(record.borrowed_date))} · Due {formatDate(new Date(record.due_date))}
        {record.returned_date ? ` · Returned ${formatDate(new Date(record.returned_date))}` : ""}
      </Text>
      {record.is_overdue && <Text style={[rowStyles.metaText, { color: "#DC2626" }]}>Overdue</Text>}
    </View>
  );
}
