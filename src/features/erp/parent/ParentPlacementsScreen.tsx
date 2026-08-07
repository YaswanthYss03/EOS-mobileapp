import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { getChildUpcomingDrives, getChildPlacementHistory } from "@/services/api/parents.api";
import type { UpcomingDrive, DriveHistoryItem, ApplicationStatus } from "@/services/api/placements.api";
import { useParentChildren } from "./useParentChildren";
import { ChildSelector } from "./ChildSelector";

type PlacementTab = "upcoming" | "history";
type LoadStatus = "loading" | "success" | "error";

// "Round N cleared" comes straight from drive_application_status_enum
// (applied/r1_cleared/r2_cleared/r3_cleared/rejected/placed) - the schema
// has no named-round checklist, just this one coarse per-drive status - see
// PlacementsOverviewScreen's StudentPlacementsBody for the same table.
const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; bg: string; text: string }> = {
  applied: { label: "Applied", bg: "#EAF0FD", text: "#2F6FE0" },
  r1_cleared: { label: "Round 1 cleared", bg: "#FEF3C7", text: "#D97706" },
  r2_cleared: { label: "Round 2 cleared", bg: "#FEF3C7", text: "#D97706" },
  r3_cleared: { label: "Round 3 cleared", bg: "#FEF3C7", text: "#D97706" },
  placed: { label: "Offer", bg: "#F0FDF4", text: "#16A34A" },
  rejected: { label: "Rejected", bg: "#FEF2F2", text: "#DC2626" },
};

function PlacementsHeader({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#2F6FE0", "#1A3D8F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Placements</Text>
    </LinearGradient>
  );
}

// Same real GET /drives/student/upcoming + /history data/UI as the
// student's own StudentPlacementsBody (see PlacementsOverviewScreen.tsx),
// just scoped to the parent's selected child via
// GET /me/children/:studentId/upcoming-drives and .../placement-history -
// see parents.api.ts.
export function ParentPlacementsScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const { status: childrenStatus, error: childrenError, children, selectedChild, setSelectedChildId, reload: reloadChildren } =
    useParentChildren();

  const [tab, setTab] = useState<PlacementTab>("upcoming");

  const [upcoming, setUpcoming] = useState<UpcomingDrive[] | null>(null);
  const [upcomingStatus, setUpcomingStatus] = useState<LoadStatus>("loading");

  const [history, setHistory] = useState<DriveHistoryItem[] | null>(null);
  const [historyStatus, setHistoryStatus] = useState<LoadStatus>("loading");

  const loadUpcoming = useCallback((studentId: number) => {
    setUpcomingStatus("loading");
    getChildUpcomingDrives(studentId)
      .then((rows) => {
        setUpcoming(rows);
        setUpcomingStatus("success");
      })
      .catch(() => setUpcomingStatus("error"));
  }, []);

  const loadHistory = useCallback((studentId: number) => {
    setHistoryStatus("loading");
    getChildPlacementHistory(studentId)
      .then((rows) => {
        setHistory(rows);
        setHistoryStatus("success");
      })
      .catch(() => setHistoryStatus("error"));
  }, []);

  useEffect(() => {
    if (selectedChild) loadUpcoming(selectedChild.id);
  }, [selectedChild, loadUpcoming]);

  useEffect(() => {
    if (selectedChild) loadHistory(selectedChild.id);
  }, [selectedChild, loadHistory]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        header: () => <PlacementsHeader onBack={() => router.back()} />,
      });
      return () => {
        navigation.getParent()?.setOptions({ header: () => <CollegeHeader /> });
      };
    }, [navigation, router]),
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.content}>
        {childrenStatus === "loading" && (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        )}

        {childrenStatus === "error" && (
          <ErrorNotice message={childrenError ?? "Something went wrong."} onRetry={reloadChildren} />
        )}

        {childrenStatus === "success" && children.length === 0 && (
          <View style={styles.centerState}>
            <Ionicons name="people-outline" size={32} color="#B0B7C3" />
            <Text style={styles.centerStateText}>No linked children found</Text>
          </View>
        )}

        {childrenStatus === "success" && selectedChild && (
          <>
            <ChildSelector children={children} selected={selectedChild} onSelect={(c) => setSelectedChildId(c.id)} />

            <TabSwitch tab={tab} setTab={setTab} />

            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {tab === "upcoming" ? (
                upcomingStatus === "loading" ? (
                  <LoadingState />
                ) : upcomingStatus === "error" ? (
                  <ErrorState onRetry={() => loadUpcoming(selectedChild.id)} />
                ) : upcoming && upcoming.length > 0 ? (
                  upcoming.map((drive) => <UpcomingCard key={drive.drive_id} drive={drive} />)
                ) : (
                  <EmptyState icon="briefcase-outline" text="No drives coming up right now." />
                )
              ) : historyStatus === "loading" ? (
                <LoadingState />
              ) : historyStatus === "error" ? (
                <ErrorState onRetry={() => loadHistory(selectedChild.id)} />
              ) : history && history.length > 0 ? (
                history.map((item) => <HistoryCard key={item.drive_id} item={item} />)
              ) : (
                <EmptyState icon="document-text-outline" text="No placement history yet." />
              )}
            </ScrollView>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function UpcomingCard({ drive }: { drive: UpcomingDrive }) {
  const meta = APPLICATION_STATUS_META[drive.application_status];

  return (
    <View style={[styles.card, !drive.is_disclosed && styles.cardUndisclosed]}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeader}>
          {!drive.is_disclosed && <Ionicons name="lock-closed" size={14} color="#8A93A3" />}
          <Text style={[styles.company, !drive.is_disclosed && styles.companyUndisclosed]}>{drive.company_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(drive.scheduled_date))}</Text>
      </View>

      {drive.is_disclosed && drive.company_profile_info && (
        <Text style={styles.profileInfo}>{drive.company_profile_info}</Text>
      )}

      {!drive.is_disclosed && (
        <Text style={styles.revealHint}>
          {drive.disclosed_reveal_date
            ? `Company name reveals on ${formatDate(new Date(drive.disclosed_reveal_date))}`
            : "Company name will be revealed closer to the drive date."}
        </Text>
      )}
    </View>
  );
}

