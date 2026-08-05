export type InternalResult = {
  id: string;
  number: number;
  title: string;
  marksObtained: number;
  marksTotal: number;
};

export type SubjectMark = {
  code: string;
  name: string;
  max: number;
  scored: number;
};

// TODO: replace with a real call once an academics/results backend endpoint exists.
export const semesters = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4",
  "Semester 5", "Semester 6", "Semester 7", "Semester 8",
];

export const defaultSemester = "Semester 5";

// Only Semester 5 has published internal marks so far - other semesters show
// an empty/awaited state. Semester exam results aren't out for any semester yet.
export const mockInternalsBySemester: Record<string, InternalResult[]> = {
  "Semester 5": [
    { id: "1", number: 1, title: "Internal 1", marksObtained: 459, marksTotal: 600 },
    { id: "2", number: 2, title: "Internal 2", marksObtained: 441, marksTotal: 600 },
  ],
};

// Keyed by internal id - subject-wise breakdown shown when an internal card
// is expanded.
export const mockSubjectMarksByInternal: Record<string, SubjectMark[]> = {
  "1": [
    { code: "CS5101", name: "Machine Learning", max: 100, scored: 64 },
    { code: "CS5102", name: "Computer Networks", max: 100, scored: 75 },
    { code: "CS5103", name: "Cryptography", max: 100, scored: 86 },
    { code: "CS5104", name: "Cloud Computing", max: 100, scored: 67 },
    { code: "CS5105", name: "Compiler Design", max: 100, scored: 89 },
    { code: "CS5151", name: "Networks Lab", max: 100, scored: 78 },
  ],
  "2": [
    { code: "CS5101", name: "Machine Learning", max: 100, scored: 58 },
    { code: "CS5102", name: "Computer Networks", max: 100, scored: 71 },
    { code: "CS5103", name: "Cryptography", max: 100, scored: 80 },
    { code: "CS5104", name: "Cloud Computing", max: 100, scored: 62 },
    { code: "CS5105", name: "Compiler Design", max: 100, scored: 85 },
    { code: "CS5151", name: "Networks Lab", max: 100, scored: 85 },
  ],
};
