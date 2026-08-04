export type GradeCount = {
  grade: string;
  count: number;
};

export type Topper = {
  rank: number;
  name: string;
  rollNo: string;
  score: number;
};

// TODO: replace with a real call once a results/subject-records backend endpoint exists.
export const classSubjectInfo = {
  className: "III CSE-A",
  subjectCode: "CS8792",
  subjectName: "Cryptography",
};

export const mockGradeDistribution: GradeCount[] = [
  { grade: "O", count: 9 },
  { grade: "A+", count: 14 },
  { grade: "A", count: 18 },
  { grade: "B+", count: 12 },
  { grade: "B", count: 8 },
  { grade: "RA", count: 3 },
];

export const mockToppers: Topper[] = [
  { rank: 1, name: "Divya Bharathi M", rollNo: "21CSE011", score: 96 },
  { rank: 2, name: "Meenakshi S", rollNo: "21CSE048", score: 93 },
  { rank: 3, name: "Swetha Lakshmi V", rollNo: "21CSE071", score: 91 },
];
