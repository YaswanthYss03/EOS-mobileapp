import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import {
  createHrQuery,
  listMyHrQueries,
  type HrQuery,
  type HrQueryStatus,
} from "@/services/api/hr-queries.api";
import { requestCategories } from "./data/mockHrPayrollRequest";

// Keyed on the values hr_payroll_requests_status_check actually allows:
// 'submitted' | 'under_review' | 'resolved'. There is deliberately no
// "rejected" entry - that state does not exist in the constraint, and the
// previous "under-review" (hyphen) key never matched a real row either.
const STATUS_META: Record<HrQueryStatus, { label: string; bg: string; text: string }> = {
  submitted: { label: "Submitted", bg: "#FFF7ED", text: "#B26A00" },
  under_review: { label: "Under Review", bg: "#EAF0FD", text: "#2F6FE0" },
  resolved: { label: "Resolved", bg: "#F0FDF4", text: "#16A34A" },
};

type LoadStatus = "loading" | "success" | "error";

// Raise + track HR help-desk tickets, wired to GET/POST /me/hr-queries (real
// hr_payroll_requests rows, self-scoped to the caller server-side).
//
// Reachable from the Employee/HoD/HR dashboards' "HR Payroll" item - not to be
// confused with erp/hr-payroll/HrPayrollDashboard.tsx (the landing dashboard for
// the hr-payroll role), nor with /me/hr-payroll, which is salary_payments.
export function HrPayrollRequestScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState<string | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [tickets, setTickets] = useState<HrQuery[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = useCallback(() => {
    setStatus("loading");
    setLoadError(null);
    listMyHrQueries()
      .then((rows) => {
        setTickets(rows);
        setStatus("success");
      })
      .catch((err) => {
        setLoadError(getApiErrorMessage(err, "Couldn't load your HR requests."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

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
    // Real POST. This used to build a ticket object locally and unshift it,
    // so a submitted request vanished on the next app launch and HR never saw
    // it - the ticket number was invented client-side too.
    setSubmitting(true);
    createHrQuery({
      category,
      subject: subject.trim(),
      description: description.trim(),
    })
      .then((created) => {
        setTickets((prev) => [created, ...prev]);
        toast.success("Request submitted");
        resetForm();
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't submit your request."));
      })
      .finally(() => setSubmitting(false));
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

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? "Submitting…" : "Submit Request"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Request Status</Text>

        {status === "loading" && (
          <View style={styles.listStateBlock}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {status === "error" && (
          <View style={styles.listStateBlock}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.listStateText}>{loadError ?? "Something went wrong."}</Text>
            <TouchableOpacity onPress={loadTickets} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === "success" && tickets.length === 0 && (
          <View style={styles.listStateBlock}>
            <Ionicons name="documents-outline" size={30} color="#B0B7C3" />
            <Text style={styles.listStateText}>You haven&apos;t raised any HR requests yet.</Text>
          </View>
        )}

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

function TicketCard({ ticket }: { ticket: HrQuery }) {
  // Falls back rather than crashing if the API ever returns a status this build
  // does not know: an unstyled badge beats a white screen.
  const meta = STATUS_META[ticket.status] ?? STATUS_META.submitted;

  return (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketNo}>{ticket.ticket_no}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.ticketSubject}>{ticket.subject}</Text>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>SUBMITTED</Text>
          <Text style={styles.metaValue}>{formatDate(new Date(ticket.created_at))}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>HR ASSIGNED</Text>
          <Text style={styles.metaValue}>{ticket.assigned_to_name ?? "Unassigned"}</Text>
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  listStateBlock: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 28,
  },
  listStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2F6FE0",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: fonts.bold,
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
