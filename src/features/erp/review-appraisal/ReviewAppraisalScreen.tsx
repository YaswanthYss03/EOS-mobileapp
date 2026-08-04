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
import { cycleInfo, mockAppraisals, type AppraisalStatus, type FacultyAppraisal } from "./data/mockAppraisals";

type StatusFilter = "pending" | "approved" | "returned" | "all";

const STATUS_FILTERS: StatusFilter[] = ["pending", "approved", "returned", "all"];

function initialsFromName(name: string) {
  return name
    .replace(/^(Dr|Mr|Mrs|Ms)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// TODO: this is a review UI over mockAppraisals - wire to a real appraisal
// backend endpoint once one exists. Reachable from the HoD dashboard's
// "Review Appraisal" item.
export function ReviewAppraisalScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [appraisals, setAppraisals] = useState(mockAppraisals);

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

  const counts = useMemo(
    () => ({
      pending: appraisals.filter((a) => a.status === "pending").length,
      approved: appraisals.filter((a) => a.status === "approved").length,
      returned: appraisals.filter((a) => a.status === "returned").length,
      all: appraisals.length,
    }),
    [appraisals],
  );

  const filteredAppraisals = useMemo(
    () => (statusFilter === "all" ? appraisals : appraisals.filter((a) => a.status === statusFilter)),
    [appraisals, statusFilter],
  );

  function updateStatus(id: string, status: AppraisalStatus) {
    setAppraisals((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  function handleRecommend(id: string) {
    updateStatus(id, "approved");
    toast.success("Appraisal recommended for approval");
  }

  function handleSendBack(id: string) {
    updateStatus(id, "returned");
    toast.info("Appraisal sent back to faculty");
  }

  function handleViewSubmission() {
    toast.info("Full submission view is coming soon");
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
          <Text style={styles.headerSubtitle}>{cycleInfo.label}</Text>
        </View>
      </LinearGradient>

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

        {filteredAppraisals.map((appraisal) => (
          <AppraisalCard
            key={appraisal.id}
            appraisal={appraisal}
            onRecommend={() => handleRecommend(appraisal.id)}
            onSendBack={() => handleSendBack(appraisal.id)}
            onViewSubmission={handleViewSubmission}
          />
        ))}

        {filteredAppraisals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No appraisals here</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AppraisalCard({
  appraisal,
  onRecommend,
  onSendBack,
  onViewSubmission,
}: {
  appraisal: FacultyAppraisal;
  onRecommend: () => void;
  onSendBack: () => void;
  onViewSubmission: () => void;
}) {
  const { name, empId, designation, ref, submittedOn, score, publications, projects, courses, status } = appraisal;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>{name}</Text>
          <Text style={styles.cardSubtitle}>
            {empId} · {designation}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            status === "approved" && styles.statusBadgeApproved,
            status === "returned" && styles.statusBadgeReturned,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              status === "approved" && styles.statusBadgeTextApproved,
              status === "returned" && styles.statusBadgeTextReturned,
            ]}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>REF</Text>
          <Text style={styles.metaValue}>{ref}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>SUBMITTED</Text>
          <Text style={styles.metaValue}>{submittedOn}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>SCORE</Text>
          <Text style={[styles.metaValue, styles.metaValueBlue]}>{score}/100</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{publications}</Text>
          <Text style={styles.statLabel}>Publications</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{projects}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{courses}</Text>
          <Text style={styles.statLabel}>Courses</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.viewSubmissionButton} onPress={onViewSubmission} activeOpacity={0.8}>
        <Ionicons name="document-text-outline" size={16} color="#2F6FE0" />
        <Text style={styles.viewSubmissionButtonText}>View full submission</Text>
      </TouchableOpacity>

      {status === "pending" && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.sendBackButton} onPress={onSendBack} activeOpacity={0.85}>
            <Text style={styles.sendBackButtonText}>Send back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.recommendButton} onPress={onRecommend} activeOpacity={0.85}>
            <Text style={styles.recommendButtonText}>Recommend</Text>
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
    backgroundColor: "#E4EBFB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeApproved: {
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
  statusBadgeTextApproved: {
    color: "#16A34A",
  },
  statusBadgeTextReturned: {
    color: "#DC2626",
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 12,
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
  metaValueBlue: {
    color: "#2F6FE0",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 2,
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
    marginBottom: 12,
  },
  viewSubmissionButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
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
  recommendButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    paddingVertical: 10,
  },
  recommendButtonText: {
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
