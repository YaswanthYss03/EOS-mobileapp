export type ExamSession = "Forenoon" | "Afternoon";

export type ExamScheduleItem = {
  id: string;
  date: string;
  course: string;
  code: string;
  session: ExamSession;
};

export type ExamType = "internal1" | "internal2" | "semester";

// TODO: replace with a real call once an academics/exams backend endpoint exists.
export const semesters = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4",
  "Semester 5", "Semester 6", "Semester 7", "Semester 8",
];

export const defaultSemester = "Semester 5";

// Only Semester 5's Internal 1 schedule has been published so far - Internal
// 2 and the Semester exam show an empty/awaited state until then.
export const mockExamSchedule: Record<string, Record<ExamType, ExamScheduleItem[]>> = {
  "Semester 5": {
    internal1: [
      { id: "1", date: "22 Jun", course: "Machine Learning", code: "CS5101", session: "Forenoon" },
      { id: "2", date: "23 Jun", course: "Computer Networks", code: "CS5102", session: "Afternoon" },
      { id: "3", date: "24 Jun", course: "Cryptography", code: "CS5103", session: "Forenoon" },
      { id: "4", date: "25 Jun", course: "Cloud Computing", code: "CS5104", session: "Afternoon" },
      { id: "5", date: "26 Jun", course: "Networks Lab", code: "CS5151", session: "Forenoon" },
      { id: "6", date: "27 Jun", course: "Technical Writing", code: "HS5101", session: "Afternoon" },
    ],
    internal2: [],
    semester: [],
  },
};
