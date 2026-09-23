import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SkeletonDetailBlock, SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown, useDropdown } from "@/components/ui/dropdown";
import { TabTransitionView, useTabScrollMemory } from "@/components/ui/tabs";
import { fonts } from "@/theme";
import { toast } from "@/utils/toast";
import { getApiErrorMessage } from "@/services/api/client";
import { getChildPerformance, downloadChildSemesterMarksheet } from "@/services/api/parents.api";
import type { ExamResultGroup, ExamResultsResponse } from "@/services/api/academics.api";
import { downloadPdf } from "@/utils/pdfDownload";
import { semesters, defaultSemester, semesterNumber } from "../student-performance/data/mockStudentPerformance";
import { useParentChildren } from "./useParentChildren";
import { ChildSelector } from "./ChildSelector";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

type Tab = "internals" | "semester-exam";

function semesterLabelFor(semesterValue: number | null): string {
  return semesterValue !== null ? `Semester ${semesterValue}` : defaultSemester;
}

// Same real GET /me/exam-results data/UI as the student's own
// StudentPerformanceScreen, just scoped to the parent's selected child via
// GET /me/children/:studentId/performance - see parents.api.ts. Defaults the
// semester picker to the child's own current semester when known.
export function ParentPerformanceScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { status: childrenStatus, error: childrenError, children, selectedChild, setSelectedChildId, reload: reloadChildren } =
    useParentChildren();

  const [semester, setSemester] = useState(defaultSemester);
  const [semesterInitialized, setSemesterInitialized] = useState(false);
  const semesterPicker = useDropdown();
  const [tab, setTab] = useState<Tab>("internals");
  const scrollMemory = useTabScrollMemory();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [results, setResults] = useState<ExamResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [downloadingMarksheet, setDownloadingMarksheet] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ headerShown: false });
      // No cleanup - see ParentDashboard.tsx's identical comment.
      return undefined;
    }, [navigation]),
  );

  useEffect(() => {
    if (selectedChild && !semesterInitialized) {
      setSemester(semesterLabelFor(selectedChild.semester));
      setSemesterInitialized(true);
    }
  }, [selectedChild, semesterInitialized]);

  useEffect(() => {
    if (!selectedChild) return;
    let cancelled = false;
    setLoading(true);
    setErrored(false);

    getChildPerformance(selectedChild.id, semesterNumber(semester))
      .then((data) => {
        if (cancelled) return;
        setResults(data);
      })
      .catch((error) => {
        if (cancelled) return;
        setErrored(true);
        toast.error(getApiErrorMessage(error, "Couldn't load this child's results. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedChild, semester, reloadToken]);

  const internals = results?.internals ?? [];
  const semesterExam = results?.semester_exam ?? null;

  async function handleDownloadMarksheet() {
    if (downloadingMarksheet || !selectedChild) return;
    setDownloadingMarksheet(true);
    try {
      const semNumber = semesterNumber(semester);
      const file = await downloadChildSemesterMarksheet(selectedChild.id, semNumber);
      const result = await downloadPdf(file.uri, `Marksheet-Sem${semNumber}`, `Semester ${semNumber} Marksheet`);
      if (result === "downloaded") toast.success("Marksheet downloaded");
      else if (result === "unavailable") toast.success(`Marksheet saved to ${file.uri}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Couldn't download the marksheet."));
    } finally {
      setDownloadingMarksheet(false);
    }
  }

  // Not tab-specific - kept as a closure helper (like StudentHostelScreen's
  // renderRoomCard) so each per-tab ScrollView below can call it once,
  // reproducing the original "scrolls away with the rest of the content"
  // behavior instead of pinning it above the tabs.
  function renderHeaderCard() {
    return (
      <>
        <ChildSelector children={children} selected={selectedChild!} onSelect={(c) => setSelectedChildId(c.id)} />

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Semester</Text>
          <View ref={semesterPicker.anchorRef} collapsable={false}>
            <TouchableOpacity style={styles.selectRow} onPress={semesterPicker.open} activeOpacity={0.8}>
              <Text style={styles.selectValue}>{semester}</Text>
              <Ionicons name="chevron-down" size={18} color="#B0B7C3" />
            </TouchableOpacity>
          </View>

          {/* This tab row's buttons always carry an opaque white background
              (not just the active one, see tabButton below) - a sliding
              indicator drawn behind them would be fully hidden, so it keeps
              its original instant active/inactive swap rather than
              force-fitting AnimatedTabBar's behind-the-buttons indicator
              onto a style it isn't a safe match for (same call as
              ApprovalRequestsScreen's inner subtab). */}
          <View style={styles.tabSwitch}>
            <TouchableOpacity
              style={[styles.tabButton, tab === "internals" && styles.tabButtonActive]}
              onPress={() => setTab("internals")}
            >
              <Text style={[styles.tabButtonText, tab === "internals" && styles.tabButtonTextActive]}>
                Internals
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, tab === "semester-exam" && styles.tabButtonActive]}
              onPress={() => setTab("semester-exam")}
            >
              <Text style={[styles.tabButtonText, tab === "semester-exam" && styles.tabButtonTextActive]}>
                Semester exam
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  function renderLoadingOrError() {
    if (loading) return <SkeletonListRows count={3} />;
    if (errored) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
          <Text style={styles.emptyStateText}>Couldn't load results</Text>
          <TouchableOpacity onPress={() => setReloadToken((n) => n + 1)} activeOpacity={0.8}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
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
        <Text style={styles.headerTitle}>Performance</Text>
      </LinearGradient>

      {(childrenStatus === "loading" ||
        childrenStatus === "error" ||
        (childrenStatus === "success" && children.length === 0)) && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {childrenStatus === "loading" && <SkeletonDetailBlock />}

          {childrenStatus === "error" && (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={32} color="#B0B7C3" />
              <Text style={styles.emptyStateText}>{childrenError ?? "Couldn't load your children"}</Text>
              <TouchableOpacity onPress={reloadChildren} activeOpacity={0.8}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {childrenStatus === "success" && children.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={32} color="#B0B7C3" />
              <Text style={styles.emptyStateText}>No linked children found</Text>
            </View>
          )}
        </ScrollView>
      )}

      {childrenStatus === "success" && selectedChild && (
          <TabTransitionView activeKey={tab} order={["internals", "semester-exam"]} style={styles.tabContent}>
            {tab === "internals" ? (
              <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                {...scrollMemory.bind("internals")}
              >
                {renderHeaderCard()}
                {renderLoadingOrError() ??
                  (internals.length > 0 ? (
                    internals.map((internal) => (
                      <ResultCard
                        key={internal.exam_id}
                        result={internal}
                        expanded={expandedId === internal.exam_id}
                        onToggle={() =>
                          setExpandedId((prev) => (prev === internal.exam_id ? null : internal.exam_id))
                        }
                      />
                    ))
                  ) : (
                    <EmptyState
                      text="Results awaited"
                      subtext="Internal marks for this semester haven't been published yet."
                    />
                  ))}
              </ScrollView>
            ) : (
              <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                {...scrollMemory.bind("semester-exam")}
              >
                {renderHeaderCard()}
                {renderLoadingOrError() ??
                  (semesterExam ? (
                    <ResultCard
                      result={semesterExam}
                      expanded={expandedId === semesterExam.exam_id}
                      onToggle={() =>
                        setExpandedId((prev) => (prev === semesterExam.exam_id ? null : semesterExam.exam_id))
                      }
                      showGrade
                      onDownload={handleDownloadMarksheet}
                      downloading={downloadingMarksheet}
                    />
                  ) : (
                    <EmptyState text="Results awaited" subtext="Semester exam results haven't been published yet." />
                  ))}
              </ScrollView>
            )}
        </TabTransitionView>
      )}

      <AnchoredDropdown
        anchorRef={semesterPicker.anchorRef}
        visible={semesterPicker.visible}
        onClose={semesterPicker.close}
        contentStyle={[styles.modalCard, styles.anchoredCard]}
      >
        <Text style={styles.modalTitle}>Semester</Text>
        <ScrollView style={styles.modalList}>
          {semesters.map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.modalOptionRow}
              onPress={() => {
                setSemester(option);
                setExpandedId(null);
                semesterPicker.close();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalOptionName}>{option}</Text>
              {semester === option && <Ionicons name="checkmark" size={18} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AnchoredDropdown>
    </SafeAreaView>
  );
}

function gradeForPercent(percent: number): { grade: string; result: "Pass" | "Fail" } {
  if (percent >= 90) return { grade: "O", result: "Pass" };
  if (percent >= 85) return { grade: "A+", result: "Pass" };
  if (percent >= 80) return { grade: "A", result: "Pass" };
  if (percent >= 75) return { grade: "B+", result: "Pass" };
  if (percent >= 70) return { grade: "B", result: "Pass" };
  if (percent >= 60) return { grade: "C", result: "Pass" };
  return { grade: "U", result: "Fail" };
}

function ResultCard({
  result,
  expanded,
  onToggle,
  showGrade,
  onDownload,
  downloading,
}: {
  result: ExamResultGroup;
  expanded: boolean;
  onToggle: () => void;
  showGrade?: boolean;
  // Only ever passed for the semester-exam card - internals have no
  // marksheet to download (a real paper marksheet only ever covers the
  // end-semester exam, see MeExamResultsService.buildMarksheetData).
  onDownload?: () => void;
  downloading?: boolean;
}) {
  return (
    <View style={styles.internalCard}>
      <TouchableOpacity style={styles.internalHeaderRow} onPress={onToggle} activeOpacity={0.8}>
        <View style={styles.internalBadge}>
          <Text style={styles.internalBadgeText}>{result.number}</Text>
        </View>
        <View style={styles.internalTextWrap}>
          <Text style={styles.internalTitle}>{result.title}</Text>
        </View>
        {onDownload && (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={onDownload}
            disabled={downloading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#2F6FE0" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#2F6FE0" />
            )}
          </TouchableOpacity>
        )}
        <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={20} color="#B0B7C3" />
      </TouchableOpacity>

      {expanded && result.subjects.length > 0 && (
        <View style={styles.subjectTable}>
          <View style={styles.subjectTableHeaderRow}>
            <Text style={[styles.subjectTableHeaderText, styles.subjectCourseCol]}>COURSE</Text>
            {showGrade ? (
              <>
                <Text style={[styles.subjectTableHeaderText, styles.subjectMaxCol]}>GRADE</Text>
                <Text style={[styles.subjectTableHeaderText, styles.subjectScoredCol]}>RESULT</Text>
              </>
            ) : (
              <>
                <Text style={[styles.subjectTableHeaderText, styles.subjectMaxCol]}>MAX</Text>
                <Text style={[styles.subjectTableHeaderText, styles.subjectScoredCol]}>SCORED</Text>
              </>
            )}
          </View>
          {result.subjects.map((subject, index) => {
            const subjectPercent = subject.max > 0 ? (subject.scored / subject.max) * 100 : 0;
            const { grade, result: passFail } = gradeForPercent(subjectPercent);

            return (
              <View
                key={subject.subject_id}
                style={[styles.subjectRow, index === result.subjects.length - 1 && styles.subjectRowLast]}
              >
                <View style={styles.subjectCourseCol}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.subjectCode}>{subject.code}</Text>
                </View>
                {showGrade ? (
                  <>
                    <Text style={[styles.subjectMaxText, styles.subjectMaxCol]}>{grade}</Text>
                    <Text
                      style={[
                        styles.subjectResultText,
                        styles.subjectScoredCol,
                        passFail === "Fail" ? styles.subjectResultTextFail : styles.subjectResultTextPass,
                      ]}
                    >
                      {passFail}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.subjectMaxText, styles.subjectMaxCol]}>{subject.max}</Text>
                    <Text style={[styles.subjectScoredText, styles.subjectScoredCol]}>{subject.scored}</Text>
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function EmptyState({ text, subtext }: { text: string; subtext: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="time-outline" size={32} color="#B0B7C3" />
      <Text style={styles.emptyStateText}>{text}</Text>
      <Text style={styles.emptyStateSubtext}>{subtext}</Text>
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
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  tabContent: {
    flex: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    marginBottom: 8,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  selectValue: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: "#111827",
  },
  tabSwitch: {
    flexDirection: "row",
    gap: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingVertical: 12,
  },
  tabButtonActive: {
    borderColor: "#2F6FE0",
    backgroundColor: "#EAF0FD",
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  tabButtonTextActive: {
    color: "#2F6FE0",
    fontFamily: fonts.bold,
  },
  internalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  internalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  internalBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF0FD",
    alignItems: "center",
    justifyContent: "center",
  },
  internalBadgeText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  internalTextWrap: {
    flex: 1,
  },
  internalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  downloadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  subjectTable: {
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
  },
  subjectTableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  subjectTableHeaderText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  subjectRowLast: {
    borderBottomWidth: 0,
  },
  subjectCourseCol: {
    flex: 1,
  },
  subjectMaxCol: {
    width: 60,
    textAlign: "center",
  },
  subjectScoredCol: {
    width: 70,
    textAlign: "right",
  },
  subjectName: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  subjectCode: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 2,
  },
  subjectMaxText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
  },
  subjectScoredText: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  subjectResultText: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  subjectResultTextPass: {
    color: "#16A34A",
  },
  subjectResultTextFail: {
    color: "#DC2626",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  emptyStateSubtext: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    marginTop: 4,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    maxHeight: "70%",
  },
  // Anchored dropdown has no full-screen flex parent to resolve modalCard's
  // percentage maxHeight against, so pin a concrete size here instead.
  anchoredCard: {
    width: 260,
    maxHeight: 320,
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
    marginBottom: 4,
  },
  modalOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  modalOptionName: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
