import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
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
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { TabTransitionView, useTabScrollMemory } from "@/components/ui/tabs";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  getMyDepartmentBatches,
  getNoDueStudents,
  approveNoDue,
  type NoDueBatch,
  type NoDueStudent,
} from "@/services/api/hod-no-due.api";

type StatusTab = "cleared" | "pending";
type LoadStatus = "loading" | "success" | "error";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatRupees(amount: number) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

// HoD-facing "No-Due Approval" — a live per-student dues dashboard for the
// HoD's own department (see EOS-backend's faculty/no-due module). Search by
// roll number, filter by batch, and switch between the Cleared/Pending
// buckets (both computed live from real fee + library data, never stored).
// Approving a pending student grants a HoD override for hall-ticket access
// without touching their actual dues - they still show up under Pending
// afterwards, just with the button replaced by "Approved".
export function NoDueScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("pending");

  const [batchesStatus, setBatchesStatus] = useState<LoadStatus>("loading");
  const [batches, setBatches] = useState<NoDueBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const { anchorRef: batchAnchorRef, visible: pickerOpen, open: openPicker, close: closePicker } = useDropdown();

  const [studentsStatus, setStudentsStatus] = useState<LoadStatus>("loading");
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [students, setStudents] = useState<NoDueStudent[]>([]);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const scrollMemory = useTabScrollMemory();

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

  const loadBatches = useCallback(() => {
    setBatchesStatus("loading");
    getMyDepartmentBatches()
      .then((rows) => {
        setBatches(rows);
        setBatchesStatus("success");
      })
      .catch(() => setBatchesStatus("error"));
  }, []);

  const loadStudents = useCallback(() => {
    setStudentsStatus("loading");
    setStudentsError(null);
    getNoDueStudents({
      status: statusTab,
      batchId: selectedBatchId ?? undefined,
      search: search.trim(),
    })
      .then((rows) => {
        setStudents(rows);
        setStudentsStatus("success");
      })
      .catch((err) => {
        setStudentsError(getApiErrorMessage(err, "Couldn't load students."));
        setStudentsStatus("error");
      });
  }, [statusTab, selectedBatchId, search]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    // Light debounce so every keystroke in the search box doesn't fire a request.
    const timer = setTimeout(loadStudents, 300);
    return () => clearTimeout(timer);
  }, [loadStudents]);

  function handlePickBatch(batchId: number | null) {
    setSelectedBatchId(batchId);
    closePicker();
  }

  function handleApprove(studentId: number) {
    if (approvingId !== null) return;
    setApprovingId(studentId);
    approveNoDue(studentId)
      .then(() => {
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, override_approved: true } : s)),
        );
        toast.success("Student approved for hall ticket access");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't approve this student.")))
      .finally(() => setApprovingId(null));
  }

  const selectedBatchName = selectedBatchId
    ? batches.find((b) => b.id === selectedBatchId)?.name ?? "All Batches"
    : "All Batches";

  // Tab-invariant content (search bar, batch picker, and the tab switcher
  // itself) that used to scroll away above the ternary pending/cleared
  // student list inside one shared ScrollView. The switcher sits between
  // that content and the list rather than being the first thing after the
  // header, so hoisting it out to a fixed position (like the standard
  // pattern) would reorder it in front of the search bar - not a pure
  // animation-only change. So this whole section is duplicated once into
  // each per-tab ScrollView below (see PlacementsOverviewScreen's
  // PrincipalPlacementsBody for the same situation), and the switcher keeps
  // its original instant active/inactive swap rather than converting to
  // AnimatedTabBar (which needs to stay persistently mounted outside the
  // transitioning content to glide, which isn't possible here).
  function renderHeaderSection() {
    return (
      <>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9AA6B2" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by roll number"
            placeholderTextColor="#9AA6B2"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="characters"
          />
        </View>

        <View ref={batchAnchorRef} collapsable={false}>
          <TouchableOpacity
            style={styles.batchButton}
            activeOpacity={0.8}
            onPress={() => batchesStatus === "success" && openPicker()}
          >
            <Ionicons name="layers-outline" size={16} color="#2F6FE0" />
            <Text style={styles.batchButtonText} numberOfLines={1}>
              {selectedBatchName}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#B0B7C3" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabSwitchButton, statusTab === "pending" && styles.tabSwitchButtonActive]}
            onPress={() => setStatusTab("pending")}
          >
            <Text style={[styles.tabSwitchText, statusTab === "pending" && styles.tabSwitchTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabSwitchButton, statusTab === "cleared" && styles.tabSwitchButtonActive]}
            onPress={() => setStatusTab("cleared")}
          >
            <Text style={[styles.tabSwitchText, statusTab === "cleared" && styles.tabSwitchTextActive]}>
              Cleared
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  function renderStudentList() {
    return (
      <>
        {studentsStatus === "loading" && <SkeletonListRows count={4} />}

        {studentsStatus === "error" && (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{studentsError}</Text>
            <TouchableOpacity onPress={loadStudents} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {studentsStatus === "success" && students.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>
              No {statusTab === "cleared" ? "cleared" : "pending"} students found
            </Text>
          </View>
        )}

        {studentsStatus === "success" &&
          students.map((student) => (
            <NoDueCard
              key={student.id}
              student={student}
              approving={approvingId === student.id}
              onApprove={() => handleApprove(student.id)}
            />
          ))}
      </>
    );
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
          <Text style={styles.headerTitle}>No-Due Approval</Text>
          <Text style={styles.headerSubtitle}>Clearance requests</Text>
        </View>
      </LinearGradient>

      <TabTransitionView activeKey={statusTab} order={["pending", "cleared"]} style={styles.tabContent}>
        {statusTab === "pending" ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            {...scrollMemory.bind("pending")}
          >
            {renderHeaderSection()}
            {renderStudentList()}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            {...scrollMemory.bind("cleared")}
          >
            {renderHeaderSection()}
            {renderStudentList()}
          </ScrollView>
        )}
      </TabTransitionView>

      <AnchoredDropdown
        anchorRef={batchAnchorRef}
        visible={pickerOpen}
        onClose={closePicker}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select Batch</Text>
        <ScrollView style={styles.modalList}>
          <TouchableOpacity
            style={styles.modalRow}
            onPress={() => handlePickBatch(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.modalRowText}>All Batches</Text>
            {selectedBatchId === null && <Ionicons name="checkmark-circle" size={20} color="#2F6FE0" />}
          </TouchableOpacity>
          {batches.map((batch) => (
            <TouchableOpacity
              key={batch.id}
              style={styles.modalRow}
              onPress={() => handlePickBatch(batch.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalRowText}>{batch.name}</Text>
              {selectedBatchId === batch.id && (
                <Ionicons name="checkmark-circle" size={20} color="#2F6FE0" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>
    </SafeAreaView>
  );
}

function NoDueCard({
  student,
  approving,
  onApprove,
}: {
  student: NoDueStudent;
  approving: boolean;
  onApprove: () => void;
}) {
  // Named "Library Fine" (not "Library") since a fee_structure_items row
  // literally named "Library Fee" can also appear in student.fees - they're
  // different things (an overdue/lost-book fine vs a college fee line item).
  const rows = [
    ...student.fees,
    { category: "Library Fine", cleared: student.library.cleared, pending_amount: student.library.pending_amount },
  ];
  const isCleared = student.total_pending <= 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initialsFromName(student.name)}</Text>
        </View>
        <View style={styles.cardHeaderTextWrap}>
          <Text style={styles.cardName}>{student.name}</Text>
          <Text style={styles.cardSubtitle}>
            {student.register_no ?? student.roll_no ?? student.student_id_no}
            {student.section ? ` · ${student.section}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.feeList}>
        {rows.map((fee) => (
          <View style={styles.feeRow} key={fee.category}>
            <View style={[styles.feeDot, !fee.cleared && styles.feeDotPending]} />
            <Text style={styles.feeLabel}>{fee.category}</Text>
            {fee.cleared ? (
              <Text style={styles.feeCleared}>Cleared</Text>
            ) : (
              <Text style={styles.feePending}>{formatRupees(fee.pending_amount)}</Text>
            )}
          </View>
        ))}
      </View>

      {student.total_pending > 0 && (
        <View style={styles.totalPendingRow}>
          <Text style={styles.totalPendingLabel}>Total pending</Text>
          <Text style={styles.totalPendingValue}>{formatRupees(student.total_pending)}</Text>
        </View>
      )}

      {!isCleared && (
        <TouchableOpacity
          style={[
            styles.approveButton,
            (student.override_approved || approving) && styles.approveButtonDisabled,
          ]}
          onPress={onApprove}
          activeOpacity={0.85}
          disabled={student.override_approved || approving}
        >
          {approving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.approveButtonText}>
              {student.override_approved ? "Approved" : "Approve"}
            </Text>
          )}
        </TouchableOpacity>
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
  tabContent: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  batchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 14,
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  batchButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
    maxWidth: 200,
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
  feeList: {
    marginBottom: 4,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
  },
  feeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  feeDotPending: {
    backgroundColor: "#DC2626",
  },
  feeLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#374151",
  },
  feeCleared: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  feePending: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#DC2626",
  },
  totalPendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    paddingTop: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  totalPendingLabel: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  totalPendingValue: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#DC2626",
  },
  approveButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2F6FE0",
    paddingVertical: 12,
  },
  approveButtonDisabled: {
    backgroundColor: "#9AB3E8",
  },
  approveButtonText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    maxHeight: "70%",
  },
  anchoredCard: {
    width: 280,
    maxHeight: 360,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 10,
  },
  modalList: {
    maxHeight: 360,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalRowText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
