export type PeriodType = "class" | "lab" | "free";
export type Session = "forenoon" | "afternoon";

export type Period = {
  time: string;
  periodLabel: string;
  subject: string;
  section?: string;
  room?: string;
  type: PeriodType;
  session: Session;
  isNow?: boolean;
};

export type DaySchedule = {
  dayShort: string;
  dayFull: string;
  date: string;
  periods: Period[];
};

// TODO: replace mockTimetable with a real call once the timetable backend endpoint exists.
// Month/year are pinned to Aug 2026 for this mock week - a real feed would drive the
// day strip off the actual current date instead.
export const monthLabel = "Aug 2026";

export const mockTimetable: DaySchedule[] = [
  {
    dayShort: "MON",
    dayFull: "Monday",
    date: "03",
    periods: [
      { time: "08:45", periodLabel: "P1", subject: "Compiler Design", section: "III CSE-A", room: "A-402", type: "class", session: "forenoon" },
      { time: "09:40", periodLabel: "P2", subject: "Cloud Computing", section: "III CSE-A", type: "class", session: "forenoon", isNow: true },
      { time: "10:50", periodLabel: "P3", subject: "Free period", section: "No class scheduled", type: "free", session: "forenoon" },
      { time: "11:45", periodLabel: "P4", subject: "Machine Learning", section: "III CSE-B", room: "A-405", type: "class", session: "forenoon" },
      { time: "13:30", periodLabel: "P5", subject: "Database Systems", section: "III CSE-A", room: "A-403", type: "class", session: "afternoon" },
      { time: "14:25", periodLabel: "P6", subject: "Mathematics III", section: "III CSE-B", room: "A-201", type: "class", session: "afternoon" },
      { time: "15:20", periodLabel: "P7", subject: "Soft Skills", section: "III CSE-A", room: "A-401", type: "class", session: "afternoon" },
      { time: "16:15", periodLabel: "P8", subject: "Compiler Design Lab", section: "III CSE-A", room: "Lab-1", type: "lab", session: "afternoon" },
      { time: "17:10", periodLabel: "P9", subject: "Cloud Computing Lab", section: "III CSE-B", room: "Lab-2", type: "lab", session: "afternoon" },
    ],
  },
  {
    dayShort: "TUE",
    dayFull: "Tuesday",
    date: "04",
    periods: [
      { time: "08:45", periodLabel: "P1", subject: "Operating Systems", section: "III CSE-A", room: "A-102", type: "class", session: "forenoon" },
      { time: "09:40", periodLabel: "P2", subject: "Computer Networks", section: "III CSE-A", room: "A-103", type: "class", session: "forenoon" },
      { time: "10:50", periodLabel: "P3", subject: "Data Structures", section: "III CSE-B", room: "A-101", type: "class", session: "forenoon" },
      { time: "11:45", periodLabel: "P4", subject: "Free period", section: "No class scheduled", type: "free", session: "forenoon" },
      { time: "13:30", periodLabel: "P5", subject: "Operating Systems Lab", section: "III CSE-A", room: "Lab-1", type: "lab", session: "afternoon" },
      { time: "14:25", periodLabel: "P6", subject: "Operating Systems Lab", section: "III CSE-A", room: "Lab-1", type: "lab", session: "afternoon" },
    ],
  },
  {
    dayShort: "WED",
    dayFull: "Wednesday",
    date: "05",
    periods: [
      { time: "08:45", periodLabel: "P1", subject: "Database Systems", section: "III CSE-A", room: "A-403", type: "class", session: "forenoon" },
      { time: "09:40", periodLabel: "P2", subject: "Computer Networks", section: "III CSE-A", room: "A-103", type: "class", session: "forenoon" },
      { time: "10:50", periodLabel: "P3", subject: "Mathematics III", section: "III CSE-A", room: "A-201", type: "class", session: "forenoon" },
      { time: "11:45", periodLabel: "P4", subject: "Operating Systems", section: "III CSE-A", room: "A-102", type: "class", session: "forenoon" },
      { time: "13:30", periodLabel: "P5", subject: "Soft Skills", section: "III CSE-A", room: "A-401", type: "class", session: "afternoon" },
    ],
  },
  {
    dayShort: "THU",
    dayFull: "Thursday",
    date: "06",
    periods: [
      { time: "08:45", periodLabel: "P1", subject: "Machine Learning", section: "III CSE-B", room: "A-405", type: "class", session: "forenoon" },
      { time: "09:40", periodLabel: "P2", subject: "Database Systems", section: "III CSE-A", room: "A-403", type: "class", session: "forenoon" },
      { time: "10:50", periodLabel: "P3", subject: "Computer Networks", section: "III CSE-A", room: "A-103", type: "class", session: "forenoon" },
      { time: "11:45", periodLabel: "P4", subject: "Mathematics III", section: "III CSE-B", room: "A-201", type: "class", session: "forenoon" },
      { time: "13:30", periodLabel: "P5", subject: "Machine Learning Lab", section: "III CSE-C", room: "Lab-3", type: "lab", session: "afternoon" },
      { time: "14:25", periodLabel: "P6", subject: "Machine Learning Lab", section: "III CSE-C", room: "Lab-3", type: "lab", session: "afternoon" },
    ],
  },
  {
    dayShort: "FRI",
    dayFull: "Friday",
    date: "07",
    periods: [
      { time: "08:45", periodLabel: "P1", subject: "Computer Networks", section: "III CSE-A", room: "A-103", type: "class", session: "forenoon" },
      { time: "09:40", periodLabel: "P2", subject: "Compiler Design", section: "III CSE-A", room: "A-402", type: "class", session: "forenoon" },
      { time: "10:50", periodLabel: "P3", subject: "Operating Systems", section: "III CSE-A", room: "A-102", type: "class", session: "forenoon" },
      { time: "11:45", periodLabel: "P4", subject: "Free period", section: "No class scheduled", type: "free", session: "forenoon" },
      { time: "13:30", periodLabel: "P5", subject: "Placement Prep", section: "Career Cell", room: "Seminar Hall", type: "class", session: "afternoon" },
    ],
  },
  {
    dayShort: "SAT",
    dayFull: "Saturday",
    date: "08",
    periods: [
      { time: "08:45", periodLabel: "P1", subject: "Mathematics III", section: "III CSE-A", room: "A-201", type: "class", session: "forenoon" },
      { time: "09:40", periodLabel: "P2", subject: "Soft Skills", section: "III CSE-A", room: "A-401", type: "class", session: "forenoon" },
    ],
  },
];
