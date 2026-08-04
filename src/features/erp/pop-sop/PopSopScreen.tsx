import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { deptInfo, mockOrders, type PopSopOrder, type PopSopStage, type PopSopType } from "./data/mockPopSop";

type StatusFilter = "pending" | "forwarded" | "returned" | "all";

const STATUS_FILTERS: StatusFilter[] = ["pending", "forwarded", "returned", "all"];
const STAGE_ORDER: PopSopStage[] = ["secretary", "hod", "finance"];
const STAGE_LABELS: Record<PopSopStage, string> = { secretary: "Secretary", hod: "HOD", finance: "Finance" };

const TYPE_META: Record<PopSopType, { tabLabel: string; headerTitle: string; headerSubtitle: string }> = {
  pop: { tabLabel: "POP · Purchase", headerTitle: "Purchase Orders", headerSubtitle: "POP · raised by the dept secretary" },
  sop: { tabLabel: "SOP · Service", headerTitle: "Service Orders", headerSubtitle: "SOP · raised by the dept secretary" },
};

function initialsFromName(name: string) {
  return name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// TODO: this is a review UI over mockPopSop - wire to a real procurement
// backend endpoint once one exists. Reachable from the HoD dashboard's
// "POP / SOP" item.
export function PopSopScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<PopSopType>("pop");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [orders, setOrders] = useState(mockOrders);

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

  const ordersOfType = useMemo(() => orders.filter((o) => o.type === type), [orders, type]);

  const pendingTotal = useMemo(
    () => ordersOfType.filter((o) => o.status === "pending").reduce((sum, o) => sum + o.indicativeCost, 0),
    [ordersOfType],
  );

  const counts = useMemo(
    () => ({
      pending: ordersOfType.filter((o) => o.status === "pending").length,
      forwarded: ordersOfType.filter((o) => o.status === "forwarded").length,
      returned: ordersOfType.filter((o) => o.status === "returned").length,
      all: ordersOfType.length,
    }),
    [ordersOfType],
  );

  const filteredOrders = useMemo(
    () => (statusFilter === "all" ? ordersOfType : ordersOfType.filter((o) => o.status === statusFilter)),
    [ordersOfType, statusFilter],
  );

  function switchType(nextType: PopSopType) {
    setType(nextType);
    setStatusFilter("pending");
  }

  function handleApproveAndForward(id: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "forwarded", currentStage: "finance" } : o)),
    );
    toast.success("Order approved and forwarded to Finance");
  }

  function handleSendBack(id: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "returned", currentStage: "secretary" } : o)),
    );
    toast.info("Order sent back to the dept secretary");
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconWrap}>
            <Ionicons name="receipt-outline" size={18} color="#2F6FE0" />
          </View>
          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryValue}>{formatRupees(pendingTotal)}</Text>
            <Text style={styles.summarySubtitle}>Indicative value awaiting approval · vendor fixed by Purchase</Text>
          </View>
          <View style={styles.deptBadge}>
            <Text style={styles.deptBadgeText}>{deptInfo.label}</Text>
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

        {filteredOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onApproveAndForward={() => handleApproveAndForward(order.id)}
            onSendBack={() => handleSendBack(order.id)}
          />
        ))}

        {filteredOrders.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No orders here</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderCard({
  order,
  onApproveAndForward,
  onSendBack,
}: {
  order: PopSopOrder;
  onApproveAndForward: () => void;
  onSendBack: () => void;
}) {
  const currentIndex = STAGE_ORDER.indexOf(order.currentStage);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{order.title}</Text>
        <View
          style={[
            styles.statusBadge,
            order.status === "forwarded" && styles.statusBadgeForwarded,
            order.status === "returned" && styles.statusBadgeReturned,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              order.status === "forwarded" && styles.statusBadgeTextForwarded,
              order.status === "returned" && styles.statusBadgeTextReturned,
            ]}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
        </View>
      </View>
      <Text style={styles.cardRef}>
        {order.ref} · {order.raisedOn}
      </Text>

      <View style={styles.raisedByRow}>
        <View style={styles.raisedByAvatar}>
          <Text style={styles.raisedByAvatarText}>{initialsFromName(order.raisedBy)}</Text>
        </View>
        <Text style={styles.raisedByText}>
          Raised by {order.raisedBy} · {order.raisedByRole}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>SPECIFICATION</Text>
          <Text style={styles.metaValue}>{order.specification}</Text>
        </View>
        <View style={styles.metaColSmall}>
          <Text style={styles.metaLabel}>QTY</Text>
          <Text style={styles.metaValue}>{order.quantity}</Text>
        </View>
        <View style={styles.metaColSmall}>
          <Text style={styles.metaLabel}>NEEDED BY</Text>
          <Text style={styles.metaValue}>{order.neededBy}</Text>
        </View>
      </View>

      <Text style={styles.metaLabel}>JUSTIFICATION</Text>
      <Text style={styles.justificationText}>{order.justification}</Text>

      <View style={styles.budgetRow}>
        <View style={styles.budgetCol}>
          <Text style={styles.metaLabel}>BUDGET HEAD</Text>
          <Text style={styles.metaValue}>{order.budgetHead}</Text>
        </View>
        <View style={styles.costCol}>
          <Text style={styles.metaLabel}>INDICATIVE COST</Text>
          <Text style={styles.costValue}>{formatRupees(order.indicativeCost)}</Text>
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

      {order.status === "pending" && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.sendBackButton} onPress={onSendBack} activeOpacity={0.85}>
            <Text style={styles.sendBackButtonText}>Send back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveButton} onPress={onApproveAndForward} activeOpacity={0.85}>
            <Text style={styles.approveButtonText}>Approve & forward</Text>
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
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  summarySubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  deptBadge: {
    backgroundColor: "#F1F3F6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deptBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#6B7280",
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
  justificationText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#374151",
    lineHeight: 17,
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  budgetCol: {
    flex: 1,
  },
  costCol: {
    alignItems: "flex-end",
  },
  costValue: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
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
  approveButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
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
