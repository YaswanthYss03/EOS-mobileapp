import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnimatedTabBar, TabTransitionView, useTabScrollMemory } from "@/components/ui/tabs";
import { useRole } from "@/hooks/useRole";
import { useSkipSharedHeaderToggle } from "@/hooks/useSkipSharedHeaderToggle";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getHodStudentLeaveRequests,
  hodApproveLeave,
  type StudentLeaveRequest,
} from "@/services/api/student-leaves.api";
import { getHodStudentOdRequests, hodApproveOd, type StudentOdRequest } from "@/services/api/student-ods.api";
import { getHodFacultyLeaves, hodApproveFacultyLeave, type MyFacultyLeave } from "@/services/api/faculty-leaves.api";
import { getHodFacultyOds, hodApproveFacultyOd, type MyFacultyOd } from "@/services/api/faculty-od.api";
import type { ApprovalRequest, ApprovalStatus } from "../types";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

type Tab = "student" | "faculty";
// "History" covers both approved and rejected together - there's no
// separate filter for each anymore, just "still needs a decision" vs
// "already decided".
type SubTab = "pending" | "history";
type LoadStatus = "loading" | "success" | "error";

function initialsFromName(name: string) {
  return name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
  const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

// student_leaves.status has no bare "pending" relevance for a HoD (the
// mentor hasn't reviewed it yet) - the backend already excludes it by
// default, this is just a defensive guard against a stray row.
function mapStudentLeave(row: StudentLeaveRequest): ApprovalRequest | null {
  const statusMap: Record<string, ApprovalStatus | undefined> = {
    faculty_approved: "pending",
    hod_approved: "approved",
    rejected: "rejected",
  };
  const status = statusMap[row.status];
  if (!status) return null;
  return {
    id: String(row.id),
    name: row.student.name,
    subtitle: `${row.student.student_id_no}${row.student.section ? ` · ${row.student.section}` : ""}`,
    fromDate: formatDate(row.from_date),
    toDate: formatDate(row.to_date),
    days: daysBetween(row.from_date, row.to_date),
    reason: row.reason ?? "No reason provided",
    status,
  };
}

function mapStudentOd(row: StudentOdRequest): ApprovalRequest | null {
  const status = row.hod_approval_status;
  if (!status) return null;
  return {
    id: String(row.id),
    name: row.creator.name,
    subtitle: `${row.creator.student_id_no}${row.creator.section ? ` · ${row.creator.section}` : ""}`,
    fromDate: formatDate(row.from_date),
    toDate: formatDate(row.to_date),
    days: daysBetween(row.from_date, row.to_date),
    reason: row.reason ?? "No reason provided",
    status,
  };
}

function facultySubtitle(faculty: { designation: string; departments: { code: string } | null } | undefined) {
  if (!faculty) return "";
  return faculty.departments ? `${faculty.designation} · ${faculty.departments.code}` : faculty.designation;
}

function mapFacultyLeave(row: MyFacultyLeave): ApprovalRequest {
  return {
    id: String(row.id),
    name: row.faculty ? `${row.faculty.first_name} ${row.faculty.last_name}`.trim() : "Faculty",
    subtitle: facultySubtitle(row.faculty),
    fromDate: formatDate(row.from_date),
    toDate: formatDate(row.to_date),
    days: daysBetween(row.from_date, row.to_date),
    reason: row.reason ?? "No reason provided",
    status: row.hod_approval_status,
  };
}

function mapFacultyOd(row: MyFacultyOd): ApprovalRequest {
  return {
    id: String(row.id),
    name: row.faculty ? `${row.faculty.first_name} ${row.faculty.last_name}`.trim() : "Faculty",
    subtitle: facultySubtitle(row.faculty),
    fromDate: formatDate(row.from_date),
    toDate: formatDate(row.to_date),
    days: daysBetween(row.from_date, row.to_date),
    reason: row.purpose ?? row.place ?? "No reason provided",
    status: row.hod_approval_status,
  };
}

type Props = {
  kind: "leave" | "od";
  title: string;
  studentHeaderSubtitle: string;
  facultyHeaderSubtitle: string;
};

// Shared HoD approve/reject workflow screen - Leave and On Duty are both
// thin wrappers over this (same layout: Student/Faculty toggle, status
// filters, request cards). See src/features/erp/leave/LeaveScreen.tsx and
// src/features/erp/od/OdScreen.tsx. Student requests only ever reach here
// once already approved by the class mentor faculty (see mapStudentLeave/
// mapStudentOd); a HoD's own Approve/Reject is the final stage for those,
// and the FIRST stage for a faculty member's own leave/OD (which then
// still needs HR's separate sign-off, out of scope on this screen).
export function ApprovalRequestsScreen({ kind, title, studentHeaderSubtitle, facultyHeaderSubtitle }: Props) {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const role = useRole();
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();

  // HOD is this screen's only caller now (see HodAcademicsScreen.tsx's
  // ?tab=student and HodFacultyScreen.tsx's ?tab=faculty tiles - each
  // reaches this screen wanting ONLY that one side, never both), so the
  // Student/Faculty toggle below is hidden entirely for that role - `tab`
  // just stays whatever the URL asked for, never user-changeable.
  const isHod = role === "hod";
  const skipHeaderToggle = useSkipSharedHeaderToggle();
  const [tab] = useState<Tab>(initialTab === "faculty" ? "faculty" : "student");
  const [subTab, setSubTab] = useState<SubTab>("pending");

  const [studentStatus, setStudentStatus] = useState<LoadStatus>("loading");
  const [studentError, setStudentError] = useState<string | null>(null);
  const [studentRequests, setStudentRequests] = useState<ApprovalRequest[]>([]);

  const [facultyStatus, setFacultyStatus] = useState<LoadStatus>("loading");
  const [facultyError, setFacultyError] = useState<string | null>(null);
  const [facultyRequests, setFacultyRequests] = useState<ApprovalRequest[]>([]);

  const [actingId, setActingId] = useState<string | null>(null);
  const scrollMemory = useTabScrollMemory();

  const loadStudent = useCallback(() => {
    setStudentStatus("loading");
    setStudentError(null);
    const request =
      kind === "leave"
        ? getHodStudentLeaveRequests().then((rows) => rows.map(mapStudentLeave).filter((r): r is ApprovalRequest => r !== null))
        : getHodStudentOdRequests().then((rows) => rows.map(mapStudentOd).filter((r): r is ApprovalRequest => r !== null));

    request
      .then((rows) => {
        setStudentRequests(rows);
        setStudentStatus("success");
      })
      .catch((err) => {
        setStudentError(getApiErrorMessage(err, "Couldn't load requests."));
        setStudentStatus("error");
      });
  }, [kind]);

  const loadFaculty = useCallback(() => {
    setFacultyStatus("loading");
    setFacultyError(null);
    const request =
      kind === "leave"
        ? getHodFacultyLeaves().then((rows) => rows.map(mapFacultyLeave))
        : getHodFacultyOds().then((rows) => rows.map(mapFacultyOd));

    request
      .then((rows) => {
        setFacultyRequests(rows);
        setFacultyStatus("success");
      })
      .catch((err) => {
        setFacultyError(getApiErrorMessage(err, "Couldn't load requests."));
        setFacultyStatus("error");
      });
  }, [kind]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  useEffect(() => {
    loadFaculty();
  }, [loadFaculty]);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the ERP employee/hod
  // dashboards and the attendance screen. Skipped for HOD - that role's
  // Class tab now keeps the shared header statically off the whole time
  // (see app/(tabs)/_layout.tsx's isHodActingAsHod), and this screen's own
  // cleanup resetting headerShown back to true on blur was leaking through
  // to whichever screen the HOD navigated back to (HodAcademicsScreen/
  // HodFacultyScreen, neither of which toggles it themselves), showing that
  // screen's own inline header AND the shared CollegeHeader at once.
  useFocusEffect(
    useCallback(() => {
      if (skipHeaderToggle) return undefined;
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation, skipHeaderToggle]),
  );

  const requests = tab === "student" ? studentRequests : facultyRequests;
  const loadStatus = tab === "student" ? studentStatus : facultyStatus;
  const loadError = tab === "student" ? studentError : facultyError;
  const reload = tab === "student" ? loadStudent : loadFaculty;

  const filteredRequests = useMemo(
    () =>
      subTab === "pending"
        ? requests.filter((r) => r.status === "pending")
        : requests.filter((r) => r.status !== "pending"),
    [requests, subTab],
  );

  function handleDecision(id: string, decision: "approved" | "rejected") {
    if (actingId !== null) return;
    setActingId(id);
    const numericId = Number(id);

    const call =
      tab === "student"
        ? kind === "leave"
          ? hodApproveLeave(numericId, decision)
          : hodApproveOd(numericId, decision)
        : kind === "leave"
          ? hodApproveFacultyLeave(numericId, decision)
          : hodApproveFacultyOd(numericId, decision);

    call
      .then(() => {
        toast[decision === "approved" ? "success" : "info"](
          `${title} request ${decision === "approved" ? "approved" : "rejected"}`,
        );
        tab === "student" ? loadStudent() : loadFaculty();
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't submit your decision.")))
      .finally(() => setActingId(null));
  }

  // Only relevant for the faculty tab, and not subTab-dependent - kept as a
  // closure helper (like StudentHostelScreen's renderRoomCard) since it
  // needs to render identically inside both the pending and history
  // ScrollViews below now that those are split apart for the subTab
  // transition, reproducing the original "scrolls away with the list"
  // behavior instead of duplicating the JSX by hand.
  function renderContextCard() {
    if (tab !== "faculty") return null;
    return (
      <View style={styles.contextCard}>
        <View style={styles.contextIconWrap}>
          <Ionicons name="business-outline" size={16} color="#2F6FE0" />
        </View>
        <View style={styles.contextTextWrap}>
          <Text style={styles.contextTitle}>Head of Department</Text>
          <Text style={styles.contextSubtitle}>Faculty {title.toLowerCase()} requests</Text>
        </View>
        <View style={styles.myDeptBadge}>
          <Text style={styles.myDeptBadgeText}>MY DEPT</Text>
        </View>
      </View>
    );
  }

  function renderRequestList() {
    return (
      <>
        {loadStatus === "loading" && <SkeletonListRows count={4} />}

        {loadStatus === "error" && <ErrorNotice message={loadError ?? "Something went wrong."} onRetry={reload} />}

        {loadStatus === "success" &&
          filteredRequests.map((request) => (
            <ApprovalRequestCard
              key={request.id}
              request={request}
              acting={actingId === request.id}
              onApprove={() => handleDecision(request.id, "approved")}
              onReject={() => handleDecision(request.id, "rejected")}
            />
          ))}

        {loadStatus === "success" && filteredRequests.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No requests here</Text>
          </View>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
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
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>
            {tab === "student" ? studentHeaderSubtitle : facultyHeaderSubtitle}
          </Text>
        </View>
      </LinearGradient>

      <TabTransitionView activeKey={tab} order={["student", "faculty"]} style={styles.tabContentArea}>
        <View style={styles.tabContentArea}>
          {/* Same AnimatedTabBar pill/sliding-indicator design and
              TabTransitionView slide/fade content animation as the
              Student/Faculty tab above - not a separate bordered-pill
              toggle anymore. */}
          <View style={styles.subTabSwitchWrap}>
            <AnimatedTabBar
              tabs={[
                { key: "pending" as SubTab, label: "Pending" },
                { key: "history" as SubTab, label: "History" },
              ]}
              active={subTab}
              onChange={setSubTab}
              containerStyle={styles.subTabSwitch}
              tabStyle={styles.subTabButton}
              tabTextStyle={styles.subTabText}
              activeTabTextStyle={styles.subTabTextActive}
              indicatorStyle={styles.subTabIndicator}
            />
          </View>

          <TabTransitionView activeKey={subTab} order={["pending", "history"]} style={styles.tabContentArea}>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind(`${tab}-${subTab}`)}
            >
              {renderContextCard()}
              {renderRequestList()}
            </ScrollView>
          </TabTransitionView>
        </View>
      </TabTransitionView>
    </SafeAreaView>
  );
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorNotice}>
      <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
      <Text style={styles.errorNoticeText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.8}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function ApprovalRequestCard({
  request,
  acting,
  onApprove,
  onReject,
}: {
  request: ApprovalRequest;
  acting: boolean;
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

      <Text style={styles.reasonLabel}>REASON</Text>
      <Text style={styles.reasonText}>{reason}</Text>

      {status === "pending" ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.rejectButton, acting && styles.actionButtonDisabled]}
            onPress={onReject}
            activeOpacity={0.85}
            disabled={acting}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.approveButton, acting && styles.actionButtonDisabled]}
            onPress={onApprove}
            activeOpacity={0.85}
            disabled={acting}
          >
            {acting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.approveButtonText}>Approve</Text>}
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
          <Text
            style={[
              styles.statusBadgeText,
              { color: status === "approved" ? "#16A34A" : "#DC2626" },
            ]}
          >
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
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
  tabContentArea: {
    flex: 1,
  },
  // Top inset moved here from `content` (subTab bar is hoisted above the
  // scrolling list, pinned) so total spacing matches the original instead
  // of doubling up.
  subTabSwitchWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  content: {
    paddingHorizontal: 16,
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
  myDeptBadge: {
    backgroundColor: "#E4EBFB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  myDeptBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    letterSpacing: 0.5,
  },
  // Same white pill-track + sliding-indicator design as tabSwitch above
  // (the Student/Faculty tab) - no marginHorizontal here since
  // subTabSwitchWrap already supplies the matching 16px side padding.
  subTabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  subTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 10,
  },
  subTabIndicator: {
    top: 0,
    bottom: 0,
    borderRadius: 9,
    backgroundColor: "#2F6FE0",
  },
  subTabText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  subTabTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  cardHeaderTextWrap: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
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
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
    marginTop: 2,
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    paddingVertical: 10,
  },
  actionButtonDisabled: {
    opacity: 0.6,
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
});
