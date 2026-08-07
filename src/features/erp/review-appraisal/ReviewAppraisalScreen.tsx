import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  StyleSheet,
} from "react-native";
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
  listAppraisalRequestsForReview,
  reviewAppraisalRequest,
  type MyAppraisalRequest,
  type AppraisalStatus,
} from "@/services/api/appraisal-requests.api";

type StatusFilter = "pending" | "forwarded" | "rejected" | "all";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "forwarded", label: "Forwarded" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

// hod_reviewed/hr_scored/management_approved are all "already forwarded to
// HR" from a HoD's own point of view - HR/management's own further stages
// aren't this screen's concern, just whether the HoD still has something to
// act on (submitted) or not.
function toFilterBucket(status: AppraisalStatus): Exclude<StatusFilter, "all"> {
  if (status === "submitted") return "pending";
  if (status === "rejected") return "rejected";
  return "forwarded";
}

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

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [requests, setRequests] = useState<MyAppraisalRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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

  const counts = useMemo(() => {
    const list = requests ?? [];
    return {
      pending: list.filter((r) => toFilterBucket(r.status) === "pending").length,
      forwarded: list.filter((r) => toFilterBucket(r.status) === "forwarded").length,
      rejected: list.filter((r) => toFilterBucket(r.status) === "rejected").length,
      all: list.length,
    };
  }, [requests]);

  const filteredRequests = useMemo(
    () => (requests ?? []).filter((r) => statusFilter === "all" || toFilterBucket(r.status) === statusFilter),
    [requests, statusFilter],
  );

  // Every loaded request shares the same department (server-scoped to the
  // HoD's own) - safe to read it off the first one for the header subtitle.
  const departmentLabel = requests && requests.length > 0 ? requests[0].faculty.department_name : null;

  function handleDecision(request: MyAppraisalRequest, decision: "hod_reviewed" | "rejected") {
    const facultyName = `${request.faculty.first_name} ${request.faculty.last_name}`;
    const action = decision === "hod_reviewed" ? "forward this appraisal to HR" : "send this appraisal back";

    Alert.alert(
      decision === "hod_reviewed" ? "Forward to HR?" : "Send back?",
      `This will ${action} for ${facultyName}. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: decision === "hod_reviewed" ? "Forward" : "Send back",
          style: decision === "rejected" ? "destructive" : "default",
          onPress: () => doReview(request.id, decision),
        },
      ],
    );
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color="#2F6FE0" />
            <Text style={styles.centerStateText}>Loading...</Text>
          </View>
        ) : errored ? (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Couldn't load appraisal requests.</Text>
            <TouchableOpacity onPress={() => setReloadToken((n) => n + 1)} activeOpacity={0.8}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statusRow}>
              {STATUS_FILTERS.map(({ id, label }) => (
                <TouchableOpacity
                  key={id}
                  style={[styles.statusPill, statusFilter === id && styles.statusPillActive]}
                  onPress={() => setStatusFilter(id)}
                >
                  <Text style={[styles.statusPillText, statusFilter === id && styles.statusPillTextActive]}>
                    {label} ({counts[id]})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
          </>
        )}
      </ScrollView>
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
    backgroundColor: "#fff",
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
