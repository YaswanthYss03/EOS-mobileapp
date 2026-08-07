import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
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
  listPurchaseRequestsForHodReview,
  hodReviewPurchaseRequest,
  getPurchaseRequestStatusMeta,
  type PurchaseRequest,
  type PurchaseRequestStatus,
} from "@/services/api/purchase-requests.api";
import {
  listServiceRequestsForHodReview,
  hodReviewServiceRequest,
  type ServiceRequest,
} from "@/services/api/service-requests.api";

type PopSopType = "pop" | "sop";
type StatusFilter = "pending" | "forwarded" | "rejected" | "all";
type Stage = "secretary" | "hod" | "finance";

// Both request types share the exact same 6-value derived status union (see
// purchase-requests.api.ts / service-requests.api.ts) - normalized here so
// one OrderCard can render either.
type DisplayOrder = {
  id: number;
  type: PopSopType;
  title: string;
  status: PurchaseRequestStatus;
  department: { id: number; name: string };
  raisedByEmail: string;
  detailLabel: string;
  detailValue: string;
  quantity: string;
  neededBy: string | null;
  hodRemarks: string | null;
  financeRemarks: string | null;
  orderNumber: string | null;
  createdAt: string;
};

function fromPurchaseRequest(r: PurchaseRequest): DisplayOrder {
  return {
    id: r.id,
    type: "pop",
    title: r.title,
    status: r.status,
    department: r.department,
    raisedByEmail: r.raised_by.email,
    detailLabel: "SPECIFICATION",
    detailValue: r.purpose || "—",
    quantity: String(r.quantity),
    neededBy: r.needed_by,
    hodRemarks: r.hod_remarks,
    financeRemarks: r.finance_remarks,
    orderNumber: r.order_number,
    createdAt: r.created_at,
  };
}

function fromServiceRequest(r: ServiceRequest): DisplayOrder {
  return {
    id: r.id,
    type: "sop",
    title: r.title ?? "Service request",
    status: r.status,
    department: r.department,
    raisedByEmail: r.raised_by.email,
    detailLabel: "LOCATION",
    detailValue: `${r.location || "—"}${r.service_description ? ` — ${r.service_description}` : ""}`,
    quantity: r.quantity ?? "—",
    neededBy: r.needed_by,
    hodRemarks: r.hod_remarks,
    financeRemarks: r.finance_remarks,
    orderNumber: r.order_number,
    createdAt: r.created_at,
  };
}

const STATUS_FILTERS: StatusFilter[] = ["pending", "forwarded", "rejected", "all"];
const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  pending: "Pending",
  forwarded: "Forwarded",
  rejected: "Rejected",
  all: "All",
};
const STAGE_ORDER: Stage[] = ["secretary", "hod", "finance"];
const STAGE_LABELS: Record<Stage, string> = { secretary: "Secretary", hod: "HOD", finance: "Finance" };

const TYPE_META: Record<PopSopType, { tabLabel: string; headerTitle: string; headerSubtitle: string }> = {
  pop: { tabLabel: "POP · Purchase", headerTitle: "Purchase Orders", headerSubtitle: "POP · raised by the dept secretary" },
  sop: { tabLabel: "SOP · Service", headerTitle: "Service Orders", headerSubtitle: "SOP · raised by the dept secretary" },
};

function toFilterBucket(status: PurchaseRequestStatus): Exclude<StatusFilter, "all"> {
  if (status === "pending_hod") return "pending";
  if (status === "rejected_by_hod" || status === "rejected_by_finance") return "rejected";
  return "forwarded"; // pending_finance | approved | converted
}

function toStage(status: PurchaseRequestStatus): Stage {
  if (status === "pending_hod" || status === "rejected_by_hod") return "hod";
  return "finance"; // pending_finance | approved | converted | rejected_by_finance
}

function formatMaybeDate(iso: string | null) {
  return iso ? formatDate(new Date(iso)) : "—";
}

