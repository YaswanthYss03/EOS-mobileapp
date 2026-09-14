import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import {
  getMySubjectRecordMappings,
  getMySubjectRecordDetail,
  publishSubjectRecordResult,
  parseClassLabel,
  type SubjectRecordMapping,
  type SubjectRecordDetail,
} from "@/services/api/subject-records.api";

type LoadStatus = "loading" | "success" | "error";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function SubjectRecordsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mappingsStatus, setMappingsStatus] = useState<LoadStatus>("loading");
  const [mappingsError, setMappingsError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<SubjectRecordMapping[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<number | null>(null);

  // Inline Batch/Semester/Section/Exam Type filters in one row (replaces
  // the old single "Class & Subject" popup) - each narrows the mapping
  // list; "openFilter" is which one's option panel is expanded below the
  // row right now (inline content, never a modal).
  const [batchFilter, setBatchFilter] = useState<string | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const [examTypeFilter, setExamTypeFilter] = useState<string | null>(null);
  const [openFilter, setOpenFilter] = useState<"batch" | "semester" | "section" | "examType" | null>(null);

  const [detailStatus, setDetailStatus] = useState<LoadStatus>("loading");
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubjectRecordDetail | null>(null);
  const [publishing, setPublishing] = useState(false);

  const loadMappings = useCallback(() => {
    setMappingsStatus("loading");
    setMappingsError(null);
    getMySubjectRecordMappings()
      .then((rows) => {
        setMappings(rows);
        setMappingsStatus("success");
        if (rows.length > 0) {
          setSelectedMappingId((current) => current ?? rows[0].exam_subject_mapping_id);
        }
      })
      .catch((err) => {
        setMappingsError(getApiErrorMessage(err, "Couldn't load your classes & subjects."));
        setMappingsStatus("error");
      });
  }, []);

  const loadDetail = useCallback((examSubjectMappingId: number) => {
    setDetailStatus("loading");
    setDetailError(null);
    getMySubjectRecordDetail(examSubjectMappingId)
      .then((data) => {
        setDetail(data);
        setDetailStatus("success");
      })
      .catch((err) => {
        setDetailError(getApiErrorMessage(err, "Couldn't load this subject's records."));
        setDetailStatus("error");
      });
  }, []);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  useEffect(() => {
    if (selectedMappingId !== null) {
      loadDetail(selectedMappingId);
    }
  }, [selectedMappingId, loadDetail]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      return () => {
        navigation.getParent()?.setOptions({ headerShown: true, header: () => <CollegeHeader /> });
      };
    }, [navigation]),
  );

  const selectedMapping = useMemo(
    () => mappings.find((m) => m.exam_subject_mapping_id === selectedMappingId) ?? null,
    [mappings, selectedMappingId],
  );

  const maxCount = useMemo(() => {
    if (!detail || detail.grade_distribution.length === 0) return 1;
    return Math.max(1, ...detail.grade_distribution.map((item) => item.count));
  }, [detail]);

  // Distinct option lists, each cascading from whichever filters are
  // already picked to its left in the row - all derived client-side from
  // data /me/subject-records already returns, no new query params.
  const parsedMappings = useMemo(
    () => mappings.map((m) => ({ mapping: m, ...parseClassLabel(m.class.label) })),
    [mappings],
  );
  const batchOptions = useMemo(
    () => Array.from(new Set(parsedMappings.map((p) => p.batchName))).sort(),
    [parsedMappings],
  );
  const semesterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          parsedMappings.filter((p) => !batchFilter || p.batchName === batchFilter).map((p) => p.mapping.exam.semester),
        ),
      ).sort((a, b) => a - b),
    [parsedMappings, batchFilter],
  );
  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          parsedMappings
            .filter((p) => !batchFilter || p.batchName === batchFilter)
            .filter((p) => semesterFilter === null || p.mapping.exam.semester === semesterFilter)
            .map((p) => p.section),
        ),
      ).sort(),
    [parsedMappings, batchFilter, semesterFilter],
  );
  const examTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          parsedMappings
            .filter((p) => !batchFilter || p.batchName === batchFilter)
            .filter((p) => semesterFilter === null || p.mapping.exam.semester === semesterFilter)
            .filter((p) => !sectionFilter || p.section === sectionFilter)
            .map((p) => p.mapping.exam.type),
        ),
      ).sort(),
    [parsedMappings, batchFilter, semesterFilter, sectionFilter],
  );

  const filteredMappings = useMemo(
    () =>
      parsedMappings
        .filter((p) => !batchFilter || p.batchName === batchFilter)
        .filter((p) => semesterFilter === null || p.mapping.exam.semester === semesterFilter)
        .filter((p) => !sectionFilter || p.section === sectionFilter)
        .filter((p) => !examTypeFilter || p.mapping.exam.type === examTypeFilter)
        .map((p) => p.mapping),
    [parsedMappings, batchFilter, semesterFilter, sectionFilter, examTypeFilter],
  );

  // Keep the selection in sync with the filters - if the currently-selected
  // mapping is filtered out, fall back to the first still-visible one
  // instead of showing a stale detail view for a filtered-out class/subject.
  useEffect(() => {
    if (filteredMappings.length === 0) return;
    if (filteredMappings.some((m) => m.exam_subject_mapping_id === selectedMappingId)) return;
    setSelectedMappingId(filteredMappings[0].exam_subject_mapping_id);
  }, [filteredMappings, selectedMappingId]);

  function toggleFilter(name: "batch" | "semester" | "section" | "examType") {
    setOpenFilter((current) => (current === name ? null : name));
  }

  function handlePublish() {
    if (!detail || publishing) return;
    setPublishing(true);
    publishSubjectRecordResult(detail.exam_subject_mapping_id)
      .then((updated) => {
        setDetail((current) => (current ? { ...current, ...updated } : current));
        setMappings((current) =>
          current.map((m) =>
            m.exam_subject_mapping_id === updated.exam_subject_mapping_id ? { ...m, ...updated } : m,
          ),
        );
        toast.success("Result published to class");
      })
      .catch((err) => {
        toast.error(getApiErrorMessage(err, "Couldn't publish the result."));
      })
      .finally(() => setPublishing(false));
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
          <Text style={styles.headerTitle}>Subject Records</Text>
          <Text style={styles.headerSubtitle}>Semester performance</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {mappingsStatus === "loading" && <SkeletonListRows count={1} />}

        {mappingsStatus === "error" && (
          <ErrorNotice message={mappingsError ?? "Something went wrong."} onRetry={loadMappings} />
        )}

        {mappingsStatus === "success" && mappings.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="book-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No subjects mapped to you yet</Text>
          </View>
        )}

        {mappingsStatus === "success" && mappings.length > 0 && (
          <>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterField, openFilter === "batch" && styles.filterFieldOpen]}
                onPress={() => toggleFilter("batch")}
                activeOpacity={0.8}
              >
                <Text style={styles.filterFieldLabel}>BATCH</Text>
                <Text style={styles.filterFieldValue} numberOfLines={1}>
                  {batchFilter ?? "All"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterField, openFilter === "semester" && styles.filterFieldOpen]}
                onPress={() => toggleFilter("semester")}
                activeOpacity={0.8}
              >
                <Text style={styles.filterFieldLabel}>SEM</Text>
                <Text style={styles.filterFieldValue} numberOfLines={1}>
                  {semesterFilter ?? "All"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterField, openFilter === "section" && styles.filterFieldOpen]}
                onPress={() => toggleFilter("section")}
                activeOpacity={0.8}
              >
                <Text style={styles.filterFieldLabel}>SECTION</Text>
                <Text style={styles.filterFieldValue} numberOfLines={1}>
                  {sectionFilter ?? "All"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterField, openFilter === "examType" && styles.filterFieldOpen]}
                onPress={() => toggleFilter("examType")}
                activeOpacity={0.8}
              >
                <Text style={styles.filterFieldLabel}>EXAM</Text>
                <Text style={styles.filterFieldValue} numberOfLines={1}>
                  {examTypeFilter ?? "All"}
                </Text>
              </TouchableOpacity>
            </View>

            {openFilter === "batch" && (
              <View style={styles.filterPanel}>
                <TouchableOpacity
                  style={styles.filterOptionRow}
                  onPress={() => {
                    setBatchFilter(null);
                    setOpenFilter(null);
                  }}
                >
                  <Text style={styles.filterOptionText}>All</Text>
                  {!batchFilter && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                </TouchableOpacity>
                {batchOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.filterOptionRow}
                    onPress={() => {
                      setBatchFilter(option);
                      setSemesterFilter(null);
                      setSectionFilter(null);
                      setExamTypeFilter(null);
                      setOpenFilter(null);
                    }}
                  >
                    <Text style={styles.filterOptionText}>{option}</Text>
                    {batchFilter === option && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {openFilter === "semester" && (
              <View style={styles.filterPanel}>
                <TouchableOpacity
                  style={styles.filterOptionRow}
                  onPress={() => {
                    setSemesterFilter(null);
                    setOpenFilter(null);
                  }}
                >
                  <Text style={styles.filterOptionText}>All</Text>
                  {semesterFilter === null && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                </TouchableOpacity>
                {semesterOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.filterOptionRow}
                    onPress={() => {
                      setSemesterFilter(option);
                      setSectionFilter(null);
                      setExamTypeFilter(null);
                      setOpenFilter(null);
                    }}
                  >
                    <Text style={styles.filterOptionText}>Semester {option}</Text>
                    {semesterFilter === option && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {openFilter === "section" && (
              <View style={styles.filterPanel}>
                <TouchableOpacity
                  style={styles.filterOptionRow}
                  onPress={() => {
                    setSectionFilter(null);
                    setOpenFilter(null);
                  }}
                >
                  <Text style={styles.filterOptionText}>All</Text>
                  {!sectionFilter && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                </TouchableOpacity>
                {sectionOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.filterOptionRow}
                    onPress={() => {
                      setSectionFilter(option);
                      setExamTypeFilter(null);
                      setOpenFilter(null);
                    }}
                  >
                    <Text style={styles.filterOptionText}>{option}</Text>
                    {sectionFilter === option && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {openFilter === "examType" && (
              <View style={styles.filterPanel}>
                <TouchableOpacity
                  style={styles.filterOptionRow}
                  onPress={() => {
                    setExamTypeFilter(null);
                    setOpenFilter(null);
                  }}
                >
                  <Text style={styles.filterOptionText}>All</Text>
                  {!examTypeFilter && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                </TouchableOpacity>
                {examTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.filterOptionRow}
                    onPress={() => {
                      setExamTypeFilter(option);
                      setOpenFilter(null);
                    }}
                  >
                    <Text style={styles.filterOptionText}>{option}</Text>
                    {examTypeFilter === option && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {filteredMappings.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="filter-outline" size={26} color="#B0B7C3" />
                <Text style={styles.emptyCardText}>No subjects match these filters</Text>
              </View>
            )}

            {filteredMappings.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.groupSwitch}
                contentContainerStyle={styles.groupSwitchContent}
              >
                {filteredMappings.map((m) => (
                  <TouchableOpacity
                    key={m.exam_subject_mapping_id}
                    style={[
                      styles.groupChip,
                      m.exam_subject_mapping_id === selectedMappingId && styles.groupChipActive,
                    ]}
                    onPress={() => setSelectedMappingId(m.exam_subject_mapping_id)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.groupChipText,
                        m.exam_subject_mapping_id === selectedMappingId && styles.groupChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {m.subject.subject_code} {m.subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selectedMapping && filteredMappings.length > 0 && (
              <Text style={styles.selectedGroupLabel} numberOfLines={1}>
                {selectedMapping.class.label} · {selectedMapping.subject.subject_code} {selectedMapping.subject.name}
              </Text>
            )}
          </>
        )}

        {detailStatus === "loading" && <SkeletonListRows count={3} />}

        {detailStatus === "error" && (
          <ErrorNotice
            message={detailError ?? "Something went wrong."}
            onRetry={() => selectedMappingId !== null && loadDetail(selectedMappingId)}
          />
        )}

        {detailStatus === "success" && detail && detail.entered_count === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="bar-chart-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No marks entered for this subject yet</Text>
          </View>
        )}

        {detailStatus === "success" && detail && detail.entered_count > 0 && (
          <>
            <Text style={styles.sectionTitle}>Grade Distribution</Text>
            <View style={styles.card}>
              {detail.grade_distribution.map((item) => (
                <View key={item.grade} style={styles.gradeRow}>
                  <Text style={styles.gradeLabel}>{item.grade}</Text>
                  <View style={styles.gradeBarTrack}>
                    <View
                      style={[
                        styles.gradeBarFill,
                        { width: `${Math.max((item.count / maxCount) * 100, item.count > 0 ? 6 : 0)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.gradeCount}>{item.count}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Toppers</Text>
            <View style={styles.card}>
              {detail.toppers.length === 0 && (
                <Text style={styles.emptyCardText}>No scored entries yet</Text>
              )}
              {detail.toppers.map((topper, index) => (
                <View
                  key={topper.rank}
                  style={[styles.topperRow, index < detail.toppers.length - 1 && styles.topperRowDivider]}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>{topper.rank}</Text>
                  </View>
                  <View style={styles.topperAvatar}>
                    <Text style={styles.topperAvatarText}>{initialsFromName(topper.name)}</Text>
                  </View>
                  <View style={styles.topperTextWrap}>
                    <Text style={styles.topperName}>{topper.name}</Text>
                    <Text style={styles.topperRoll}>{topper.roll_no}</Text>
                  </View>
                  <Text style={styles.topperScore}>{topper.score}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.publishButton, (publishing || detail.is_published) && styles.publishButtonDisabled]}
              onPress={handlePublish}
              activeOpacity={0.85}
              disabled={publishing || detail.is_published}
            >
              {publishing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.publishButtonText}>
                  {detail.is_published ? "Result Already Published" : "Publish Result to Class"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    gap: 8,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  emptyCardText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    textAlign: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  filterField: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filterFieldOpen: {
    borderColor: "#2F6FE0",
  },
  filterFieldLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  filterFieldValue: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  filterPanel: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F4",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  filterOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  filterOptionText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  groupSwitch: {
    marginBottom: 10,
  },
  groupSwitchContent: {
    gap: 8,
  },
  groupChip: {
    backgroundColor: "#fff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 220,
  },
  groupChipActive: {
    backgroundColor: "#2F6FE0",
    borderColor: "#2F6FE0",
  },
  groupChipText: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  groupChipTextActive: {
    color: "#fff",
  },
  selectedGroupLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "#9AA6B2",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#8A93A3",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
  },
  gradeLabel: {
    width: 28,
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  gradeBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EEF2F9",
    overflow: "hidden",
  },
  gradeBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#2F6FE0",
  },
  gradeCount: {
    width: 24,
    textAlign: "right",
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  topperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  topperRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  topperAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E4EBFB",
    alignItems: "center",
    justifyContent: "center",
  },
  topperAvatarText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  topperTextWrap: {
    flex: 1,
  },
  topperName: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  topperRoll: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 1,
  },
  topperScore: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  publishButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F6FE0",
    borderRadius: 16,
    paddingVertical: 16,
    elevation: 3,
    shadowColor: "#2F6FE0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  publishButtonDisabled: {
    backgroundColor: "#9AB3E8",
    shadowOpacity: 0,
    elevation: 0,
  },
  publishButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#fff",
  },
});
