import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CollegeHeader } from "@/components/layout/CollegeHeader";
import { useSkipSharedHeaderToggle } from "@/hooks/useSkipSharedHeaderToggle";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AcademicScopeSelector, useAcademicScope } from "@/components/ui/AcademicScopeSelector";
import { ExamMarksTable, type ExamMarksColumn, type ExamMarksRow } from "@/components/ui/ExamMarksTable";
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

function examTabLabel(type: string): string {
  return type === "University End Semester Exam" ? "SEM" : type;
}

export function SubjectRecordsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mappingsStatus, setMappingsStatus] = useState<LoadStatus>("loading");
  const [mappingsError, setMappingsError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<SubjectRecordMapping[]>([]);
  const scope = useAcademicScope(mappings);

  const [detailsStatus, setDetailsStatus] = useState<LoadStatus>("loading");
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [details, setDetails] = useState<SubjectRecordDetail[]>([]);
  const [publishing, setPublishing] = useState(false);

  const loadMappings = useCallback(() => {
    setMappingsStatus("loading");
    setMappingsError(null);
    getMySubjectRecordMappings()
      .then((rows) => {
        setMappings(rows);
        setMappingsStatus("success");
      })
      .catch((err) => {
        setMappingsError(getApiErrorMessage(err, "Couldn't load your classes & subjects."));
        setMappingsStatus("error");
      });
  }, []);

  const loadDetails = useCallback((matchingMappings: SubjectRecordMapping[]) => {
    if (matchingMappings.length === 0) {
      setDetails([]);
      setDetailsStatus("success");
      return;
    }
    setDetailsStatus("loading");
    setDetailsError(null);
    // Sequential, not Promise.all - fetching every exam type's detail at once
    // (up to 6+ concurrent requests, each running several queries) can exceed
    // the backend's DB connection pool. One at a time is slightly slower but
    // never spikes concurrent DB load.
    (async () => {
      const rows = [];
      for (const m of matchingMappings) {
        rows.push(await getMySubjectRecordDetail(m.exam_subject_mapping_id));
      }
      return rows;
    })()
      .then((rows) => {
        setDetails(rows);
        setDetailsStatus("success");
      })
      .catch((err) => {
        setDetailsError(getApiErrorMessage(err, "Couldn't load this subject's records."));
        setDetailsStatus("error");
      });
  }, []);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  useEffect(() => {
    loadDetails(scope.matchingMappings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.matchingMappings.map((m) => m.exam_subject_mapping_id).join(",")]);

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

  // The University Semester Exam (an "external" exam - COE's own results,
  // read-only here) is the canonical "semester performance" record when
  // one exists for this scope; otherwise whichever exam type has the most
  // entered marks drives the grade-distribution card, so it's never empty
  // just because CIA1 happened to be entered before the SEM result exists.
  const primaryDetail = useMemo(() => {
    if (details.length === 0) return null;
    const external = details.find((d) => d.exam.category === "external");
    if (external) return external;
    return [...details].sort((a, b) => b.entered_count - a.entered_count)[0];
  }, [details]);

  const maxCount = useMemo(() => {
    if (!primaryDetail || primaryDetail.grade_distribution.length === 0) return 1;
    return Math.max(1, ...primaryDetail.grade_distribution.map((item) => item.count));
  }, [primaryDetail]);

  const tableColumns = useMemo<ExamMarksColumn[]>(
    () =>
      details.map((d) => ({
        key: String(d.exam_subject_mapping_id),
        label: examTabLabel(d.exam.type),
        maxMarks: d.all_students.find((s) => s.max_marks !== null)?.max_marks ?? null,
      })),
    [details],
  );

  const tableRows = useMemo<ExamMarksRow[]>(() => {
    if (details.length === 0) return [];
    // Every detail in scope covers the exact same class, so its roster is
    // identical - the first one's student order anchors every row.
    const base = details[0].all_students;
    return base.map((student) => {
      const cells: ExamMarksRow["cells"] = {};
      for (const d of details) {
        const match = d.all_students.find((s) => s.student_id === student.student_id);
        cells[String(d.exam_subject_mapping_id)] = {
          value: match?.score !== null && match?.score !== undefined ? String(match.score) : "",
          editable: false,
        };
      }
      return { studentId: student.student_id, name: student.name, rollNo: student.roll_no, cells };
    });
  }, [details]);

  function handlePublish() {
    if (!primaryDetail || publishing || primaryDetail.exam.category === "external") return;
    setPublishing(true);
    publishSubjectRecordResult(primaryDetail.exam_subject_mapping_id)
      .then((updated) => {
        setDetails((current) =>
          current.map((d) => (d.exam_subject_mapping_id === updated.exam_subject_mapping_id ? { ...d, ...updated } : d)),
        );
        setMappings((current) =>
          current.map((m) => (m.exam_subject_mapping_id === updated.exam_subject_mapping_id ? { ...m, ...updated } : m)),
        );
        toast.success("Result published to class");
      })
      .catch((err) => toast.error(getApiErrorMessage(err, "Couldn't publish the result.")))
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

        {mappingsStatus === "success" && mappings.length > 0 && (
          <>
            <AcademicScopeSelector scope={scope} />

            {detailsStatus === "loading" && <SkeletonListRows count={3} />}

            {detailsStatus === "error" && (
              <ErrorNotice
                message={detailsError ?? "Something went wrong."}
                onRetry={() => loadDetails(scope.matchingMappings)}
              />
            )}

            {detailsStatus === "success" && details.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="bar-chart-outline" size={26} color="#B0B7C3" />
                <Text style={styles.emptyCardText}>No exams created yet for this class & subject.</Text>
              </View>
            )}

            {detailsStatus === "success" && details.length > 0 && primaryDetail && (
              <>
                <Text style={styles.sectionTitle}>Grade Distribution · {examTabLabel(primaryDetail.exam.type)}</Text>
                <View style={styles.card}>
                  {primaryDetail.entered_count === 0 ? (
                    <Text style={styles.emptyCardText}>No marks entered for this exam yet</Text>
                  ) : (
                    primaryDetail.grade_distribution.map((item) => (
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
                    ))
                  )}
                </View>

                <Text style={styles.sectionTitle}>Students · {tableRows.length}</Text>
                <ExamMarksTable columns={tableColumns} rows={tableRows} />

                {primaryDetail.exam.category === "internal" && (
                  <TouchableOpacity
                    style={[styles.publishButton, (publishing || primaryDetail.is_published) && styles.publishButtonDisabled]}
                    onPress={handlePublish}
                    activeOpacity={0.85}
                    disabled={publishing || primaryDetail.is_published}
                  >
                    {publishing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.publishButtonText}>
                        {primaryDetail.is_published ? "Result Already Published" : "Publish Result to Class"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
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
