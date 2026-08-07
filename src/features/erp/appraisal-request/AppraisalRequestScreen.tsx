import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { fonts } from "@/theme";
import { useRole } from "@/hooks/useRole";
import { toast } from "@/utils/toast";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getAppraisalCriteria,
  createAppraisalRequest,
  listMyAppraisalRequests,
  uploadAppraisalAttachments,
  type AppraisalDivision,
  type AppraisalStatus,
  type MyAppraisalRequest,
  type PickedAppraisalFile,
} from "@/services/api/appraisal-requests.api";

type Tab = "apply" | "history";
type LoadStatus = "loading" | "success" | "error";

const STATUS_LABEL: Record<AppraisalStatus, string> = {
  submitted: "Submitted",
  hod_reviewed: "HoD Reviewed",
  hr_scored: "Scored",
  management_approved: "Approved",
  rejected: "Rejected",
};

// Wired to GET /me/appraisal-criteria, POST /me/appraisal_requests and
// GET /me/appraisal_requests (real appraisal_divisions/appraisal_criteria/
// appraisal_requests/appraisal_entries rows). This is the logged-in
// employee's OWN appraisal submission (Employee section), not the HoD's
// review of others' appraisals (see erp/review-appraisal). Reachable from
// both the Employee/Faculty and HoD dashboards. The real data is
// criteria-driven (a fixed set of divisions/criteria per academic year, each
// with one free-text description - no multi-field structured entries and no
// user-addable repeat entries), so the category cards below now render the
// real divisions/criteria instead of a hardcoded taxonomy. There is no
// cycle-deadline concept in the schema, so the header shows the real
// academic year instead of a fabricated "closes on" date. HR Payroll has no
// appraisal cycle of their own to apply for (GET /me/appraisal-criteria is
// @Roles(ROLES.FACULTY) only), so this role only ever sees History - no
// Apply tab, no criteria fetch.
export function AppraisalRequestScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const role = useRole();
  const canApply = role !== "hr-payroll";

  const [tab, setTab] = useState<Tab>(canApply ? "apply" : "history");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [descriptions, setDescriptions] = useState<Record<number, string>>({});
  const [stagedFiles, setStagedFiles] = useState<Record<number, PickedAppraisalFile[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [criteriaStatus, setCriteriaStatus] = useState<LoadStatus>("loading");
  const [criteriaError, setCriteriaError] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<AppraisalDivision[]>([]);

  const [historyStatus, setHistoryStatus] = useState<LoadStatus>("loading");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<MyAppraisalRequest[]>([]);

  const loadCriteria = useCallback(() => {
    setCriteriaStatus("loading");
    setCriteriaError(null);
    getAppraisalCriteria()
      .then((response) => {
        setAcademicYear(response.academic_year);
        setDivisions(response.divisions);
        setExpandedId(response.divisions[0]?.id ?? null);
        setCriteriaStatus("success");
      })
      .catch((err) => {
        setCriteriaError(getApiErrorMessage(err, "Couldn't load appraisal categories."));
        setCriteriaStatus("error");
      });
  }, []);

  const loadHistory = useCallback(() => {
    setHistoryStatus("loading");
    setHistoryError(null);
    listMyAppraisalRequests()
      .then((response) => {
        setHistory(response);
        setHistoryStatus("success");
      })
      .catch((err) => {
        setHistoryError(getApiErrorMessage(err, "Couldn't load your appraisal history."));
        setHistoryStatus("error");
      });
  }, []);

  useEffect(() => {
    if (canApply) loadCriteria();
  }, [canApply, loadCriteria]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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

  function toggleExpanded(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function updateDescription(criteriaId: number, value: string) {
    setDescriptions((prev) => ({ ...prev, [criteriaId]: value }));
  }

  async function handlePickFiles(divisionId: number) {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;

    const picked: PickedAppraisalFile[] = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
    }));
    setStagedFiles((prev) => ({ ...prev, [divisionId]: [...(prev[divisionId] ?? []), ...picked] }));
  }

  function removeStagedFile(divisionId: number, index: number) {
    setStagedFiles((prev) => ({
      ...prev,
      [divisionId]: (prev[divisionId] ?? []).filter((_, i) => i !== index),
    }));
  }

  function resetForm() {
    setDescriptions({});
    setStagedFiles({});
    setExpandedId(divisions[0]?.id ?? null);
  }

  function handleSubmit() {
    if (!academicYear) {
      toast.warning("No appraisal cycle is open right now");
      return;
    }

    const entries = Object.entries(descriptions)
      .filter(([, value]) => value.trim())
      .map(([criteriaId, value]) => ({ criteria_id: Number(criteriaId), description: value.trim() }));

    if (entries.length === 0) {
      toast.warning("Fill in at least one criterion before submitting");
      return;
    }

    setIsSubmitting(true);
    createAppraisalRequest({ academic_year: academicYear, entries })
      .then(async (created) => {
        const divisionsWithFiles = Object.entries(stagedFiles).filter(([, files]) => files.length > 0);
        const uploadResults = await Promise.allSettled(
          divisionsWithFiles.map(([divisionId, files]) =>
            uploadAppraisalAttachments(created.id, Number(divisionId), files),
          ),
        );
        const failedCount = uploadResults.filter((r) => r.status === "rejected").length;

        if (failedCount > 0) {
          toast.error(
            `Appraisal request submitted, but ${failedCount} attachment upload${failedCount > 1 ? "s" : ""} failed`,
          );
        } else {
          toast.success("Appraisal request submitted");
        }
        resetForm();
        setTab("history");
        loadHistory();
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't submit your appraisal request."));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
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
          <Text style={styles.headerTitle}>Request Appraisal</Text>
          <Text style={styles.headerSubtitle}>
            {academicYear ? `Academic Year ${academicYear}` : "Appraisal"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {canApply && (
          <View style={styles.tabSwitch}>
            <TouchableOpacity
              style={[styles.tabSwitchButton, tab === "apply" && styles.tabSwitchButtonActive]}
              onPress={() => setTab("apply")}
            >
              <Text style={[styles.tabSwitchText, tab === "apply" && styles.tabSwitchTextActive]}>Apply</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabSwitchButton, tab === "history" && styles.tabSwitchButtonActive]}
              onPress={() => setTab("history")}
            >
              <Text style={[styles.tabSwitchText, tab === "history" && styles.tabSwitchTextActive]}>History</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === "apply" ? (
          criteriaStatus === "loading" ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color="#2F6FE0" />
            </View>
          ) : criteriaStatus === "error" ? (
            <View style={styles.errorNotice}>
              <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
              <Text style={styles.errorNoticeText}>{criteriaError ?? "Something went wrong."}</Text>
              <TouchableOpacity onPress={loadCriteria} style={styles.retryButton} activeOpacity={0.8}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : divisions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
              <Text style={styles.emptyStateText}>No appraisal cycle is open right now</Text>
            </View>
          ) : (
            <>
              {divisions.map((division) => (
                <AppraisalCategoryCard
                  key={division.id}
                  division={division}
                  descriptions={descriptions}
                  stagedFiles={stagedFiles[division.id] ?? []}
                  expanded={expandedId === division.id}
                  onToggleExpand={() => toggleExpanded(division.id)}
                  onUpdateDescription={updateDescription}
                  onPickFiles={() => handlePickFiles(division.id)}
                  onRemoveStagedFile={(index) => removeStagedFile(division.id, index)}
                />
              ))}

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Appraisal Request</Text>
                )}
              </TouchableOpacity>
            </>
          )
        ) : historyStatus === "loading" ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#2F6FE0" />
          </View>
        ) : historyStatus === "error" ? (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{historyError ?? "Something went wrong."}</Text>
            <TouchableOpacity onPress={loadHistory} style={styles.retryButton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={32} color="#B0B7C3" />
            <Text style={styles.emptyStateText}>No appraisal history yet</Text>
          </View>
        ) : (
          history.map((item) => <HistoryCard key={item.id} item={item} showFaculty={!canApply} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AppraisalCategoryCard({
  division,
  descriptions,
  stagedFiles,
  expanded,
  onToggleExpand,
  onUpdateDescription,
  onPickFiles,
  onRemoveStagedFile,
}: {
  division: AppraisalDivision;
  descriptions: Record<number, string>;
  stagedFiles: PickedAppraisalFile[];
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdateDescription: (criteriaId: number, value: string) => void;
  onPickFiles: () => void;
  onRemoveStagedFile: (index: number) => void;
}) {
  const filledCount = division.criteria.filter((c) => descriptions[c.id]?.trim()).length;

  return (
    <View style={styles.categoryCard}>
      <TouchableOpacity style={styles.categoryHeader} onPress={onToggleExpand} activeOpacity={0.8}>
        <View style={styles.categoryAccent} />
        <View style={styles.categoryTextWrap}>
          <Text style={styles.categoryTitle}>{division.name}</Text>
          <Text style={styles.categorySubtitle}>
            {division.criteria.length} criteria · max {division.criteria.reduce((sum, c) => sum + c.max_score, 0)}
          </Text>
        </View>
        <View style={styles.addedBadge}>
          <Text style={styles.addedBadgeText}>
            {filledCount}/{division.criteria.length} filled
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#B0B7C3" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.categoryBody}>
          {division.criteria.map((criterion) => (
            <View key={criterion.id} style={styles.entryBlock}>
              <Text style={styles.entryLabel}>
                {criterion.name.toUpperCase()} · MAX {criterion.max_score}
              </Text>
              <View style={styles.fieldGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Describe your contribution"
                  placeholderTextColor="#9AA6B2"
                  value={descriptions[criterion.id] ?? ""}
                  onChangeText={(text) => onUpdateDescription(criterion.id, text)}
                  multiline
                />
              </View>
            </View>
          ))}

          <Text style={styles.attachmentsLabel}>SUPPORTING DOCUMENTS</Text>
          {stagedFiles.map((file, index) => (
            <View key={`${file.uri}-${index}`} style={styles.stagedFileRow}>
              <Ionicons name="document-attach-outline" size={16} color="#2F6FE0" />
              <Text style={styles.stagedFileName} numberOfLines={1}>
                {file.name}
              </Text>
              <TouchableOpacity onPress={() => onRemoveStagedFile(index)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#9AA6B2" />
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.uploadButton} onPress={onPickFiles} activeOpacity={0.8}>
            <Ionicons name="cloud-upload-outline" size={16} color="#2F6FE0" />
            <Text style={styles.uploadButtonText}>Upload files</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function HistoryCard({ item, showFaculty = false }: { item: MyAppraisalRequest; showFaculty?: boolean }) {
  const scoredEntries = item.entries.filter((entry) => entry.score !== null);
  const totalScore = scoredEntries.reduce((sum, entry) => sum + (entry.score ?? 0), 0);
  const totalMax = scoredEntries.reduce((sum, entry) => sum + entry.criteria.max_score, 0);

  return (
    <View style={styles.historyCard}>
      {showFaculty && (
        <Text style={styles.historyFacultyName}>
          {item.faculty.first_name} {item.faculty.last_name} · {item.faculty.designation}
        </Text>
      )}
      <View style={styles.historyHeader}>
        <Text style={styles.historyCycle}>Cycle {item.academic_year}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "hod_reviewed" && styles.statusBadgeHodReviewed,
            item.status === "hr_scored" && styles.statusBadgeHrScored,
            item.status === "management_approved" && styles.statusBadgeApproved,
            item.status === "rejected" && styles.statusBadgeReturned,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              item.status === "hod_reviewed" && styles.statusBadgeTextHodReviewed,
              item.status === "hr_scored" && styles.statusBadgeTextHrScored,
              item.status === "management_approved" && styles.statusBadgeTextApproved,
              item.status === "rejected" && styles.statusBadgeTextReturned,
            ]}
          >
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.historySubmittedOn}>Submitted {formatDate(new Date(item.created_at))}</Text>
      {totalMax > 0 && (
        <Text style={styles.historyScore}>
          Score: {totalScore}/{totalMax}
        </Text>
      )}
      {item.attachments.length > 0 && (
        <View style={styles.historyAttachments}>
          {item.attachments.map((attachment) => (
            <TouchableOpacity
              key={attachment.id}
              style={styles.historyAttachmentRow}
              onPress={() => Linking.openURL(attachment.file_url)}
              activeOpacity={0.7}
            >
              <Ionicons name="document-attach-outline" size={14} color="#2F6FE0" />
              <Text style={styles.historyAttachmentName} numberOfLines={1}>
                {attachment.file_name}
              </Text>
            </TouchableOpacity>
          ))}
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
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  categoryAccent: {
    width: 4,
    height: 32,
    borderRadius: 2,
    backgroundColor: "#2F6FE0",
  },
  categoryTextWrap: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  categorySubtitle: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  addedBadge: {
    backgroundColor: "#E4EBFB",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addedBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  categoryBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
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
    marginBottom: 10,
  },
  fieldGroup: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  attachmentsLabel: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 8,
  },
  stagedFileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  stagedFileName: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#111827",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#B7CBE6",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
  },
  uploadButtonText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 4,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#fff",
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  historyFacultyName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
    marginBottom: 6,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  historyCycle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
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
  statusBadgeHodReviewed: {
    backgroundColor: "#EAF0FD",
  },
  statusBadgeHrScored: {
    backgroundColor: "#F3E8FF",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#D97706",
  },
  statusBadgeTextApproved: {
    color: "#16A34A",
  },
  statusBadgeTextReturned: {
    color: "#DC2626",
  },
  statusBadgeTextHodReviewed: {
    color: "#2F6FE0",
  },
  statusBadgeTextHrScored: {
    color: "#9333EA",
  },
  historySubmittedOn: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 6,
  },
  historyScore: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#2F6FE0",
    marginTop: 4,
  },
  historyAttachments: {
    marginTop: 8,
    gap: 6,
  },
  historyAttachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyAttachmentName: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#2F6FE0",
    textDecorationLine: "underline",
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
  inlineLoading: {
    paddingVertical: 48,
    alignItems: "center",
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 48,
    paddingHorizontal: 16,
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
  submitButtonDisabled: {
    backgroundColor: "#B7CBE6",
  },
});
