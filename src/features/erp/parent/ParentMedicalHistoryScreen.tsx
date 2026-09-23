import { View, Text } from "react-native";
import { formatDate } from "@/utils/calendar";
import { getChildMedicalAppointments } from "@/services/api/parents.api";
import type { MyAppointment, AppointmentStatus } from "@/services/api/medical-appointments.api";
import { ParentHistoryShell, rowStyles } from "./ParentHistoryShell";

const STATUS_META: Record<AppointmentStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Pending", bg: "#FEF3C7", text: "#D97706" },
  approved: { label: "Approved", bg: "#F0FDF4", text: "#16A34A" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" },
  cancelled: { label: "Cancelled", bg: "#F1F3F6", text: "#6B7280" },
};

export function ParentMedicalHistoryScreen() {
  return (
    <ParentHistoryShell<MyAppointment>
      title="Medical"
      subtitle="Appointment history"
      emptyIcon="medkit-outline"
      emptyText="No appointments yet"
      fetchForChild={getChildMedicalAppointments}
      keyFor={(appt) => appt.id}
      renderItem={(appt) => <AppointmentCard appt={appt} />}
    />
  );
}

function AppointmentCard({ appt }: { appt: MyAppointment }) {
  const meta = STATUS_META[appt.status];
  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.topRow}>
        <Text style={rowStyles.title}>{appt.reason ?? "Appointment"}</Text>
        <View style={[rowStyles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[rowStyles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={rowStyles.metaText}>
        {formatDate(new Date(appt.slot_date))} · {appt.slot_start} – {appt.slot_end}
      </Text>
      {appt.decision_note && <Text style={rowStyles.metaText}>{appt.decision_note}</Text>}
    </View>
  );
}
