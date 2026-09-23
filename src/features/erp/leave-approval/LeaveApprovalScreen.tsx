import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnimatedTabBar, TabTransitionView, useTabScrollMemory } from "@/components/ui/tabs";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { formatDate } from "@/utils/calendar";
import {
  getCorrespondentLeaveRequests,
  correspondentApproveLeave,
  type MyFacultyLeave,
} from "@/services/api/faculty-leaves.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  getCorrespondentOdRequests,
  correspondentApproveOd,
  type MyFacultyOd,
} from "@/services/api/faculty-od.api";

// Correspondent's own approve/reject is terminal for both Leave and OD -
// unlike the Student Leave mentor stage this screen's UI is modeled on,
// there is no further stage after Correspondent for a Principal's request
// (see faculty-leaves.service.ts/faculty-od.service.ts's own
// computeOverallStatus, which reads correspondent_approval_status alone for
// these rows). "History" covers both approved and rejected together, same
// Approval/History split as the reference screen this was modeled on.
type Section = "leave" | "od";
type Tab = "approval" | "history";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Wired to EOS-backend's faculty-leaves AND faculty-od modules (see
// @/services/api/faculty-leaves.api.ts's getCorrespondentLeaveRequests/
// correspondentApproveLeave and faculty-od.api.ts's equivalents) - the
// caller's full Correspondent review queue: every Principal-authored leave
// AND on-duty request (correspondent_approval_status non-null on either
// table). One page, a Leave/OD section switcher up top, each with its own
// Approval/History split - the "Approvals" tile for a Correspondent login
// (see CorrespondentDashboard.tsx), replacing what that same tile shows a
// Principal (purchase/maintenance approvals - see
// src/features/erp/principal/approvals/ApprovalsScreen.tsx, unrelated).
export function LeaveApprovalScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [section, setSection] = useState<Section>("leave");
  const [tab, setTab] = useState<Tab>("approval");
  const scrollMemory = useTabScrollMemory();

  const [leaveRequests, setLeaveRequests] = useState<MyFacultyLeave[] | null>(null);
  const [odRequests, setOdRequests] = useState<MyFacultyOd[] | null>(null);
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

    Promise.all([getCorrespondentLeaveRequests(), getCorrespondentOdRequests()])
      .then(([leaves, ods]) => {
        if (cancelled) return;
        setLeaveRequests(leaves);
        setOdRequests(ods);
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

  const leaveApproval = useMemo(
    () => (leaveRequests ?? []).filter((r) => r.correspondent_approval_status === "pending"),
    [leaveRequests],
  );
  const leaveHistory = useMemo(
    () => (leaveRequests ?? []).filter((r) => r.correspondent_approval_status !== "pending"),
    [leaveRequests],
  );
  const odApproval = useMemo(
    () => (odRequests ?? []).filter((r) => r.correspondent_approval_status === "pending"),
    [odRequests],
  );
  const odHistory = useMemo(
    () => (odRequests ?? []).filter((r) => r.correspondent_approval_status !== "pending"),
    [odRequests],
  );

  const totalCount = section === "leave" ? (leaveRequests?.length ?? 0) : (odRequests?.length ?? 0);
  const approvalCount = section === "leave" ? leaveApproval.length : odApproval.length;

  function handleLeaveDecision(id: number, decision: "approved" | "rejected") {
    setDecidingId(id);
    correspondentApproveLeave(id, decision)
      .then((updated) => {
        setLeaveRequests((prev) => (prev ? prev.map((r) => (r.id === id ? updated : r)) : prev));
        if (decision === "approved") toast.success("Leave approved");
        else toast.info("Leave rejected");
      })
      .catch((error) =>
        toast.error(getApiErrorMessage(error, "Couldn't record your decision. Please try again.")),
      )
      .finally(() => setDecidingId(null));
  }

  function handleOdDecision(id: number, decision: "approved" | "rejected") {
    setDecidingId(id);
    correspondentApproveOd(id, decision)
      .then((updated) => {
        setOdRequests((prev) => (prev ? prev.map((r) => (r.id === id ? updated : r)) : prev));
        if (decision === "approved") toast.success("On-duty request approved");
        else toast.info("On-duty request rejected");
      })
      .catch((error) =>
        toast.error(getApiErrorMessage(error, "Couldn't record your decision. Please try again.")),
      )
      .finally(() => setDecidingId(null));
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
          <Text style={styles.headerTitle}>Approvals</Text>
          <Text style={styles.headerSubtitle}>Principal leave and on-duty requests</Text>
        </View>
      </LinearGradient>

      {loading ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SkeletonListRows count={4} />
        </ScrollView>
      ) : errored ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Couldn't load your review queue.</Text>
            <TouchableOpacity onPress={() => setReloadToken((n) => n + 1)} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.sectionSwitchWrap}>
            <AnimatedTabBar
              tabs={[
                { key: "leave" as Section, label: "Leave" },
                { key: "od" as Section, label: "OD" },
              ]}
              active={section}
              onChange={(next) => {
                setSection(next);
                setTab("approval");
              }}
              containerStyle={styles.sectionSwitch}
              tabStyle={styles.sectionSwitchButton}
              tabTextStyle={styles.sectionSwitchText}
              activeTabTextStyle={styles.sectionSwitchTextActive}
              indicatorStyle={styles.sectionSwitchIndicator}
            />
          </View>

          <View style={styles.tabSwitchWrap}>
            <AnimatedTabBar
              tabs={[
                { key: "approval" as Tab, label: `Approval ${approvalCount > 0 ? `(${approvalCount})` : ""}`.trimEnd() },
                { key: "history" as Tab, label: "History" },
              ]}
              active={tab}
              onChange={setTab}
              containerStyle={styles.tabSwitch}
              tabStyle={styles.tabSwitchButton}
              tabTextStyle={styles.tabSwitchText}
              activeTabTextStyle={styles.tabSwitchTextActive}
              indicatorStyle={styles.tabSwitchIndicator}
            />
          </View>

          <TabTransitionView activeKey={`${section}-${tab}`} order={["leave-approval", "leave-history", "od-approval", "od-history"]} style={styles.tabContentArea}>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind(`${section}-${tab}`)}
            >
              <View style={styles.contextCard}>
                <View style={styles.contextIconWrap}>
                  <Ionicons name="person-outline" size={16} color="#2F6FE0" />
                </View>
                <View style={styles.contextTextWrap}>
                  <Text style={styles.contextTitle}>Principal</Text>
                  <Text style={styles.contextSubtitle}>
                    {totalCount} {section === "leave" ? "leave" : "on-duty"} requests · Correspondent
                  </Text>
                </View>
                <View style={styles.myClassBadge}>
                  <Text style={styles.myClassBadgeText}>MANAGEMENT</Text>
                </View>
              </View>

              {section === "leave"
                ? (tab === "approval" ? leaveApproval : leaveHistory).map((request) => (
                    <LeaveApprovalCard
                      key={request.id}
                      request={request}
                      deciding={decidingId === request.id}
                      onApprove={() => handleLeaveDecision(request.id, "approved")}
                      onReject={() => handleLeaveDecision(request.id, "rejected")}
                    />
                  ))
                : (tab === "approval" ? odApproval : odHistory).map((request) => (
                    <OdApprovalCard
                      key={request.id}
                      request={request}
                      deciding={decidingId === request.id}
                      onApprove={() => handleOdDecision(request.id, "approved")}
                      onReject={() => handleOdDecision(request.id, "rejected")}
                    />
                  ))}

              {(section === "leave" ? (tab === "approval" ? leaveApproval : leaveHistory) : (tab === "approval" ? odApproval : odHistory))
                .length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
                  <Text style={styles.emptyStateText}>No requests here</Text>
                </View>
              )}
            </ScrollView>
          </TabTransitionView>
        </>
      )}
    </SafeAreaView>
  );
}

