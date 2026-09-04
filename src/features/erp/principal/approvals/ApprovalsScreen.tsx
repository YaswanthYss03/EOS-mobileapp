import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getPendingApprovals,
  approveRequest,
  rejectRequest,
  type PrincipalApprovalItem,
} from "@/services/api/principal-approvals.api";

function daysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function typeIcon(type: PrincipalApprovalItem["type"]): keyof typeof Ionicons.glyphMap {
  return type === "purchase" ? "cube-outline" : "construct-outline";
}

export function ApprovalsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // This screen renders its own header below, so hide the shared
  // CollegeHeader (logo/college name) while it's focused.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const [items, setItems] = useState<PrincipalApprovalItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPendingApprovals()
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load approvals.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleAction(item: PrincipalApprovalItem, action: "approve" | "reject") {
    const key = `${item.type}-${item.id}`;
    setActingOn(key);
    const request = action === "approve" ? approveRequest : rejectRequest;
    request(item.type, item.id)
      .then(() => {
        setItems((prev) => (prev ? prev.filter((i) => !(i.type === item.type && i.id === item.id)) : prev));
        toast.success(action === "approve" ? "Approved" : "Rejected");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, `Couldn't ${action} this request.`)))
      .finally(() => setActingOn(null));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <LinearGradient
        colors={["#2F6FE0", "#1A3D8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Approvals</Text>
          <Text style={styles.subtitle}>{items ? `${items.length} pending your review` : "Loading…"}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {!loading && error && (
          <View style={styles.centerState}>
            <Ionicons name="cloud-offline-outline" size={28} color="#B0B7C3" />
            <Text style={styles.centerStateText}>{error}</Text>
            <Pressable onPress={load}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && items && items.length === 0 && (
          <View style={styles.centerState}>
            <Ionicons name="checkmark-done-circle-outline" size={32} color="#B0B7C3" />
            <Text style={styles.centerStateText}>Nothing awaiting your review right now.</Text>
          </View>
        )}

        {!loading &&
          !error &&
          items?.map((item) => (
            <ApprovalRow
              key={`${item.type}-${item.id}`}
              item={item}
              busy={actingOn === `${item.type}-${item.id}`}
              onApprove={() => handleAction(item, "approve")}
              onReject={() => handleAction(item, "reject")}
            />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ApprovalRow({
  item,
  busy,
  onApprove,
  onReject,
}: {
  item: PrincipalApprovalItem;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={typeIcon(item.type)} size={18} color="#2F6FE0" />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
          {item.estimated_amount !== null ? ` · ₹${item.estimated_amount.toLocaleString("en-IN")}` : ""}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={2}>
          {[item.department_code, item.requested_by, `raised ${daysAgo(item.raised_at)}`].filter(Boolean).join(" · ")}
        </Text>
        {item.hod_approved_at && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>HoD approved {formatDate(new Date(item.hod_approved_at))}</Text>
          </View>
        )}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.approveButton, busy && styles.buttonDisabled]}
            onPress={onApprove}
            disabled={busy}
            activeOpacity={0.8}
          >
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.approveButtonText}>Approve</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectButton, busy && styles.buttonDisabled]}
            onPress={onReject}
            disabled={busy}
            activeOpacity={0.8}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  subtitle: { fontSize: 11, fontFamily: fonts.regular, color: "#D7E2FA", marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  inlineLoading: { paddingVertical: 40, alignItems: "center" },
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    marginBottom: 10,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  rowMeta: { fontSize: 11, fontFamily: fonts.regular, color: "#8A93A3" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#F0FDF4",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontFamily: fonts.semibold, color: "#16A34A" },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  approveButton: {
    flex: 1,
    backgroundColor: "#2F6FE0",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  approveButtonText: { fontSize: 13, fontFamily: fonts.bold, color: "#fff" },
  rejectButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 9,
    alignItems: "center",
  },
  rejectButtonText: { fontSize: 13, fontFamily: fonts.bold, color: "#4B5563" },
  buttonDisabled: { opacity: 0.6 },
});