// HoD's review queue for Purchase/Service requests - see
// EOSbackend1/src/modules/procurement/purchase-requests and
// .../service-requests. Backend auto-scopes each list to the HoD's own
// department. Reachable from the HoD dashboard's "POP / SOP" item.
export function PopSopScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<PopSopType>("pop");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseRequest[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingIds, setReviewingIds] = useState<Set<number>>(new Set());

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [pop, sop] = await Promise.all([
        listPurchaseRequestsForHodReview(),
        listServiceRequestsForHodReview(),
      ]);
      setPurchaseOrders(pop);
      setServiceOrders(sop);
    } catch {
      toast.error("Couldn't load POP/SOP requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the other ERP
  // sub-screens.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const ordersOfType = useMemo<DisplayOrder[]>(
    () => (type === "pop" ? purchaseOrders.map(fromPurchaseRequest) : serviceOrders.map(fromServiceRequest)),
    [type, purchaseOrders, serviceOrders],
  );

  const counts = useMemo(
    () => ({
      pending: ordersOfType.filter((o) => toFilterBucket(o.status) === "pending").length,
      forwarded: ordersOfType.filter((o) => toFilterBucket(o.status) === "forwarded").length,
      rejected: ordersOfType.filter((o) => toFilterBucket(o.status) === "rejected").length,
      all: ordersOfType.length,
    }),
    [ordersOfType],
  );

  const filteredOrders = useMemo(
    () =>
      statusFilter === "all" ? ordersOfType : ordersOfType.filter((o) => toFilterBucket(o.status) === statusFilter),
    [ordersOfType, statusFilter],
  );

  function switchType(nextType: PopSopType) {
    setType(nextType);
    setStatusFilter("pending");
  }

  async function submitReview(order: DisplayOrder, decision: "approved" | "rejected") {
    setReviewingIds((prev) => new Set(prev).add(order.id));
    try {
      if (order.type === "pop") {
        const updated = await hodReviewPurchaseRequest(order.id, decision);
        setPurchaseOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      } else {
        const updated = await hodReviewServiceRequest(order.id, decision);
        setServiceOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      }
      toast.success(decision === "approved" ? "Approved and forwarded to Finance" : "Request sent back");
    } catch {
      toast.error("Couldn't submit your review. Please try again");
    } finally {
      setReviewingIds((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  }

  function handleApproveAndForward(order: DisplayOrder) {
    Alert.alert("Approve & forward?", `"${order.title}" will move to Finance for review.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Approve", onPress: () => submitReview(order, "approved") },
    ]);
  }

  function handleSendBack(order: DisplayOrder) {
    Alert.alert("Send back?", `"${order.title}" will be rejected and closed out. This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Send back", style: "destructive", onPress: () => submitReview(order, "rejected") },
    ]);
  }

  const meta = TYPE_META[type];

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
          <Text style={styles.headerTitle}>{meta.headerTitle}</Text>
          <Text style={styles.headerSubtitle}>{meta.headerSubtitle}</Text>
        </View>
      </LinearGradient>

      <View style={styles.typeSwitch}>
        <TouchableOpacity
          style={[styles.typeSwitchButton, type === "pop" && styles.typeSwitchButtonActive]}
          onPress={() => switchType("pop")}
        >
          <Text style={[styles.typeSwitchText, type === "pop" && styles.typeSwitchTextActive]}>
            {TYPE_META.pop.tabLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeSwitchButton, type === "sop" && styles.typeSwitchButtonActive]}
          onPress={() => switchType("sop")}
        >
          <Text style={[styles.typeSwitchText, type === "sop" && styles.typeSwitchTextActive]}>
            {TYPE_META.sop.tabLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color="#2F6FE0" size="small" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statusRow}>
            {STATUS_FILTERS.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.statusPill, statusFilter === status && styles.statusPillActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.statusPillText, statusFilter === status && styles.statusPillTextActive]}>
                  {STATUS_FILTER_LABELS[status]} ({counts[status]})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              reviewing={reviewingIds.has(order.id)}
              onApproveAndForward={() => handleApproveAndForward(order)}
              onSendBack={() => handleSendBack(order)}
            />
          ))}

          {filteredOrders.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
              <Text style={styles.emptyStateText}>No orders here</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  reviewing,
  onApproveAndForward,
  onSendBack,
}: {
  order: DisplayOrder;
  reviewing: boolean;
  onApproveAndForward: () => void;
  onSendBack: () => void;
}) {
  const currentIndex = STAGE_ORDER.indexOf(toStage(order.status));
  const statusMeta = getPurchaseRequestStatusMeta(order.status);
  const raiserLabel = order.raisedByEmail.split("@")[0];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{order.title}</Text>
        <View
          style={[
            styles.statusBadge,
            statusMeta.tone === "positive" && styles.statusBadgeForwarded,
            statusMeta.tone === "negative" && styles.statusBadgeReturned,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              statusMeta.tone === "positive" && styles.statusBadgeTextForwarded,
              statusMeta.tone === "negative" && styles.statusBadgeTextReturned,
            ]}
          >
            {statusMeta.label}
          </Text>
        </View>
      </View>
      <Text style={styles.cardRef}>
        #{order.type.toUpperCase()}-{order.id} · {formatMaybeDate(order.createdAt)}
        {order.orderNumber ? ` · ${order.orderNumber}` : ""}
      </Text>

      <View style={styles.raisedByRow}>
        <View style={styles.raisedByAvatar}>
          <Text style={styles.raisedByAvatarText}>{raiserLabel.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.raisedByText}>Raised by {raiserLabel} · Dept Secretary</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>{order.detailLabel}</Text>
          <Text style={styles.metaValue}>{order.detailValue}</Text>
        </View>
        <View style={styles.metaColSmall}>
          <Text style={styles.metaLabel}>QTY</Text>
          <Text style={styles.metaValue}>{order.quantity}</Text>
        </View>
        <View style={styles.metaColSmall}>
          <Text style={styles.metaLabel}>NEEDED BY</Text>
          <Text style={styles.metaValue}>{formatMaybeDate(order.neededBy)}</Text>
        </View>
      </View>

      <View style={styles.stageLabelsRow}>
        {STAGE_ORDER.map((stage, index) => (
          <Text key={stage} style={[styles.stageLabel, index <= currentIndex && styles.stageLabelActive]}>
            {STAGE_LABELS[stage]}
          </Text>
        ))}
      </View>
      <View style={styles.stageBarTrack}>
        {[0, 1].map((segmentIndex) => (
          <View
            key={segmentIndex}
            style={[styles.stageBarSegment, segmentIndex < currentIndex && styles.stageBarSegmentFilled]}
          />
        ))}
      </View>

      {(order.status === "rejected_by_hod" || order.status === "rejected_by_finance") &&
        (order.hodRemarks || order.financeRemarks) && (
          <Text style={styles.remarksText}>
            {order.status === "rejected_by_hod"
              ? `HoD remarks: ${order.hodRemarks}`
              : `Finance remarks: ${order.financeRemarks}`}
          </Text>
        )}

      {order.status === "pending_hod" && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.sendBackButton}
            onPress={onSendBack}
            activeOpacity={0.85}
            disabled={reviewing}
          >
            <Text style={styles.sendBackButtonText}>Send back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.approveButton, reviewing && styles.approveButtonDisabled]}
            onPress={onApproveAndForward}
            activeOpacity={0.85}
            disabled={reviewing}
          >
            {reviewing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.approveButtonText}>Approve & forward</Text>
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
  typeSwitch: {
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
  typeSwitchButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    paddingVertical: 10,
  },
  typeSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  typeSwitchText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  typeSwitchTextActive: {
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  statusBadge: {
    backgroundColor: "#E4EBFB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeForwarded: {
    backgroundColor: "#F0FDF4",
  },
  statusBadgeReturned: {
    backgroundColor: "#FEF2F2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  statusBadgeTextForwarded: {
    color: "#16A34A",
  },
  statusBadgeTextReturned: {
    color: "#DC2626",
  },
  cardRef: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
    marginBottom: 10,
  },
  raisedByRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  raisedByAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  raisedByAvatarText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  raisedByText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F3F6",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metaCol: {
    flex: 1.4,
  },
  metaColSmall: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  stageLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  stageLabel: {
    fontSize: 10,
    fontFamily: fonts.semibold,
    color: "#9AA6B2",
  },
  stageLabelActive: {
    color: "#2F6FE0",
    fontFamily: fonts.bold,
  },
  stageBarTrack: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 14,
  },
  stageBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#EEF2F9",
  },
  stageBarSegmentFilled: {
    backgroundColor: "#2F6FE0",
  },
  remarksText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#DC2626",
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
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
  approveButton: {
    flex: 1.4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    paddingVertical: 10,
  },
  approveButtonDisabled: {
    opacity: 0.7,
  },
  approveButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
  },
});
