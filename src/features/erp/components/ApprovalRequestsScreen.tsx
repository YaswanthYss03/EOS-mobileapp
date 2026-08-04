import { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { departmentInfo } from "../data/departmentInfo";
import type { ApprovalRequest, ApprovalStatus } from "../types";

type Tab = "student" | "faculty";
type StatusFilter = "pending" | "approved" | "rejected" | "all";

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

type Props = {
  title: string;
  studentHeaderSubtitle: string;
  facultyHeaderSubtitle: string;
  initialStudentRequests: ApprovalRequest[];
  initialFacultyRequests: ApprovalRequest[];
};

// Shared HoD approve/reject workflow screen - Leave and On Duty are both
// thin wrappers over this (same layout: Student/Faculty toggle, context row,
// status filters, request cards). See src/features/erp/leave/LeaveScreen.tsx
// and src/features/erp/od/OdScreen.tsx.
export function ApprovalRequestsScreen({
  title,
  studentHeaderSubtitle,
  facultyHeaderSubtitle,
  initialStudentRequests,
  initialFacultyRequests,
}: Props) {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();

  const [tab, setTab] = useState<Tab>(initialTab === "faculty" ? "faculty" : "student");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [studentRequests, setStudentRequests] = useState(initialStudentRequests);
  const [facultyRequests, setFacultyRequests] = useState(initialFacultyRequests);

  // This screen renders its own full header below, so hide the shared
  // CollegeHeader while it's focused - same pattern as the ERP employee/hod
  // dashboards and the attendance screen.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const requests = tab === "student" ? studentRequests : facultyRequests;

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

  function updateStatus(id: string, status: ApprovalStatus) {
    if (tab === "student") {
      setStudentRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } else {
      setFacultyRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    }
  }

  function handleApprove(id: string) {
    updateStatus(id, "approved");
    toast.success(`${title} request approved`);
  }

  function handleReject(id: string) {
    updateStatus(id, "rejected");
    toast.info(`${title} request rejected`);
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
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>
            {tab === "student" ? studentHeaderSubtitle : facultyHeaderSubtitle}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.tabSwitch}>
        <TouchableOpacity
          style={[styles.tabSwitchButton, tab === "student" && styles.tabSwitchButtonActive]}
          onPress={() => switchTab("student")}
        >
          <Text style={[styles.tabSwitchText, tab === "student" && styles.tabSwitchTextActive]}>Student</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabSwitchButton, tab === "faculty" && styles.tabSwitchButtonActive]}
          onPress={() => switchTab("faculty")}
        >
          <Text style={[styles.tabSwitchText, tab === "faculty" && styles.tabSwitchTextActive]}>Faculty</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === "student" ? (
          <TouchableOpacity style={styles.contextCard} activeOpacity={0.8}>
            <View style={styles.contextIconWrap}>
              <Ionicons name="people-outline" size={16} color="#2F6FE0" />
            </View>
            <View style={styles.contextTextWrap}>
              <Text style={styles.contextTitle}>All sections</Text>
              <Text style={styles.contextSubtitle}>Whole department · {departmentInfo.sectionCount} sections</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
          </TouchableOpacity>
        ) : (
          <View style={styles.contextCard}>
            <View style={styles.contextIconWrap}>
              <Ionicons name="business-outline" size={16} color="#2F6FE0" />
            </View>
            <View style={styles.contextTextWrap}>
              <Text style={styles.contextTitle}>{departmentInfo.name}</Text>
              <Text style={styles.contextSubtitle}>{departmentInfo.facultyCount} faculty · Head of Department</Text>
            </View>
            <View style={styles.myDeptBadge}>
              <Text style={styles.myDeptBadgeText}>MY DEPT</Text>
            </View>
          </View>
        )}

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
          <ApprovalRequestCard
            key={request.id}
            request={request}
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
      </ScrollView>
    </SafeAreaView>
  );
}

function ApprovalRequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: ApprovalRequest;
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
          <TouchableOpacity style={styles.rejectButton} onPress={onReject} activeOpacity={0.85}>
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveButton} onPress={onApprove} activeOpacity={0.85}>
            <Text style={styles.approveButtonText}>Approve</Text>
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
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  statusPill: {
    flex: 1,
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusPillActive: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  statusPillTextActive: {
    color: "#fff",
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
