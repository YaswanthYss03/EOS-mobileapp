import { useCallback, useEffect, useState, type RefObject } from "react";
import { View, Text, ScrollView, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonStatCards, SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import { formatDate } from "@/utils/calendar";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getPrincipalFeedbackOverview,
  type PrincipalFeedbackOverview,
  type PrincipalFeedbackRecentForm,
} from "@/services/api/principal-feedback.api";
import { getPlacementBatches, type PlacementBatch } from "@/services/api/placements.api";
import { listDepartments, type Department } from "@/services/api/departments.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

function formTypeLabel(formType: string): string {
  if (formType === "end_semester") return "End-semester";
  if (formType === "general") return "General";
  return formType.charAt(0).toUpperCase() + formType.slice(1).replace(/_/g, " ");
}

function scopeLabel(form: PrincipalFeedbackRecentForm): string {
  if (form.class_section) return `Class ${form.class_section}`;
  if (form.batch_name) return `Batch ${form.batch_name}`;
  return "Institute-wide";
}

// Institution-wide Feedback overview - Correspondent only for now (see
// CorrespondentDashboard.tsx - this rolls up every feedback_forms row the
// Academic Coordinator has created/published, same "overview dashboard"
// shape as this section's other tiles, e.g. HostelScreen.tsx/
// CopyCenterScreen.tsx). Read-only - no create/edit here, that stays on the
// Academic Coordinator's own feedback module.
export function FeedbackScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      // No cleanup - see PrincipalStudentsScreen.tsx's comment.
      return undefined;
    }, [navigation]),
  );

  const [overview, setOverview] = useState<PrincipalFeedbackOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<PlacementBatch[]>([]);
  const [department, setDepartment] = useState<Department | null>(null);
  const [batch, setBatch] = useState<PlacementBatch | null>(null);
  const departmentPicker = useDropdown();
  const batchPicker = useDropdown();

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => {});
    getPlacementBatches().then(setBatches).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getPrincipalFeedbackOverview({ department_id: department?.id, batch_id: batch?.id })
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err, "Couldn't load the Feedback overview.")))
      .finally(() => setLoading(false));
  }, [department, batch]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
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
          <Text style={styles.title}>Feedback</Text>
          <Text style={styles.subtitle}>
            {overview
              ? `${overview.published_forms} published${
                  overview.overall_response_rate_pct !== null
                    ? ` · ${overview.overall_response_rate_pct}% response rate`
                    : ""
                }`
              : "Loading…"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <>
            <SkeletonStatCards count={4} style={styles.statsSkeletonSpacing} />
            <SkeletonListRows count={4} />
          </>
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

        {!loading && !error && overview && (
          <>
            <View style={styles.statsGrid}>
              <StatCard label="Published" value={overview.published_forms.toLocaleString()} subtitle="forms" />
              <StatCard label="Draft" value={overview.draft_forms.toLocaleString()} subtitle="forms" />
              <StatCard label="Responses" value={overview.total_responses.toLocaleString()} subtitle="collected" />
              <StatCard
                label="Avg rating"
                value={overview.overall_average_rating !== null ? overview.overall_average_rating.toFixed(2) : "—"}
                subtitle="out of 5"
              />
            </View>

            <View style={styles.rateCard}>
              <Text style={styles.sectionTitle}>Response rate</Text>
              <Text style={styles.rateValue}>
                {overview.overall_response_rate_pct !== null ? `${overview.overall_response_rate_pct}%` : "—"}
              </Text>
              <Text style={styles.rateSubtitle}>
                {overview.total_respondents.toLocaleString()} of {overview.total_target_students.toLocaleString()}{" "}
                targeted responses across {overview.total_forms} form{overview.total_forms === 1 ? "" : "s"}
              </Text>
            </View>

            <View style={styles.pillsRow}>
              <FilterPill
                label={department ? department.code : "Department"}
                active={!!department}
                onPress={departmentPicker.toggle}
                anchorRef={departmentPicker.anchorRef}
              />
              <FilterPill
                label={batch ? batch.name : "Batch"}
                active={!!batch}
                onPress={batchPicker.toggle}
                anchorRef={batchPicker.anchorRef}
              />
              {(department || batch) && (
                <TouchableOpacity
                  style={styles.clearPill}
                  onPress={() => {
                    setDepartment(null);
                    setBatch(null);
                  }}
                >
                  <Text style={styles.clearPillText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.sectionTitle}>Recent forms</Text>

            {overview.recent_forms.length === 0 && (
              <View style={styles.centerState}>
                <Text style={styles.centerStateText}>No feedback forms created yet.</Text>
              </View>
            )}

            {overview.recent_forms.map((form) => (
              <RecentFormCard key={form.id} form={form} />
            ))}
          </>
        )}
      </ScrollView>

      <AnchoredDropdown
        anchorRef={departmentPicker.anchorRef}
        visible={departmentPicker.visible}
        onClose={departmentPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select a department</Text>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.modalOptionRow}
            onPress={() => {
              setDepartment(null);
              departmentPicker.close();
            }}
          >
            <Text style={styles.modalOptionName}>All departments</Text>
            {!department && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {departments.map((dept) => (
            <TouchableOpacity
              key={dept.id}
              style={styles.modalOptionRow}
              onPress={() => {
                setDepartment(dept);
                departmentPicker.close();
              }}
            >
              <Text style={styles.modalOptionName}>{dept.name}</Text>
              {department?.id === dept.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>

      <AnchoredDropdown
        anchorRef={batchPicker.anchorRef}
        visible={batchPicker.visible}
        onClose={batchPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Select a batch</Text>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.modalOptionRow}
            onPress={() => {
              setBatch(null);
              batchPicker.close();
            }}
          >
            <Text style={styles.modalOptionName}>All batches</Text>
            {!batch && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {batches.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.modalOptionRow}
              onPress={() => {
                setBatch(b);
                batchPicker.close();
              }}
            >
              <Text style={styles.modalOptionName}>{b.name}</Text>
              {batch?.id === b.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>
    </SafeAreaView>
  );
}

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
  anchorRef,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  anchorRef: RefObject<View | null>;
}) {
  return (
    <View ref={anchorRef} collapsable={false}>
      <TouchableOpacity style={[styles.pill, active && styles.pillActive]} onPress={onPress} activeOpacity={0.8}>
        <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
        <Ionicons name="chevron-down" size={14} color={active ? "#fff" : "#8A93A3"} />
      </TouchableOpacity>
    </View>
  );
}

function RecentFormCard({ form }: { form: PrincipalFeedbackRecentForm }) {
  return (
    <View style={styles.formCard}>
      <View style={styles.formHeaderRow}>
        <Text style={styles.formTitle} numberOfLines={1}>
          {form.title}
        </Text>
        <View style={[styles.statusBadge, form.is_published ? styles.statusBadgePublished : styles.statusBadgeDraft]}>
          <Text style={[styles.statusBadgeText, form.is_published ? styles.statusTextPublished : styles.statusTextDraft]}>
            {form.is_published ? "Published" : "Draft"}
          </Text>
        </View>
      </View>
      <Text style={styles.formMeta}>
        {formTypeLabel(form.form_type)} · {scopeLabel(form)} · {formatDate(new Date(form.created_at))}
      </Text>
      <View style={styles.formStatsRow}>
        <FormStat label="Respondents" value={`${form.respondent_count}/${form.target_student_count}`} />
        <FormStat label="Rate" value={form.response_rate_pct !== null ? `${form.response_rate_pct}%` : "—"} />
        <FormStat label="Avg rating" value={form.average_rating !== null ? form.average_rating.toFixed(2) : "—"} />
      </View>
    </View>
  );
}

function FormStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.formStat}>
      <Text style={styles.formStatLabel}>{label}</Text>
      <Text style={styles.formStatValue}>{value}</Text>
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
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  subtitle: { fontSize: 11, fontFamily: fonts.regular, color: "#D7E2FA", marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  centerState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  centerStateText: { fontSize: 13, fontFamily: fonts.medium, color: "#9AA6B2", textAlign: "center", paddingHorizontal: 20 },
  retryText: { fontSize: 13, fontFamily: fonts.bold, color: "#2F6FE0", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statsSkeletonSpacing: { marginBottom: 20 },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 14,
    gap: 4,
  },
  statLabel: { fontSize: 11, fontFamily: fonts.medium, color: "#8A93A3" },
  statValue: { fontSize: 22, fontFamily: fonts.bold, color: "#111827" },
  statSubtitle: { fontSize: 10, fontFamily: fonts.regular, color: "#9AA6B2" },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: "#111827", marginBottom: 10 },
  rateCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 20,
    gap: 4,
  },
  rateValue: { fontSize: 24, fontFamily: fonts.bold, color: "#2F6FE0" },
  rateSubtitle: { fontSize: 12, fontFamily: fonts.regular, color: "#8A93A3" },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  formHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  formTitle: { flex: 1, fontSize: 14, fontFamily: fonts.bold, color: "#111827" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgePublished: { backgroundColor: "#E7F6EC" },
  statusBadgeDraft: { backgroundColor: "#F2F0FB" },
  statusBadgeText: { fontSize: 10, fontFamily: fonts.bold },
  statusTextPublished: { color: "#1E8E4F" },
  statusTextDraft: { color: "#6B5EC5" },
  formMeta: { fontSize: 11, fontFamily: fonts.regular, color: "#9AA6B2" },
  formStatsRow: { flexDirection: "row", gap: 20 },
  formStat: { gap: 2 },
  formStatLabel: { fontSize: 10, fontFamily: fonts.medium, color: "#9AA6B2" },
  formStatValue: { fontSize: 13, fontFamily: fonts.bold, color: "#111827" },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEF0F4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: "#2F6FE0", borderColor: "#2F6FE0" },
  pillText: { fontSize: 12, fontFamily: fonts.medium, color: "#4B5563" },
  pillTextActive: { color: "#fff" },
  clearPill: { justifyContent: "center", paddingHorizontal: 10, paddingVertical: 8 },
  clearPillText: { fontSize: 12, fontFamily: fonts.semibold, color: "#E0724F" },
  modalCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, maxHeight: "70%" },
  anchoredCard: {
    width: 240,
    maxHeight: 320,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitle: { fontSize: 15, fontFamily: fonts.bold, color: "#111827", marginBottom: 10 },
  modalList: { marginBottom: 4 },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionName: { fontSize: 14, fontFamily: fonts.semibold, color: "#111827" },
});
