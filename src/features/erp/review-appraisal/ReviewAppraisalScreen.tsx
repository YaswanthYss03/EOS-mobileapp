import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { useSkipSharedHeaderToggle } from "@/hooks/useSkipSharedHeaderToggle";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnimatedTabBar, TabTransitionView, useTabScrollMemory } from "@/components/ui/tabs";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { confirm } from "@/utils/confirm";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  listAppraisalRequestsForReview,
  reviewAppraisalRequest,
  type MyAppraisalRequest,
  type AppraisalStatus,
} from "@/services/api/appraisal-requests.api";

// "History" covers every already-decided request (forwarded to HR, scored,
// management-approved, or rejected) together - there's no separate filter
// for each, just "still needs this HoD's decision" (Approval) vs "already
// decided" (History), same 2-tab AnimatedTabBar/TabTransitionView design as
// the Employee's own Leave Request screen (see erp/leave-request/
// LeaveRequestScreen.tsx).
type Tab = "approval" | "history";

const STATUS_META: Record<AppraisalStatus, { label: string; bg: string; text: string }> = {
  submitted: { label: "Pending review", bg: "#FEF3C7", text: "#D97706" },
  hod_reviewed: { label: "Forwarded to HR", bg: "#EAF0FD", text: "#2F6FE0" },
  hr_scored: { label: "Scored by HR", bg: "#F3E8FF", text: "#9333EA" },
  management_approved: { label: "Approved", bg: "#F0FDF4", text: "#16A34A" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" },
};

function initialsFromName(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Wired to EOS-backend's appraisal module (see
// @/services/api/appraisal-requests.api.ts's HoD review queue functions) -
// GET /me/appraisal_requests, auto-scoped server-side to the HoD's own
// department (via their own faculty row), and PATCH .../:id to forward a
// submitted request to HR (status -> hod_reviewed) or send it back
// (status -> rejected). Reachable from the HoD dashboard's "Review
// Appraisal" item.
export function ReviewAppraisalScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>("approval");
  const scrollMemory = useTabScrollMemory();
  const [requests, setRequests] = useState<MyAppraisalRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const skipHeaderToggle = useSkipSharedHeaderToggle();

  useFocusEffect(
    useCallback(() => {
      if (skipHeaderToggle) return undefined;
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation, skipHeaderToggle]),
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);

    listAppraisalRequestsForReview()
      .then((data) => {
        if (!cancelled) setRequests(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrored(true);
        toast.error(getApiErrorMessage(error, "Couldn't load appraisal requests. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const approvalRequests = useMemo(
    () => (requests ?? []).filter((r) => r.status === "submitted"),
    [requests],
  );

  const historyRequests = useMemo(
    () => (requests ?? []).filter((r) => r.status !== "submitted"),
    [requests],
  );

  const filteredRequests = tab === "approval" ? approvalRequests : historyRequests;

  // Every loaded request shares the same department (server-scoped to the
  // HoD's own) - safe to read it off the first one for the header subtitle.
  const departmentLabel = requests && requests.length > 0 ? requests[0].faculty.department_name : null;

  async function handleDecision(request: MyAppraisalRequest, decision: "hod_reviewed" | "rejected") {
    const facultyName = `${request.faculty.first_name} ${request.faculty.last_name}`;
    const action = decision === "hod_reviewed" ? "forward this appraisal to HR" : "send this appraisal back";

    const ok = await confirm({
      title: decision === "hod_reviewed" ? "Forward to HR?" : "Send back?",
      message: `This will ${action} for ${facultyName}. This can't be undone.`,
      confirmText: decision === "hod_reviewed" ? "Forward" : "Send back",
      destructive: decision === "rejected",
    });
    if (ok) doReview(request.id, decision);
  }

  function doReview(id: number, decision: "hod_reviewed" | "rejected") {
    setDecidingId(id);
    reviewAppraisalRequest(id, decision)
      .then((updated) => {
        setRequests((prev) => (prev ? prev.map((r) => (r.id === id ? updated : r)) : prev));
        toast.success(decision === "hod_reviewed" ? "Forwarded to HR" : "Sent back to faculty");
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
          <Text style={styles.headerTitle}>Review Appraisal</Text>
          <Text style={styles.headerSubtitle}>{departmentLabel ?? "Faculty appraisal requests"}</Text>
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
            <Text style={styles.centerStateText}>Couldn't load appraisal requests.</Text>
            <TouchableOpacity onPress={() => setReloadToken((n) => n + 1)} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <>
          <View style={styles.tabSwitchWrap}>
            <AnimatedTabBar
              tabs={[
                { key: "approval" as Tab, label: `Approval ${approvalRequests.length > 0 ? `(${approvalRequests.length})` : ""}`.trimEnd() },
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

          <TabTransitionView activeKey={tab} order={["approval", "history"]} style={styles.tabContentArea}>
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              {...scrollMemory.bind(tab)}
            >
              {filteredRequests.map((request) => (
                <AppraisalCard
                  key={request.id}
                  request={request}
                  expanded={expandedId === request.id}
                  deciding={decidingId === request.id}
                  onToggleExpand={() => setExpandedId((prev) => (prev === request.id ? null : request.id))}
                  onForward={() => handleDecision(request, "hod_reviewed")}
                  onSendBack={() => handleDecision(request, "rejected")}
                />
              ))}

              {filteredRequests.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
                  <Text style={styles.emptyStateText}>No appraisals here</Text>
                </View>
              )}
            </ScrollView>
          </TabTransitionView>
        </>
      )}
    </SafeAreaView>
  );
}

function AppraisalCard({
  request,
  expanded,
  deciding,
  onToggleExpand,
  onForward,
  onSendBack,
}: {
  request: MyAppraisalRequest;
  expanded: boolean;
  deciding: boolean;
  onToggleExpand: () => void;
  onForward: () => void;
  onSendBack: () => void;
}) {
  const { faculty, academic_year, created_at, status, entries, attachments } = request;
  const meta = STATUS_META[status];
  const filledEntries = entries.filter((e) => e.description);
  const totalScore = entries.reduce((sum, e) => sum + (e.score ?? 0), 0);
  const totalMax = entries.reduce((sum, e) => sum + e.criteria.max_score, 0);
  const scored = entries.some((e) => e.score !== null);

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggleExpand} activeOpacity={0.8}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(faculty.first_name, faculty.last_name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>
            {faculty.first_name} {faculty.last_name}
          </Text>
          <Text style={styles.cardSubtitle}>{faculty.designation}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>CYCLE</Text>
          <Text style={styles.metaValue}>{academic_year}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>SUBMITTED</Text>
          <Text style={styles.metaValue}>{formatDate(new Date(created_at))}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>ENTRIES</Text>
          <Text style={styles.metaValue}>{filledEntries.length}</Text>
        </View>
      </View>

      {scored && (
        <Text style={styles.scoreText}>
          Score: {totalScore}/{totalMax}
        </Text>
      )}

      <TouchableOpacity style={styles.viewSubmissionButton} onPress={onToggleExpand} activeOpacity={0.8}>
        <Ionicons name={expanded ? "chevron-up" : "document-text-outline"} size={16} color="#2F6FE0" />
        <Text style={styles.viewSubmissionButtonText}>
          {expanded ? "Hide submission" : "View full submission"}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedBody}>
          {filledEntries.length === 0 ? (
            <Text style={styles.emptySectionText}>No entries filled in.</Text>
          ) : (
            filledEntries.map((entry) => (
              <View key={entry.id} style={styles.entryBlock}>
                <Text style={styles.entryLabel}>
                  {entry.criteria.division.name.toUpperCase()} · {entry.criteria.name.toUpperCase()}
                  {entry.score !== null ? ` · ${entry.score}/${entry.criteria.max_score}` : ""}
                </Text>
                <Text style={styles.entryDescription}>{entry.description}</Text>
              </View>
            ))
          )}

          <Text style={styles.attachmentsLabel}>SUPPORTING DOCUMENTS ({attachments.length})</Text>
          {attachments.length === 0 ? (
            <Text style={styles.emptySectionText}>No documents were attached.</Text>
          ) : (
            attachments.map((attachment) => (
              <TouchableOpacity
                key={attachment.id}
                style={styles.attachmentRow}
                onPress={() => Linking.openURL(attachment.file_url)}
                activeOpacity={0.7}
              >
                <Ionicons name="document-attach-outline" size={16} color="#2F6FE0" />
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {attachment.file_name}
                </Text>
                <Ionicons name="open-outline" size={14} color="#9AA6B2" />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {status === "submitted" && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.sendBackButton, deciding && styles.buttonDisabled]}
            onPress={onSendBack}
            activeOpacity={0.85}
            disabled={deciding}
          >
            <Text style={styles.sendBackButtonText}>Send back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.forwardButton, deciding && styles.buttonDisabled]}
            onPress={onForward}
            activeOpacity={0.85}
            disabled={deciding}
          >
            {deciding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.forwardButtonText}>Forward to HR</Text>
            )}
          </TouchableOpacity>
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  tabSwitchWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabContentArea: {
    flex: 1,
  },
  // Same white pill-track + sliding-indicator design as the Employee's own
  // Leave Request screen (see erp/leave-request/LeaveRequestScreen.tsx).
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
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
  tabSwitchIndicator: {
    top: 0,
    bottom: 0,
    borderRadius: 9,
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabSwitchTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
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
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 8,
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
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
    marginTop: 2,
  },
  scoreText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginBottom: 12,
  },
  viewSubmissionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  viewSubmissionButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  expandedBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  entryBlock: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  entryLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  entryDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#374151",
    lineHeight: 18,
  },
  attachmentsLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 8,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  attachmentName: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#2F6FE0",
  },
  emptySectionText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  sendBackButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingVertical: 10,
  },
  sendBackButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  forwardButton: {
    flex: 1.4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    paddingVertical: 10,
  },
  forwardButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
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
