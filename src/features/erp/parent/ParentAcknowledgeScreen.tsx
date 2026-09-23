import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnimatedTabBar, TabTransitionView, useTabScrollMemory } from "@/components/ui/tabs";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { formatDate } from "@/utils/calendar";
import {
  getChildLeaves,
  acknowledgeChildLeave,
  getChildOdRequests,
  acknowledgeChildOdRequest,
  type ChildLeave,
  type ChildOdRequest,
} from "@/services/api/parents.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import { useParentChildren } from "./useParentChildren";
import { ChildSelector } from "./ChildSelector";

// One page for all 3 request types a parent can acknowledge - Leave,
// Hostel Leave, and OD - per explicit request, rather than 3 separate
// screens. Leave + Hostel Leave both come back from one call
// (getChildLeaves - same underlying student_leaves table, see
// parents.api.ts's own comment) and are split client-side by `kind`; OD is
// its own separate call/table. Reachable from the Progress tab's
// "Acknowledge" tile (see ParentDashboard's quickAccessItems).
type Tab = "leave" | "hostel_leave" | "od";

type LoadStatus = "loading" | "success" | "error";

function statusMeta(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case "pending":
      return { label: "Pending", bg: "#FEF3C7", text: "#D97706" };
    case "faculty_approved":
      return { label: "Approved · awaiting HoD", bg: "#F0FDF4", text: "#16A34A" };
    case "hod_approved":
    case "warden_approved":
    case "approved":
      return { label: "Approved", bg: "#F0FDF4", text: "#16A34A" };
    case "rejected":
      return { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" };
    default:
      return { label: status, bg: "#F1F3F6", text: "#6B7280" };
  }
}

