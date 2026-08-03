export type Period = {
  time: string;
  subject: string;
  faculty: string;
  room: string;
};

export type DaySchedule = {
  day: string;
  periods: Period[];
};

export const weekOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const mockTimetable: DaySchedule[] = [
  {
    day: "Monday",
    periods: [
      { time: "09:00 - 09:50", subject: "Data Structures", faculty: "Dr. Meera", room: "CS-101" },
      { time: "09:50 - 10:40", subject: "Operating Systems", faculty: "Prof. Anand", room: "CS-102" },
      { time: "11:00 - 11:50", subject: "Database Systems", faculty: "Dr. Kavitha", room: "CS-104" },
      { time: "11:50 - 12:40", subject: "Mathematics III", faculty: "Prof. Suresh", room: "CS-101" },
      { time: "01:30 - 03:10", subject: "DS Lab", faculty: "Dr. Meera", room: "Lab-2" },
    ],
  },
  {
    day: "Tuesday",
    periods: [
      { time: "09:00 - 09:50", subject: "Operating Systems", faculty: "Prof. Anand", room: "CS-102" },
      { time: "09:50 - 10:40", subject: "Computer Networks", faculty: "Dr. Ilango", room: "CS-103" },
      { time: "11:00 - 11:50", subject: "Data Structures", faculty: "Dr. Meera", room: "CS-101" },
      { time: "11:50 - 12:40", subject: "Mathematics III", faculty: "Prof. Suresh", room: "CS-101" },
      { time: "01:30 - 03:10", subject: "OS Lab", faculty: "Prof. Anand", room: "Lab-1" },
    ],
  },
  {
    day: "Wednesday",
    periods: [
      { time: "09:00 - 09:50", subject: "Database Systems", faculty: "Dr. Kavitha", room: "CS-104" },
      { time: "09:50 - 10:40", subject: "Computer Networks", faculty: "Dr. Ilango", room: "CS-103" },
      { time: "11:00 - 11:50", subject: "Mathematics III", faculty: "Prof. Suresh", room: "CS-101" },
      { time: "11:50 - 12:40", subject: "Operating Systems", faculty: "Prof. Anand", room: "CS-102" },
      { time: "01:30 - 02:20", subject: "Soft Skills", faculty: "Ms. Priya", room: "CS-105" },
    ],
  },
  {
    day: "Thursday",
    periods: [
      { time: "09:00 - 09:50", subject: "Data Structures", faculty: "Dr. Meera", room: "CS-101" },
      { time: "09:50 - 10:40", subject: "Database Systems", faculty: "Dr. Kavitha", room: "CS-104" },
      { time: "11:00 - 11:50", subject: "Computer Networks", faculty: "Dr. Ilango", room: "CS-103" },
      { time: "11:50 - 12:40", subject: "Mathematics III", faculty: "Prof. Suresh", room: "CS-101" },
      { time: "01:30 - 03:10", subject: "DBMS Lab", faculty: "Dr. Kavitha", room: "Lab-3" },
    ],
  },
  {
    day: "Friday",
    periods: [
      { time: "09:00 - 09:50", subject: "Computer Networks", faculty: "Dr. Ilango", room: "CS-103" },
      { time: "09:50 - 10:40", subject: "Data Structures", faculty: "Dr. Meera", room: "CS-101" },
      { time: "11:00 - 11:50", subject: "Operating Systems", faculty: "Prof. Anand", room: "CS-102" },
      { time: "11:50 - 12:40", subject: "Database Systems", faculty: "Dr. Kavitha", room: "CS-104" },
      { time: "01:30 - 02:20", subject: "Placement Prep", faculty: "Career Cell", room: "Seminar Hall" },
    ],
  },
  {
    day: "Saturday",
    periods: [
      { time: "09:00 - 09:50", subject: "Mathematics III", faculty: "Prof. Suresh", room: "CS-101" },
      { time: "09:50 - 10:40", subject: "Soft Skills", faculty: "Ms. Priya", room: "CS-105" },
    ],
  },
];
