// Internals/subject marks now come from a real backend call - see
// @/services/api/academics.api.ts (GET /me/exam-results). Only the semester
// picker's option list stays here; there's no endpoint to derive it from
// (a student's own semester range isn't exposed anywhere else yet).
export const semesters = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4",
  "Semester 5", "Semester 6", "Semester 7", "Semester 8",
];

export const defaultSemester = "Semester 5";

export function semesterNumber(semester: string): number {
  return Number(semester.replace("Semester ", ""));
}