export function ParentAcknowledgeScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollMemory = useTabScrollMemory();

  const { status: childrenStatus, error: childrenError, children, selectedChild, setSelectedChildId, reload: reloadChildren } =
    useParentChildren();

  const [tab, setTab] = useState<Tab>("leave");

  const [leaves, setLeaves] = useState<ChildLeave[] | null>(null);
  const [leavesStatus, setLeavesStatus] = useState<LoadStatus>("loading");
  const [odRequests, setOdRequests] = useState<ChildOdRequest[] | null>(null);
  const [odStatus, setOdStatus] = useState<LoadStatus>("loading");
  const [ackingId, setAckingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return undefined;
    }, [navigation]),
  );

  const loadLeaves = useCallback((studentId: number) => {
    setLeavesStatus("loading");
    getChildLeaves(studentId)
      .then((data) => {
        setLeaves(data);
        setLeavesStatus("success");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't load leave requests."));
        setLeavesStatus("error");
      });
  }, []);

  const loadOdRequests = useCallback((studentId: number) => {
    setOdStatus("loading");
    getChildOdRequests(studentId)
      .then((data) => {
        setOdRequests(data);
        setOdStatus("success");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't load OD requests."));
        setOdStatus("error");
      });
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadLeaves(selectedChild.id);
      loadOdRequests(selectedChild.id);
    }
  }, [selectedChild, loadLeaves, loadOdRequests]);

  const leaveRequests = useMemo(() => (leaves ?? []).filter((l) => l.kind === "leave"), [leaves]);
  const hostelLeaveRequests = useMemo(() => (leaves ?? []).filter((l) => l.kind === "hostel_leave"), [leaves]);

  function handleAcknowledgeLeave(leave: ChildLeave) {
    if (!selectedChild) return;
    setAckingId(`leave-${leave.id}`);
    acknowledgeChildLeave(selectedChild.id, leave.id)
      .then((res) => {
        setLeaves((prev) =>
          prev ? prev.map((l) => (l.id === leave.id ? { ...l, acknowledged_at: res.acknowledged_at } : l)) : prev,
        );
        toast.success("Acknowledged");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't acknowledge. Please try again.")))
      .finally(() => setAckingId(null));
  }

  function handleAcknowledgeOd(request: ChildOdRequest) {
    if (!selectedChild) return;
    setAckingId(`od-${request.id}`);
    acknowledgeChildOdRequest(selectedChild.id, request.id)
      .then((res) => {
        setOdRequests((prev) =>
          prev ? prev.map((r) => (r.id === request.id ? { ...r, acknowledged_at: res.acknowledged_at } : r)) : prev,
        );
        toast.success("Acknowledged");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't acknowledge. Please try again.")))
      .finally(() => setAckingId(null));
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
          <Text style={styles.headerTitle}>Acknowledge</Text>
          <Text style={styles.headerSubtitle}>Leave, Hostel Leave & OD requests</Text>
        </View>
      </LinearGradient>

      {childrenStatus === "loading" ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SkeletonListRows count={4} />
        </ScrollView>
      ) : childrenStatus === "error" ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ErrorNotice message={childrenError ?? "Something went wrong."} onRetry={reloadChildren} />
        </ScrollView>
      ) : children.length === 0 ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={28} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No linked children found</Text>
          </View>
        </ScrollView>
      ) : selectedChild ? (
        <>
          <View style={styles.childSelectorWrap}>
            <ChildSelector children={children} selected={selectedChild} onSelect={(c) => setSelectedChildId(c.id)} />
          </View>

          <View style={styles.tabSwitchWrap}>
            <AnimatedTabBar
              tabs={[
                { key: "leave" as Tab, label: `Leave ${leaveRequests.length > 0 ? `(${leaveRequests.length})` : ""}`.trimEnd() },
                {
                  key: "hostel_leave" as Tab,
                  label: `Hostel ${hostelLeaveRequests.length > 0 ? `(${hostelLeaveRequests.length})` : ""}`.trimEnd(),
                },
                { key: "od" as Tab, label: `OD ${(odRequests ?? []).length > 0 ? `(${(odRequests ?? []).length})` : ""}`.trimEnd() },
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

          <TabTransitionView activeKey={tab} order={["leave", "hostel_leave", "od"]} style={styles.tabContentArea}>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind(tab)}
            >
              {tab === "leave" &&
                (leavesStatus === "loading" ? (
                  <SkeletonListRows count={3} />
                ) : leavesStatus === "error" ? (
                  <ErrorNotice message="Couldn't load leave requests." onRetry={() => loadLeaves(selectedChild.id)} />
                ) : leaveRequests.length === 0 ? (
                  <EmptyRow text="No leave requests" />
                ) : (
                  leaveRequests.map((leave) => (
                    <LeaveCard
                      key={leave.id}
                      leave={leave}
                      acking={ackingId === `leave-${leave.id}`}
                      onAcknowledge={() => handleAcknowledgeLeave(leave)}
                    />
                  ))
                ))}

              {tab === "hostel_leave" &&
                (leavesStatus === "loading" ? (
                  <SkeletonListRows count={3} />
                ) : leavesStatus === "error" ? (
                  <ErrorNotice message="Couldn't load hostel leave requests." onRetry={() => loadLeaves(selectedChild.id)} />
                ) : hostelLeaveRequests.length === 0 ? (
                  <EmptyRow text="No hostel leave requests" />
                ) : (
                  hostelLeaveRequests.map((leave) => (
                    <LeaveCard
                      key={leave.id}
                      leave={leave}
                      acking={ackingId === `leave-${leave.id}`}
                      onAcknowledge={() => handleAcknowledgeLeave(leave)}
                    />
                  ))
                ))}

              {tab === "od" &&
                (odStatus === "loading" ? (
                  <SkeletonListRows count={3} />
                ) : odStatus === "error" ? (
                  <ErrorNotice message="Couldn't load OD requests." onRetry={() => loadOdRequests(selectedChild.id)} />
                ) : (odRequests ?? []).length === 0 ? (
                  <EmptyRow text="No OD requests" />
                ) : (
                  (odRequests ?? []).map((request) => (
                    <OdCard
                      key={request.id}
                      request={request}
                      acking={ackingId === `od-${request.id}`}
                      onAcknowledge={() => handleAcknowledgeOd(request)}
                    />
                  ))
                ))}
            </ScrollView>
          </TabTransitionView>
        </>
      ) : null}
    </SafeAreaView>
  );
}

function AcknowledgeButton({ acknowledged, acking, onPress }: { acknowledged: boolean; acking: boolean; onPress: () => void }) {
  if (acknowledged) {
    return (
      <View style={styles.ackedBadge}>
        <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
        <Text style={styles.ackedBadgeText}>Acknowledged</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity style={[styles.ackButton, acking && styles.buttonDisabled]} onPress={onPress} activeOpacity={0.85} disabled={acking}>
      {acking ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.ackButtonText}>Acknowledge</Text>}
    </TouchableOpacity>
  );
}

function LeaveCard({ leave, acking, onAcknowledge }: { leave: ChildLeave; acking: boolean; onAcknowledge: () => void }) {
  const meta = statusMeta(leave.status);
  return (
    <View style={styles.card}>
      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>FROM</Text>
          <Text style={styles.metaValue}>{formatDate(new Date(leave.from_date))}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>TO</Text>
          <Text style={styles.metaValue}>{formatDate(new Date(leave.to_date))}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={styles.reasonLabel}>REASON</Text>
      <Text style={styles.reasonText}>{leave.reason ?? "—"}</Text>

      <AcknowledgeButton acknowledged={leave.acknowledged_at !== null} acking={acking} onPress={onAcknowledge} />
    </View>
  );
}

function OdCard({ request, acking, onAcknowledge }: { request: ChildOdRequest; acking: boolean; onAcknowledge: () => void }) {
  const meta = statusMeta(request.status);
  return (
    <View style={styles.card}>
      {request.team_name && <Text style={styles.teamName}>{request.team_name}</Text>}
      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>FROM</Text>
          <Text style={styles.metaValue}>{formatDate(new Date(request.from_date))}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>TO</Text>
          <Text style={styles.metaValue}>{formatDate(new Date(request.to_date))}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={styles.reasonLabel}>EVENT</Text>
      <Text style={styles.reasonText}>{request.reason ?? "—"}</Text>

      <AcknowledgeButton acknowledged={request.acknowledged_at !== null} acking={acking} onPress={onAcknowledge} />
    </View>
  );
}

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorNotice}>
      <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
      <Text style={styles.errorNoticeText}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.8}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
      <Text style={styles.emptyStateText}>{text}</Text>
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
  childSelectorWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    fontSize: 12,
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
  teamName: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
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
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
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
  ackButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    paddingVertical: 10,
  },
  ackButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  ackedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    paddingVertical: 10,
  },
  ackedBadgeText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#16A34A",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
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
