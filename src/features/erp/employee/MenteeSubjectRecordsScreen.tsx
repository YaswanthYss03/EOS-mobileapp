import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackHeader } from "@/components/layout/BackHeader";
import { SkeletonListRows } from "@/components/ui/Skeleton";
import { AnchoredDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import { getApiErrorMessage } from "@/services/api/client";
import { getMyMentorClasses, getMentorClassSubjectRecords } from "@/services/api/class-mentors.api";
import type { SubjectRecordDetail } from "@/services/api/subject-records.api";
import { WatermarkBackground } from "@/components/layout/WatermarkBackground";

type LoadStatus = "loading" | "success" | "error";
type OpenFilter = "subject" | "examType" | null;

// Class-mentor-scoped Subject Records - every subject taught to the
// Advisor's own class (not just ones this faculty personally teaches), with
// no batch/semester/section filter since there's only one class here (see
// EOS-backend's class-mentors.service.ts's findAllForClassMentor).
export function MenteeSubjectRecordsScreen() {
  const router = useRouter();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<SubjectRecordDetail[]>([]);

  // Subject + Exam Type dropdowns (per the request - no batch/semester
  // filters, this class only has one class, just narrowing which of its
  // subjects/exams to view). Exam Type options cascade from the selected
  // Subject, same cascading-filter convention as CiaMarksScreen/
  // SubjectRecordsScreen use for their own filter rows.
  const [subjectFilter, setSubjectFilter] = useState<number | null>(null);
  const [examTypeFilter, setExamTypeFilter] = useState<number | null>(null);
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);
  const subjectAnchorRef = useRef<View | null>(null);
  const examTypeAnchorRef = useRef<View | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    getMyMentorClasses()
      .then((classes) => {
        if (classes.length === 0) {
          setMappings([]);
          setStatus("success");
          return;
        }
        return getMentorClassSubjectRecords(classes[0].class_id).then((rows) => {
          setMappings(rows);
          setStatus("success");
        });
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, "Couldn't load subject records for your class."));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxCountBySubject = useMemo(() => {
    const map = new Map<number, number>();
    for (const m of mappings) {
      map.set(m.exam_subject_mapping_id, Math.max(1, ...m.grade_distribution.map((g) => g.count)));
    }
    return map;
  }, [mappings]);

  // Distinct subjects present in this class's mappings - deduped by subject
  // id (a subject can have multiple exams, e.g. CIA1/CIA2, each its own
  // mapping row).
  const subjectOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const m of mappings) {
      seen.set(m.subject.id, `${m.subject.subject_code} ${m.subject.name}`);
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [mappings]);

  // Exam Type options cascade from the selected Subject - only that
  // subject's own exams (CIA1/CIA2/Quiz/... whatever the COE actually
  // created), not every exam type across the whole class.
  const examTypeOptions = useMemo(
    () =>
      mappings
        .filter((m) => subjectFilter === null || m.subject.id === subjectFilter)
        .map((m) => ({ id: m.exam_subject_mapping_id, label: m.exam.type })),
    [mappings, subjectFilter],
  );

  const filteredMappings = useMemo(
    () =>
      mappings.filter(
        (m) =>
          (subjectFilter === null || m.subject.id === subjectFilter) &&
          (examTypeFilter === null || m.exam_subject_mapping_id === examTypeFilter),
      ),
    [mappings, subjectFilter, examTypeFilter],
  );

  function toggleFilter(name: Exclude<OpenFilter, null>) {
    setOpenFilter((current) => (current === name ? null : name));
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <WatermarkBackground />
      <BackHeader title="Subject Records" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {status === "loading" && <SkeletonListRows count={4} />}

        {status === "error" && (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <Text style={styles.errorNoticeText}>{error}</Text>
          </View>
        )}

        {status === "success" && mappings.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="book-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No exam results entered for your class yet</Text>
          </View>
        )}

        {status === "success" && mappings.length > 0 && (
          <View style={styles.filterRow}>
            <View ref={subjectAnchorRef} collapsable={false} style={styles.filterFieldFlex}>
              <TouchableOpacity
                style={[styles.filterField, openFilter === "subject" && styles.filterFieldOpen]}
                onPress={() => toggleFilter("subject")}
                activeOpacity={0.8}
              >
                <Text style={styles.filterFieldLabel}>SUBJECT</Text>
                <Text style={styles.filterFieldValue} numberOfLines={1}>
                  {subjectOptions.find((s) => s.id === subjectFilter)?.label ?? "All"}
                </Text>
              </TouchableOpacity>
            </View>
            <View ref={examTypeAnchorRef} collapsable={false} style={styles.filterFieldFlex}>
              <TouchableOpacity
                style={[styles.filterField, openFilter === "examType" && styles.filterFieldOpen]}
                onPress={() => toggleFilter("examType")}
                activeOpacity={0.8}
              >
                <Text style={styles.filterFieldLabel}>EXAM TYPE</Text>
                <Text style={styles.filterFieldValue} numberOfLines={1}>
                  {examTypeOptions.find((e) => e.id === examTypeFilter)?.label ?? "All"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <AnchoredDropdown
          anchorRef={subjectAnchorRef}
          visible={openFilter === "subject"}
          onClose={() => setOpenFilter(null)}
          contentStyle={styles.dropdownCard}
        >
          <TouchableOpacity
            style={styles.filterOptionRow}
            onPress={() => {
              setSubjectFilter(null);
              setExamTypeFilter(null);
              setOpenFilter(null);
            }}
          >
            <Text style={styles.filterOptionText}>All</Text>
            {subjectFilter === null && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {subjectOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.filterOptionRow}
              onPress={() => {
                setSubjectFilter(option.id);
                setExamTypeFilter(null);
                setOpenFilter(null);
              }}
            >
              <Text style={styles.filterOptionText}>{option.label}</Text>
              {subjectFilter === option.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </AnchoredDropdown>

        <AnchoredDropdown
          anchorRef={examTypeAnchorRef}
          visible={openFilter === "examType"}
          onClose={() => setOpenFilter(null)}
          contentStyle={styles.dropdownCard}
        >
          <TouchableOpacity
            style={styles.filterOptionRow}
            onPress={() => {
              setExamTypeFilter(null);
              setOpenFilter(null);
            }}
          >
            <Text style={styles.filterOptionText}>All</Text>
            {examTypeFilter === null && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
          </TouchableOpacity>
          {examTypeOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.filterOptionRow}
              onPress={() => {
                setExamTypeFilter(option.id);
                setOpenFilter(null);
              }}
            >
              <Text style={styles.filterOptionText}>{option.label}</Text>
              {examTypeFilter === option.id && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          ))}
        </AnchoredDropdown>

        {status === "success" && mappings.length > 0 && filteredMappings.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="filter-outline" size={26} color="#B0B7C3" />
            <Text style={styles.emptyCardText}>No subjects match these filters</Text>
          </View>
        )}

        {status === "success" &&
          filteredMappings.map((m) => (
            <View key={m.exam_subject_mapping_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.subjectName} numberOfLines={1}>
                  {m.subject.subject_code} {m.subject.name}
                </Text>
                <Text style={styles.examType}>{m.exam.type}</Text>
              </View>
              <Text style={styles.metaLine}>
                {m.entered_count} of {m.total_students} entered
                {m.is_published ? " · Published" : ""}
              </Text>

              {m.grade_distribution.map((g) => (
                <View key={g.grade} style={styles.gradeRow}>
                  <Text style={styles.gradeLabel}>{g.grade}</Text>
                  <View style={styles.gradeBarTrack}>
                    <View
                      style={[
                        styles.gradeBarFill,
                        {
                          width: `${Math.max((g.count / (maxCountBySubject.get(m.exam_subject_mapping_id) ?? 1)) * 100, g.count > 0 ? 6 : 0)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.gradeCount}>{g.count}</Text>
                </View>
              ))}

              {m.toppers.length > 0 && (
                <View style={styles.toppersWrap}>
                  {m.toppers.map((topper) => (
                    <View key={topper.rank} style={styles.topperRow}>
                      <Text style={styles.topperRank}>{topper.rank}</Text>
                      <Text style={styles.topperName} numberOfLines={1}>
                        {topper.name}
                      </Text>
                      <Text style={styles.topperScore}>{topper.score}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  errorNotice: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
  },
  errorNoticeText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
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
    marginBottom: 14,
  },
  filterFieldFlex: {
    flex: 1,
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  subjectName: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  examType: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
    backgroundColor: "#EAF0FD",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaLine: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "#9AA6B2",
    marginTop: 4,
    marginBottom: 10,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  gradeLabel: {
    width: 24,
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#4B5563",
  },
  gradeBarTrack: {
    flex: 1,
    height: 7,
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
    width: 22,
    textAlign: "right",
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  toppersWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F6",
    paddingTop: 10,
    gap: 6,
  },
  topperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topperRank: {
    width: 16,
    fontSize: 11,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
  topperName: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
  topperScore: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: "#2F6FE0",
  },
});
