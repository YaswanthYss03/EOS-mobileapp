export type StudentLeaveStatus = "pending" | "approved" | "rejected";

export type StudentLeaveRequest = {
  id: string;
  name: string;
  rollNo: string;
  section: string;
  category: string;
  date: string;
  session: string;
  docs: number;
  reason: string;
  status: StudentLeaveStatus;
};

// TODO: replace with a real call once an attendance/leave backend endpoint exists.
export const classInfo = {
  section: "III CSE-A",
  studentCount: 64,
};

export const mockStudentLeaveRequests: StudentLeaveRequest[] = [
  {
    id: "1",
    name: "Kavin Raj S",
    rollNo: "21CSE042",
    section: "III CSE-A",
    category: "Medical",
    date: "28 Jul 2026",
    session: "Full day",
    docs: 1,
    reason: "Viral fever — medical certificate attached.",
    status: "pending",
  },
  {
    id: "2",
    name: "Divya Bharathi M",
    rollNo: "21CSE011",
    section: "III CSE-A",
    category: "Casual",
    date: "30 Jul 2026",
    session: "Half day (FN)",
    docs: 0,
    reason: "Sister's wedding at Madurai.",
    status: "pending",
  },
  {
    id: "3",
    name: "Naveen Kumar R",
    rollNo: "21CSE028",
    section: "III CSE-A",
    category: "Casual",
    date: "02 Aug 2026",
    session: "Full day",
    docs: 0,
    reason: "Family function at hometown.",
    status: "pending",
  },
  {
    id: "4",
    name: "Priya Dharshini V",
    rollNo: "21CSE035",
    section: "III CSE-A",
    category: "Medical",
    date: "20 Jul 2026",
    session: "Full day",
    docs: 1,
    reason: "Dengue fever recovery — certificate submitted.",
    status: "approved",
  },
  {
    id: "5",
    name: "Arun Prasath K",
    rollNo: "21CSE009",
    section: "III CSE-A",
    category: "Casual",
    date: "15 Jul 2026",
    session: "Half day (AN)",
    docs: 0,
    reason: "Bank work for education loan.",
    status: "approved",
  },
  {
    id: "6",
    name: "Vignesh S",
    rollNo: "21CSE050",
    section: "III CSE-A",
    category: "Casual",
    date: "10 Jul 2026",
    session: "Full day",
    docs: 0,
    reason: "Personal reasons.",
    status: "rejected",
  },
];