const STATUS_META: Record<
  "pending" | "approved" | "rejected",
  { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: { label: "Pending", bg: "#FEF3C7", text: "#D97706", icon: "time-outline" },
  approved: { label: "Approved", bg: "#F0FDF4", text: "#16A34A", icon: "checkmark-circle" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626", icon: "close-circle" },
};

function LeaveApprovalCard({
  request,
  deciding,
  onApprove,
  onReject,
}: {
  request: MyFacultyLeave;
  deciding: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { from_date, to_date, reason, requester } = request;
  const status = request.correspondent_approval_status ?? "pending";
  const meta = STATUS_META[status];
  const name = requester?.name ?? "Principal";
  const designation = requester?.designation ?? "Principal";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardSubtitle}>{designation} · Leave Request</Text>
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

function OdApprovalCard({
  request,
  deciding,
  onApprove,
  onReject,
}: {
  request: MyFacultyOd;
  deciding: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { from_date, to_date, place, purpose, requester } = request;
  const status = request.correspondent_approval_status ?? "pending";
  const meta = STATUS_META[status];
  const name = requester?.name ?? "Principal";
  const designation = requester?.designation ?? "Principal";
  const reason = [purpose, place].filter(Boolean).join(" — ");

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardSubtitle}>{designation} · On-Duty Request</Text>
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
      <Text style={styles.reasonText}>{reason || "—"}</Text>

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
  sectionSwitchWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  sectionSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 12,
  },
  sectionSwitchIndicator: {
    top: 0,
    bottom: 0,
    borderRadius: 9,
    backgroundColor: "#2F6FE0",
  },
  sectionSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  sectionSwitchTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  tabSwitchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabContentArea: {
    flex: 1,
  },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 4,
  },
  tabSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 12,
  },
  tabSwitchIndicator: {
    top: 0,
    bottom: 0,
    borderRadius: 9,
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#6B7280",
  },
  tabSwitchTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
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
