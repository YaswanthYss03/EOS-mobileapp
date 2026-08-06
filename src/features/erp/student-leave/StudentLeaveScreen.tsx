import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { formatDate } from "@/utils/calendar";
import {
  getStudentLeaveRequests,
  facultyApproveLeave,
  type StudentLeaveRequest,
} from "@/services/api/student-leaves.api";

// A Class Mentor's own approve is "faculty_approved", not a terminal
// "approved" - the HoD still has the final say (see hod-approve, out of
// scope on this screen). Grouped here as one "Approved" pill since once the
// mentor has acted, it's off their own queue either way.
type StatusFilter = "pending" | "approved" | "rejected" | "all";

const STATUS_FILTERS: StatusFilter[] = ["pending", "approved", "rejected", "all"];

function matchesFilter(status: StudentLeaveRequest["status"], filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "approved") return status === "faculty_approved" || status === "hod_approved";
  return status === filter;
}

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Wired to EOS-backend's student-leaves module (see
// @/services/api/student-leaves.api.ts) - the caller's own Class Mentor
// review queue (every leave request from a student in a class they mentor,
// via class_mentors). Reachable from the Employee dashboard's Student
// "Student Leave" item. Distinct from the HoD's department-wide
// student/faculty leave view (see erp/leave), which is a separate,
// still-mock screen.
export function StudentLeaveScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [requests, setRequests] = useState<StudentLeaveRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);

    getStudentLeaveRequests()
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrored(true);
        toast.error(getApiErrorMessage(error, "Couldn't load your review queue. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const counts = useMemo(() => {
    const list = requests ?? [];
    return {
      pending: list.filter((r) => matchesFilter(r.status, "pending")).length,
      approved: list.filter((r) => matchesFilter(r.status, "approved")).length,
      rejected: list.filter((r) => matchesFilter(r.status, "rejected")).length,
      all: list.length,
    };
  }, [requests]);

  const filteredRequests = useMemo(
    () => (requests ?? []).filter((r) => matchesFilter(r.status, statusFilter)),
    [requests, statusFilter],
  );

  // The distinct sections this mentor covers - shown instead of a single
  // hardcoded section, since class_mentors supports mentoring more than
  // one class (unlike the old mock's single "III CSE-A" assumption).
  const sectionsCovered = useMemo(() => {
    const labels = new Set<string>();
    for (const r of requests ?? []) {
      if (r.student.section) labels.add(`${r.student.department_name ?? "—"} - ${r.student.section}`);
    }
    return Array.from(labels);
  }, [requests]);

  function handleDecision(id: number, decision: "approved" | "rejected") {
    setDecidingId(id);
    facultyApproveLeave(id, decision)
      .then((updated) => {
        setRequests((prev) => (prev ? prev.map((r) => (r.id === id ? updated : r)) : prev));
        if (decision === "approved") toast.success("Leave approved - forwarded to the HoD for final approval");
        else toast.info("Leave rejected");
      })
      .catch((error) =>
        toast.error(getApiErrorMessage(error, "Couldn't record your decision. Please try again.")),
      )
      .finally(() => setDecidingId(null));
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
          <Text style={styles.headerTitle}>Student Leave</Text>
          <Text style={styles.headerSubtitle}>Leave applications</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color="#2F6FE0" />
            <Text style={styles.centerStateText}>Loading...</Text>
          </View>
        ) : errored ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Couldn't load your review queue.</Text>
            <TouchableOpacity onPress={() => setReloadToken((n) => n + 1)} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.contextCard}>
              <View style={styles.contextIconWrap}>
                <Ionicons name="school-outline" size={16} color="#2F6FE0" />
              </View>
              <View style={styles.contextTextWrap}>
                <Text style={styles.contextTitle}>
                  {sectionsCovered.length > 0 ? sectionsCovered.join(" · ") : "No mentored class yet"}
                </Text>
                <Text style={styles.contextSubtitle}>{counts.all} leave requests · Class Mentor</Text>
              </View>
              <View style={styles.myClassBadge}>
                <Text style={styles.myClassBadgeText}>MY CLASS</Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              {STATUS_FILTERS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusPill, statusFilter === status && styles.statusPillActive]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[styles.statusPillText, statusFilter === status && styles.statusPillTextActive]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)} ({counts[status]})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredRequests.map((request) => (
              <StudentLeaveCard
                key={request.id}
                request={request}
                deciding={decidingId === request.id}
                onApprove={() => handleDecision(request.id, "approved")}
                onReject={() => handleDecision(request.id, "rejected")}
              />
            ))}

            {filteredRequests.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
                <Text style={styles.emptyStateText}>No requests here</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const STATUS_META: Record<StudentLeaveRequest["status"], { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: "Pending", bg: "#FEF3C7", text: "#D97706", icon: "time-outline" },
  faculty_approved: { label: "Approved · awaiting HoD", bg: "#F0FDF4", text: "#16A34A", icon: "checkmark-circle" },
  hod_approved: { label: "Approved", bg: "#F0FDF4", text: "#16A34A", icon: "checkmark-circle" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626", icon: "close-circle" },
};

function StudentLeaveCard({
  request,
  deciding,
  onApprove,
  onReject,
}: {
  request: StudentLeaveRequest;
  deciding: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { student, from_date, to_date, reason, status } = request;
  const meta = STATUS_META[status];
  const classLabel = student.section
    ? `${student.department_name ?? "—"} - ${student.section}`
    : "No class assigned";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(student.name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>{student.name}</Text>
          <Text style={styles.cardSubtitle}>
            {student.student_id_no} · {classLabel}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>FROM</Text>
          <Text style={styles.metaValue}>{formatDate(new Date(from_date))}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>TO</Text>
          <Text style={styles.metaValue}>{formatDate(new Date(to_date))}</Text>
        </View>
      </View>

      <Text style={styles.reasonLabel}>REASON</Text>
      <Text style={styles.reasonText}>{reason ?? "—"}</Text>

      {status === "pending" ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.rejectButton, deciding && styles.buttonDisabled]}
            onPress={onReject}
            activeOpacity={0.85}
            disabled={deciding}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.approveButton, deciding && styles.buttonDisabled]}
            onPress={onApprove}
            activeOpacity={0.85}
            disabled={deciding}
          >
            {deciding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.approveButtonText}>Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={14} color={meta.text} />
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      )}
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
  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  contextIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  contextTextWrap: {
    flex: 1,
  },
  contextTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  contextSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  myClassBadge: {
    backgroundColor: "#E4EBFB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  myClassBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  statusPill: {
    flexGrow: 1,
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusPillActive: {
    borderColor: "#2F6FE0",
    borderWidth: 1.5,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  statusPillTextActive: {
    color: "#2F6FE0",
  },
  card: {
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  cardHeaderTextWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
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
  reasonLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  reasonText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#374151",
    lineHeight: 18,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    paddingVertical: 10,
  },
  rejectButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#DC2626",
  },
  approveButton: {
    flex: 1.4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    paddingVertical: 10,
  },
  approveButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
  },
  centerState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  centerStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
});
