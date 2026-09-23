import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { useSkipSharedHeaderToggle } from "@/hooks/useSkipSharedHeaderToggle";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";
import {
  getMySubjectRecordMappings,
  getMySubjectRecordDetail,
  publishSubjectRecordResult,
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

// Display-only shortening, same convention as CiaMarksScreen's identical
// helper - exam.type is the real exam_types.name, used as-is everywhere
// else.
function examTabLabel(type: string): string {
  return type === "University End Semester Exam" ? "SEM" : type;
}

// Groups the flat mapping list by class+subject, so Exam Type can be its
// own dropdown scoped to whichever class is selected - same grouping shape
// as CiaMarksScreen's groupMappings.
type ClassSubjectGroup = {
  key: string;
  classLabel: string;
  subjectCode: string;
  subjectName: string;
  mappings: SubjectRecordMapping[];
};

function groupMappings(mappings: SubjectRecordMapping[]): ClassSubjectGroup[] {
  const groups = new Map<string, ClassSubjectGroup>();
  for (const m of mappings) {
    const key = `${m.class.id}-${m.subject.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.mappings.push(m);
    } else {
      groups.set(key, {
        key,
        classLabel: m.class.label,
        subjectCode: m.subject.subject_code,
        subjectName: m.subject.name,
        mappings: [m],
      });
    }
  }
  return Array.from(groups.values());
}

export function SubjectRecordsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mappingsStatus, setMappingsStatus] = useState<LoadStatus>("loading");
  const [mappingsError, setMappingsError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<SubjectRecordMapping[]>([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedMappingId, setSelectedMappingId] = useState<number | null>(null);

  // Class (each option already shows class+subject together) and Exam Type
  // are both picked via a dropdown, same AnchoredDropdown pattern as
  // CiaMarksScreen.
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);
  const classAnchorRef = useRef<View | null>(null);
  const [examTypeDropdownOpen, setExamTypeDropdownOpen] = useState(false);
  const examTypeAnchorRef = useRef<View | null>(null);

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
        const grouped = groupMappings(rows);
        if (grouped.length > 0) {
          setSelectedGroupKey((current) => current ?? grouped[0].key);
          setSelectedMappingId((current) => current ?? grouped[0].mappings[0].exam_subject_mapping_id);
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

  const groups = useMemo(() => groupMappings(mappings), [mappings]);
  const selectedGroup = useMemo(
    () => groups.find((g) => g.key === selectedGroupKey) ?? null,
    [groups, selectedGroupKey],
  );
  const selectedMapping = useMemo(
    () => mappings.find((m) => m.exam_subject_mapping_id === selectedMappingId) ?? null,
    [mappings, selectedMappingId],
  );

  const maxCount = useMemo(() => {
    if (!detail || detail.grade_distribution.length === 0) return 1;
    return Math.max(1, ...detail.grade_distribution.map((item) => item.count));
  }, [detail]);

  function handlePickGroup(group: ClassSubjectGroup) {
    setSelectedGroupKey(group.key);
    setSelectedMappingId(group.mappings[0].exam_subject_mapping_id);
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

        {mappingsStatus === "success" && mappings.length > 0 && selectedGroup && (
          <>
            <View style={styles.filterRow}>
              <View ref={classAnchorRef} collapsable={false} style={styles.filterFieldFlex}>
                <TouchableOpacity
                  style={[styles.filterField, classDropdownOpen && styles.filterFieldOpen]}
                  onPress={() => setClassDropdownOpen((open) => !open)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.filterFieldLabel}>CLASS</Text>
                  <Text style={styles.filterFieldValue} numberOfLines={1}>
                    {selectedGroup.classLabel} · {selectedGroup.subjectCode} {selectedGroup.subjectName}
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedGroup.mappings.length > 0 && (
                <View ref={examTypeAnchorRef} collapsable={false} style={styles.filterFieldFlex}>
                  <TouchableOpacity
                    style={[styles.filterField, examTypeDropdownOpen && styles.filterFieldOpen]}
                    onPress={() => setExamTypeDropdownOpen((open) => !open)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.filterFieldLabel}>EXAM TYPE</Text>
                    <Text style={styles.filterFieldValue} numberOfLines={1}>
                      {examTabLabel(selectedMapping?.exam.type ?? "Select")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <AnchoredDropdown
              anchorRef={classAnchorRef}
              visible={classDropdownOpen}
              onClose={() => setClassDropdownOpen(false)}
              contentStyle={styles.dropdownCard}
            >
              {groups.map((group) => (
                <TouchableOpacity
                  key={group.key}
                  style={styles.filterOptionRow}
                  onPress={() => {
                    handlePickGroup(group);
                    setClassDropdownOpen(false);
                  }}
                >
                  <Text style={styles.filterOptionText} numberOfLines={1}>
                    {group.classLabel} · {group.subjectCode} {group.subjectName}
                  </Text>
                  {group.key === selectedGroupKey && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
                </TouchableOpacity>
              ))}
            </AnchoredDropdown>

            <AnchoredDropdown
              anchorRef={examTypeAnchorRef}
              visible={examTypeDropdownOpen}
              onClose={() => setExamTypeDropdownOpen(false)}
              contentStyle={styles.dropdownCard}
            >
              {selectedGroup.mappings.map((m) => (
                <TouchableOpacity
                  key={m.exam_subject_mapping_id}
                  style={styles.filterOptionRow}
                  onPress={() => {
                    setSelectedMappingId(m.exam_subject_mapping_id);
                    setExamTypeDropdownOpen(false);
                  }}
                >
                  <Text style={styles.filterOptionText}>{examTabLabel(m.exam.type)}</Text>
                  {m.exam_subject_mapping_id === selectedMappingId && (
                    <Ionicons name="checkmark" size={16} color="#2F6FE0" />
                  )}
                </TouchableOpacity>
              ))}
            </AnchoredDropdown>
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
  filterField: {
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterFieldFlex: {
    flex: 1,
  },
  dropdownCard: {
    width: 240,
    maxHeight: 320,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    elevation: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  filterOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  filterOptionText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
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
