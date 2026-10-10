import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnchoredDropdown } from "@/components/ui/dropdown";
import { fonts } from "@/theme";
import type { SubjectRecordMapping } from "@/services/api/subject-records.api";

const SEMESTER_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function semesterLabel(semester: number): string {
  return SEMESTER_NUMERALS[semester - 1] ?? String(semester);
}

/**
 * Derives the Year -> Semester -> Subject -> Class cascade entirely from the
 * flat mapping list GET /me/subject-records already returns (each mapping
 * already carries exam.academic_year/semester + subject + class) - no
 * separate endpoint needed. Each level's options are scoped to everything
 * selected above it; changing an upstream level resets every level below it
 * to that new scope's first (or most recent, for year/semester) option, so
 * a value is always selected - never a blank "choose one" state. The final
 * `matchingMappings` can hold more than one row (one per exam type - CIA1,
 * CIA2, SEM, ...) for that exact year+semester+subject+class combination.
 */
export function useAcademicScope(mappings: SubjectRecordMapping[]) {
  const years = useMemo(
    () => Array.from(new Set(mappings.map((m) => m.exam.academic_year))).sort(),
    [mappings],
  );
  const [year, setYear] = useState<string | null>(null);
  useEffect(() => {
    if (years.length === 0) {
      setYear(null);
      return;
    }
    setYear((current) => (current && years.includes(current) ? current : years[years.length - 1]));
  }, [years]);

  const byYear = useMemo(() => mappings.filter((m) => m.exam.academic_year === year), [mappings, year]);

  const semesters = useMemo(
    () => Array.from(new Set(byYear.map((m) => m.exam.semester))).sort((a, b) => a - b),
    [byYear],
  );
  const [semester, setSemester] = useState<number | null>(null);
  useEffect(() => {
    if (semesters.length === 0) {
      setSemester(null);
      return;
    }
    setSemester((current) => (current !== null && semesters.includes(current) ? current : semesters[semesters.length - 1]));
  }, [semesters]);

  const byYearSemester = useMemo(() => byYear.filter((m) => m.exam.semester === semester), [byYear, semester]);

  const subjects = useMemo(() => {
    const map = new Map<number, SubjectRecordMapping["subject"]>();
    for (const m of byYearSemester) map.set(m.subject.id, m.subject);
    return Array.from(map.values()).sort((a, b) => a.subject_code.localeCompare(b.subject_code));
  }, [byYearSemester]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  useEffect(() => {
    if (subjects.length === 0) {
      setSubjectId(null);
      return;
    }
    setSubjectId((current) => (current !== null && subjects.some((s) => s.id === current) ? current : subjects[0].id));
  }, [subjects]);

  const byYearSemesterSubject = useMemo(
    () => byYearSemester.filter((m) => m.subject.id === subjectId),
    [byYearSemester, subjectId],
  );

  const classes = useMemo(() => {
    const map = new Map<number, SubjectRecordMapping["class"]>();
    for (const m of byYearSemesterSubject) map.set(m.class.id, m.class);
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [byYearSemesterSubject]);
  const [classId, setClassId] = useState<number | null>(null);
  useEffect(() => {
    if (classes.length === 0) {
      setClassId(null);
      return;
    }
    setClassId((current) => (current !== null && classes.some((c) => c.id === current) ? current : classes[0].id));
  }, [classes]);

  const matchingMappings = useMemo(
    () => byYearSemesterSubject.filter((m) => m.class.id === classId),
    [byYearSemesterSubject, classId],
  );

  return {
    year,
    years,
    setYear,
    semester,
    semesters,
    setSemester,
    subjectId,
    subjects,
    setSubjectId,
    classId,
    classes,
    setClassId,
    matchingMappings,
  };
}

export type AcademicScope = ReturnType<typeof useAcademicScope>;

function ScopeCard<T extends string | number>({
  label,
  value,
  disabled,
  open,
  onToggle,
  anchorRef,
}: {
  label: string;
  value: string;
  disabled: boolean;
  open: boolean;
  onToggle: () => void;
  anchorRef: React.RefObject<View | null>;
}) {
  return (
    <View ref={anchorRef} collapsable={false} style={styles.cardFlex}>
      <TouchableOpacity
        style={[styles.card, open && styles.cardOpen, disabled && styles.cardDisabled]}
        onPress={onToggle}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text style={styles.cardLabel}>{label}</Text>
        <View style={styles.cardValueRow}>
          <Text style={styles.cardValue} numberOfLines={2}>
            {value}
          </Text>
          {!disabled && <Ionicons name="chevron-down" size={14} color="#6B7280" />}
        </View>
      </TouchableOpacity>
    </View>
  );
}

function OptionDropdown<T>({
  anchorRef,
  visible,
  onClose,
  options,
  selected,
  getKey,
  getLabel,
  onSelect,
}: {
  anchorRef: React.RefObject<View | null>;
  visible: boolean;
  onClose: () => void;
  options: T[];
  selected: T | null;
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
}) {
  return (
    <AnchoredDropdown anchorRef={anchorRef} visible={visible} onClose={onClose} contentStyle={styles.dropdownCard}>
      <ScrollView style={styles.dropdownList}>
        {options.map((item) => {
          const isSelected = selected !== null && getKey(item) === getKey(selected);
          return (
            <TouchableOpacity
              key={getKey(item)}
              style={styles.dropdownRow}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownRowText} numberOfLines={2}>
                {getLabel(item)}
              </Text>
              {isSelected && <Ionicons name="checkmark" size={16} color="#2F6FE0" />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </AnchoredDropdown>
  );
}

/** Renders the Year / Semester / Subject / Class 2x2 card grid and their four dropdowns, driven by useAcademicScope's return value. */
export function AcademicScopeSelector({ scope }: { scope: AcademicScope }) {
  const [openField, setOpenField] = useState<"year" | "semester" | "subject" | "class" | null>(null);
  const yearAnchor = useRef<View | null>(null);
  const semesterAnchor = useRef<View | null>(null);
  const subjectAnchor = useRef<View | null>(null);
  const classAnchor = useRef<View | null>(null);

  const selectedSubject = scope.subjects.find((s) => s.id === scope.subjectId) ?? null;
  const selectedClass = scope.classes.find((c) => c.id === scope.classId) ?? null;

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <ScopeCard
          label="YEAR"
          value={scope.year ?? "—"}
          disabled={scope.years.length === 0}
          open={openField === "year"}
          onToggle={() => setOpenField((f) => (f === "year" ? null : "year"))}
          anchorRef={yearAnchor}
        />
        <ScopeCard
          label="SEMESTER"
          value={scope.semester !== null ? semesterLabel(scope.semester) : "—"}
          disabled={scope.semesters.length === 0}
          open={openField === "semester"}
          onToggle={() => setOpenField((f) => (f === "semester" ? null : "semester"))}
          anchorRef={semesterAnchor}
        />
      </View>
      <View style={styles.row}>
        <ScopeCard
          label="SUBJECT"
          value={selectedSubject ? `${selectedSubject.subject_code} ${selectedSubject.name}` : "—"}
          disabled={scope.subjects.length === 0}
          open={openField === "subject"}
          onToggle={() => setOpenField((f) => (f === "subject" ? null : "subject"))}
          anchorRef={subjectAnchor}
        />
        <ScopeCard
          label="CLASS"
          value={selectedClass?.label ?? "—"}
          disabled={scope.classes.length === 0}
          open={openField === "class"}
          onToggle={() => setOpenField((f) => (f === "class" ? null : "class"))}
          anchorRef={classAnchor}
        />
      </View>

      <OptionDropdown
        anchorRef={yearAnchor}
        visible={openField === "year"}
        onClose={() => setOpenField(null)}
        options={scope.years}
        selected={scope.year}
        getKey={(y) => y}
        getLabel={(y) => y}
        onSelect={scope.setYear}
      />
      <OptionDropdown
        anchorRef={semesterAnchor}
        visible={openField === "semester"}
        onClose={() => setOpenField(null)}
        options={scope.semesters}
        selected={scope.semester}
        getKey={(s) => s}
        getLabel={(s) => `Semester ${semesterLabel(s)}`}
        onSelect={scope.setSemester}
      />
      <OptionDropdown
        anchorRef={subjectAnchor}
        visible={openField === "subject"}
        onClose={() => setOpenField(null)}
        options={scope.subjects}
        selected={selectedSubject}
        getKey={(s) => s.id}
        getLabel={(s) => `${s.subject_code} ${s.name}`}
        onSelect={(s) => scope.setSubjectId(s.id)}
      />
      <OptionDropdown
        anchorRef={classAnchor}
        visible={openField === "class"}
        onClose={() => setOpenField(null)}
        options={scope.classes}
        selected={selectedClass}
        getKey={(c) => c.id}
        getLabel={(c) => c.label}
        onSelect={(c) => scope.setClassId(c.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 8,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  cardFlex: {
    flex: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 58,
    justifyContent: "center",
  },
  cardOpen: {
    borderColor: "#2F6FE0",
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardLabel: {
    fontSize: 9,
    fontFamily: fonts.bold,
    color: "#9AA6B2",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  cardValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cardValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.bold,
    color: "#111827",
  },
  dropdownCard: {
    width: 260,
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
  dropdownList: {
    marginVertical: 4,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F6",
  },
  dropdownRowText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: "#111827",
  },
});
