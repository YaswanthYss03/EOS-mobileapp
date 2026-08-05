import { useCallback, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { formatDate } from "@/utils/calendar";
import {
  requestCategories,
  mockHrPayrollTickets,
  type HrPayrollTicket,
  type HrPayrollTicketStatus,
} from "./data/mockHrPayrollRequest";

const STATUS_META: Record<HrPayrollTicketStatus, { label: string; bg: string; text: string }> = {
  "under-review": { label: "Under Review", bg: "#EAF0FD", text: "#2F6FE0" },
  resolved: { label: "Resolved", bg: "#F0FDF4", text: "#16A34A" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" },
};

// TODO: this is a raise+track ticket UI over mockHrPayrollRequest - wire to a
// real HR/payroll ticketing backend endpoint once one exists. Reachable from
// the Employee/HoD dashboards' "HR Payroll" item - not to be confused with
// erp/hr-payroll/HrPayrollDashboard.tsx, the landing dashboard for the
// hr-payroll role itself.
export function HrPayrollRequestScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState<string | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [tickets, setTickets] = useState(mockHrPayrollTickets);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  function resetForm() {
    setCategory(null);
    setSubject("");
    setDescription("");
  }

  function handleAttachment() {
    toast.info("File attachments are coming soon");
  }

  function handleSubmit() {
    if (!category) {
      toast.warning("Select a request category");
      return;
    }
    if (!subject.trim()) {
      toast.warning("Add a subject for your request");
      return;
    }
    if (!description.trim()) {
      toast.warning("Describe your request");
      return;
    }
    const newTicket: HrPayrollTicket = {
      id: `local-${tickets.length}-${Date.now()}`,
      ticketNo: `HRM-2026-${100 + tickets.length + 20}`,
      category,
      subject: subject.trim(),
      description: description.trim(),
      status: "under-review",
      submittedOn: formatDate(new Date()),
      hrAssigned: "Unassigned",
    };
    setTickets((prev) => [newTicket, ...prev]);
    toast.success("Request submitted");
    resetForm();
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>HR Payroll</Text>
          <Text style={styles.headerSubtitle}>Payroll & HR queries</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Request Category</Text>
          <TouchableOpacity
            style={styles.selectRow}
            onPress={() => setCategoryPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectValue}>{category ?? "Select a category"}</Text>
            <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Revised PF contribution query"
            placeholderTextColor="#9AA6B2"
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your request in detail"
            placeholderTextColor="#9AA6B2"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity style={styles.attachButton} onPress={handleAttachment} activeOpacity={0.8}>
            <Ionicons name="attach-outline" size={16} color="#2F6FE0" />
            <Text style={styles.attachButtonText}>Attach a file (optional)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={styles.submitButtonText}>Submit Request</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Request Status</Text>
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </ScrollView>

      <Modal
        visible={categoryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCategoryPickerOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <Text style={styles.modalTitle}>Request Category</Text>
            {requestCategories.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.modalOptionRow}
                onPress={() => {
                  setCategory(option);
                  setCategoryPickerOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalOptionName}>{option}</Text>
                {category === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function TicketCard({ ticket }: { ticket: HrPayrollTicket }) {
  const meta = STATUS_META[ticket.status];

  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketNo}>{ticket.ticketNo}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.ticketSubject}>{ticket.subject}</Text>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>SUBMITTED</Text>
          <Text style={styles.metaValue}>{ticket.submittedOn}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>HR ASSIGNED</Text>
          <Text style={styles.metaValue}>{ticket.hrAssigned}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  headerSubtitle: {
    color: "#D7E2FA",
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#374151",
    marginBottom: 6,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  selectValue: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: "#111827",
    marginBottom: 14,
  },
  textArea: {
    height: 110,
    textAlignVertical: "top",
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#B7CBE6",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  attachButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 15,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  ticketNo: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  ticketSubject: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
