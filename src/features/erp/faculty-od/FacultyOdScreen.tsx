import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
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
import { listFacultyOdForReview, reviewFacultyOdAsHr } from "@/services/api/faculty-od.api";
import { mockOtherStaffOdRequests, type FacultyOdRequest, type FacultyOdStatus } from "./data/mockFacultyOd";

type Tab = "faculty" | "others";
type StatusFilter = "pending" | "approved" | "rejected" | "all";
type LoadStatus = "loading" | "success" | "error";

const STATUS_FILTERS: StatusFilter[] = ["pending", "approved", "rejected", "all"];

function initialsFromName(name: string) {
  return name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function daysBetweenInclusive(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86400000) + 1;
}

// Combines the two real place/purpose columns into the single "REASON" slot
// this card already has (faculty_od_requests has no combined reason/remarks
// column) - no fabrication, just formatting two real fields into one line.
function combineReason(place: string | null, purpose: string | null): string {
  if (purpose && place) return `${purpose} — ${place}`;
  return purpose ?? place ?? "";
}

// Wired to GET/PATCH /me/faculty-od (real faculty_od_requests rows) for the
// Faculty tab - this HR Payroll caller sees every faculty member's requests
// (the backend only self-scopes the FACULTY role, not HR_PAYROLL/HOD), but
// only ones the HoD has already approved - the backend force-filters
// hod_approval_status='approved' for HR_PAYROLL callers, so a request still
// awaiting HoD review never appears here at all (there would be nothing for
// HR to act on yet - see FacultyOdService.findAll). overall_status drives
// the pending/approved/rejected pills and badge - "pending" here always
// means "HoD approved, awaiting HR", never "awaiting HoD".
// faculty_od_requests has no department column, so the card subtitle
// shows designation only (no "· CSE" suffix). The Others (non-teaching
// staff) tab has no backend module at all yet and stays on mock data,
// standalone from the HoD's existing Student/Faculty On Duty screen (see
// erp/od/OdScreen.tsx).
export function FacultyOdScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("faculty");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  const [facultyStatus, setFacultyStatus] = useState<LoadStatus>("loading");
  const [facultyError, setFacultyError] = useState<string | null>(null);
  const [facultyRequests, setFacultyRequests] = useState<FacultyOdRequest[]>([]);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const [otherRequests, setOtherRequests] = useState(mockOtherStaffOdRequests);

  const loadFacultyRequests = useCallback(() => {
    setFacultyStatus("loading");
    setFacultyError(null);
    listFacultyOdForReview()
      .then((rows) => {
        setFacultyRequests(
          rows.map((row) => ({
            id: String(row.id),
            name: `${row.faculty.first_name} ${row.faculty.last_name}`,
            subtitle: row.faculty.designation,
            fromDate: formatDate(new Date(row.from_date)),
            toDate: formatDate(new Date(row.to_date)),
            days: daysBetweenInclusive(row.from_date, row.to_date),
            reason: combineReason(row.place, row.purpose),
            status: row.overall_status,
          })),
        );
        setFacultyStatus("success");
      })
      .catch((err) => {
        setFacultyError(getApiErrorMessage(err, "Couldn't load faculty OD requests."));
        setFacultyStatus("error");
      });
  }, []);

  useEffect(() => {
    loadFacultyRequests();
  }, [loadFacultyRequests]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const requests = tab === "faculty" ? facultyRequests : otherRequests;

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
      all: requests.length,
    }),
    [requests],
  );

  const filteredRequests = useMemo(
    () => (statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter)),
    [requests, statusFilter],
  );

  function updateOtherStatus(id: string, status: FacultyOdStatus) {
    setOtherRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function handleApprove(id: string) {
    if (tab === "others") {
      updateOtherStatus(id, "approved");
      toast.success("On-duty request approved");
      return;
    }

    setActingOnId(id);
    reviewFacultyOdAsHr(Number(id), "approved")
      .then(() => {
        toast.success("On-duty request approved");
        loadFacultyRequests();
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't approve this OD request."));
      })
      .finally(() => setActingOnId(null));
  }

  function handleReject(id: string) {
    if (tab === "others") {
      updateOtherStatus(id, "rejected");
      toast.info("On-duty request rejected");
      return;
    }

    setActingOnId(id);
    reviewFacultyOdAsHr(Number(id), "rejected")
      .then(() => {
        toast.info("On-duty request rejected");
        loadFacultyRequests();
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't reject this OD request."));
      })
      .finally(() => setActingOnId(null));
  }

  function switchTab(nextTab: Tab) {
    setTab(nextTab);
    setStatusFilter("pending");
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
          <Text style={styles.headerTitle}>On Duty</Text>
          <Text style={styles.headerSubtitle}>
            {tab === "faculty" ? "Faculty OD requests" : "Support staff OD requests"}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.tabSwitch}>
        <TouchableOpacity
          style={[styles.tabSwitchButton, tab === "faculty" && styles.tabSwitchButtonActive]}
          onPress={() => switchTab("faculty")}
        >
          <Text style={[styles.tabSwitchText, tab === "faculty" && styles.tabSwitchTextActive]}>Faculty</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabSwitchButton, tab === "others" && styles.tabSwitchButtonActive]}
          onPress={() => switchTab("others")}
        >
          <Text style={[styles.tabSwitchText, tab === "others" && styles.tabSwitchTextActive]}>Others</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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

        {tab === "faculty" && facultyStatus === "loading" ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        ) : tab === "faculty" && facultyStatus === "error" ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.emptyStateText}>{facultyError ?? "Something went wrong."}</Text>
            <TouchableOpacity onPress={loadFacultyRequests} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {filteredRequests.map((request) => (
              <FacultyOdCard
                key={request.id}
                request={request}
                isActing={actingOnId === request.id}
                onApprove={() => handleApprove(request.id)}
                onReject={() => handleReject(request.id)}
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

function FacultyOdCard({
  request,
  isActing = false,
  onApprove,
  onReject,
}: {
  request: FacultyOdRequest;
  isActing?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { name, subtitle, fromDate, toDate, days, reason, status } = request;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.dateRow}>
        <View style={styles.dateCol}>
          <Text style={styles.dateLabel}>FROM DATE</Text>
          <Text style={styles.dateValue}>{fromDate}</Text>
        </View>
        <View style={styles.dateCol}>
          <Text style={styles.dateLabel}>TO DATE</Text>
          <Text style={styles.dateValue}>{toDate}</Text>
        </View>
        <View style={styles.dateCol}>
          <Text style={styles.dateLabel}>NO. OF DAYS</Text>
          <Text style={styles.dateValue}>
            {days} day{days > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {reason && (
        <>
          <Text style={styles.reasonLabel}>REASON</Text>
          <Text style={styles.reasonText}>{reason}</Text>
        </>
      )}

      {status === "pending" ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={onReject}
            activeOpacity={0.85}
            disabled={isActing}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={onApprove}
            activeOpacity={0.85}
            disabled={isActing}
          >
            {isActing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.approveButtonText}>Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.statusBadge,
            status === "approved" ? styles.statusBadgeApproved : styles.statusBadgeRejected,
          ]}
        >
          <Ionicons
            name={status === "approved" ? "checkmark-circle" : "close-circle"}
            size={14}
            color={status === "approved" ? "#16A34A" : "#DC2626"}
          />
          <Text style={[styles.statusBadgeText, { color: status === "approved" ? "#16A34A" : "#DC2626" }]}>
            {status === "approved" ? "Approved" : "Rejected"}
          </Text>
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
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 10,
  },
  tabSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabSwitchTextActive: {
    color: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  dateRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  dateValue: {
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeApproved: {
    backgroundColor: "#F0FDF4",
  },
  statusBadgeRejected: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
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
  inlineLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  retryButton: {
    marginTop: 4,
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
});
