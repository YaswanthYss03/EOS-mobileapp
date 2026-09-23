// Standard Anna-University percentage-to-grade scale, shared by the
// Performance screen (per-subject GRADE column) and the Class tab's
// "Performance" stat card (overall CGPA) - one source of truth so both
// always agree on what a given percentage is worth.
export function gradeForPercent(percent: number): { grade: string; result: "Pass" | "Fail" } {
  if (percent >= 90) return { grade: "O", result: "Pass" };
  if (percent >= 85) return { grade: "A+", result: "Pass" };
  if (percent >= 80) return { grade: "A", result: "Pass" };
  if (percent >= 75) return { grade: "B+", result: "Pass" };
  if (percent >= 70) return { grade: "B", result: "Pass" };
  if (percent >= 60) return { grade: "C", result: "Pass" };
  return { grade: "U", result: "Fail" };
}

// Standard Anna-University 10-point scale for the letter grades above.
const GRADE_POINTS: Record<string, number> = { O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, U: 0 };

// Real credit-weighted GPA (Σcredit·gradePoint / Σcredit) for one exam
// group's subjects - only ever meaningful for the official end-semester
// exam (internals are formative assessment, not part of a university CGPA),
// so callers should only ever pass a semester_exam group's subjects here,
// never an internal's. null when there's nothing to weight by (no subjects,
// or none of them have a credits value).
export function computeCreditWeightedGpa(
  subjects: { max: number; scored: number; credits: number | null }[],
): number | null {
  let creditSum = 0;
  let weightedSum = 0;
  for (const subject of subjects) {
    if (!subject.credits) continue;
    const percent = subject.max > 0 ? (subject.scored / subject.max) * 100 : 0;
    const points = GRADE_POINTS[gradeForPercent(percent).grade] ?? 0;
    creditSum += subject.credits;
    weightedSum += subject.credits * points;
  }
  return creditSum > 0 ? weightedSum / creditSum : null;
}