// A rejection overwrites application_status, but last_cleared_round is
// tracked separately and survives it - see PlacementsOverviewScreen's
// historyStatusLabel for the same logic.
function historyStatusLabel(item: DriveHistoryItem): string {
  const base = APPLICATION_STATUS_META[item.application_status].label;
  if (item.application_status === "rejected" && item.last_cleared_round) {
    return `Round ${item.last_cleared_round} cleared · ${base}`;
  }
  return base;
}

function HistoryCard({ item }: { item: DriveHistoryItem }) {
  const meta = APPLICATION_STATUS_META[item.application_status];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.company}>{item.company_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusBadgeText, { color: meta.text }]}>{historyStatusLabel(item)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={13} color="#8A93A3" />
        <Text style={styles.metaText}>Drive on {formatDate(new Date(item.scheduled_date))}</Text>
      </View>
    </View>
  );
}

function TabSwitch({ tab, setTab }: { tab: PlacementTab; setTab: (tab: PlacementTab) => void }) {
  return (
    <View style={styles.tabSwitch}>
      <TouchableOpacity
        style={[styles.tabSwitchButton, tab === "upcoming" && styles.tabSwitchButtonActive]}
        onPress={() => setTab("upcoming")}
      >
        <Text style={[styles.tabSwitchText, tab === "upcoming" && styles.tabSwitchTextActive]}>Upcoming drives</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabSwitchButton, tab === "history" && styles.tabSwitchButtonActive]}
        onPress={() => setTab("history")}
      >
        <Text style={[styles.tabSwitchText, tab === "history" && styles.tabSwitchTextActive]}>History</Text>
      </TouchableOpacity>
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

function LoadingState() {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="small" color="#2F6FE0" />
      <Text style={styles.centerStateText}>Loading...</Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>Couldn't load this. Please try again.</Text>
      <TouchableOpacity onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.centerState}>
      <Ionicons name={icon} size={32} color="#B0B7C3" />
      <Text style={styles.centerStateText}>{text}</Text>
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
  content: {
    flex: 1,
    padding: 16,
  },
  inlineLoading: {
    paddingVertical: 24,
    alignItems: "center",
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
    paddingVertical: 12,
  },
  tabSwitchButtonActive: {
    backgroundColor: "#2F6FE0",
  },
  tabSwitchText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#4B5563",
  },
  tabSwitchTextActive: {
    color: "#fff",
    fontFamily: fonts.bold,
  },
  list: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 14,
  },
  cardUndisclosed: {
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    backgroundColor: "#FAFAFB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  company: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  companyUndisclosed: {
    color: "#6B7280",
    fontFamily: fonts.semibold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#8A93A3",
  },
  profileInfo: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 18,
  },
  revealHint: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginTop: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
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
});
