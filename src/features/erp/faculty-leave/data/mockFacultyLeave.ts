export type FacultyLeaveStatus = "pending" | "approved" | "rejected";

export type FacultyLeaveRequest = {
  id: string;
  name: string;
  subtitle: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: FacultyLeaveStatus;
};

// TODO: replace with a real call once a leave backend endpoint exists.
export const mockFacultyLeaveRequests: FacultyLeaveRequest[] = [
  {
    id: "f1",
    name: "Dr. K. Ramesh",
    subtitle: "Associate Professor · CSE",
    fromDate: "06 Aug 2026",
    toDate: "06 Aug 2026",
    days: 1,
    reason: "Personal work at the registrar office.",
    status: "pending",
  },
  {
    id: "f2",
    name: "Mrs. P. Divya",
    subtitle: "Assistant Professor · CSE",
    fromDate: "04 Aug 2026",
    toDate: "08 Aug 2026",
    days: 5,
    reason: "Viral fever, medical certificate attached.",
    status: "pending",
  },
  {
    id: "f3",
    name: "Mr. S. Karthik",
    subtitle: "Assistant Professor · CSE",
    fromDate: "10 Aug 2026",
    toDate: "10 Aug 2026",
    days: 1,
    reason: "Family function at hometown.",
    status: "pending",
  },
  {
    id: "f4",
    name: "Dr. N. Saravanan",
    subtitle: "Professor · IT",
    fromDate: "12 Aug 2026",
    toDate: "13 Aug 2026",
    days: 2,
    reason: "Attending daughter's convocation.",
    status: "pending",
  },
  {
    id: "f5",
    name: "Mrs. R. Kavitha",
    subtitle: "Assistant Professor · ECE",
    fromDate: "14 Aug 2026",
    toDate: "14 Aug 2026",
    days: 1,
    reason: "Personal reasons.",
    status: "pending",
  },
  {
    id: "f6",
    name: "Mr. A. Bala",
    subtitle: "Assistant Professor · MECH",
    fromDate: "17 Aug 2026",
    toDate: "18 Aug 2026",
    days: 2,
    reason: "Native place travel for a family event.",
    status: "pending",
  },
  {
    id: "f7",
    name: "Dr. R. Meenakshi",
    subtitle: "Professor · CSE",
    fromDate: "20 Jul 2026",
    toDate: "20 Jul 2026",
    days: 1,
    reason: "Medical check-up.",
    status: "approved",
  },
  {
    id: "f8",
    name: "Mr. V. Arunkumar",
    subtitle: "Assistant Professor · CSE",
    fromDate: "15 Jul 2026",
    toDate: "15 Jul 2026",
    days: 1,
    reason: "Bank work for home loan.",
    status: "approved",
  },
  {
    id: "f9",
    name: "Dr. P. Suresh",
    subtitle: "Professor · EEE",
    fromDate: "08 Jul 2026",
    toDate: "09 Jul 2026",
    days: 2,
    reason: "Sister's wedding.",
    status: "approved",
  },
  {
    id: "f10",
    name: "Ms. T. Sowmya",
    subtitle: "Assistant Professor · CSE",
    fromDate: "05 Jul 2026",
    toDate: "05 Jul 2026",
    days: 1,
    reason: "Insufficient leave balance.",
    status: "rejected",
  },
  {
    id: "f11",
    name: "Mrs. L. Anitha",
    subtitle: "Assistant Professor · IT",
    fromDate: "02 Jul 2026",
    toDate: "02 Jul 2026",
    days: 1,
    reason: "Clashed with scheduled exam duty.",
    status: "rejected",
  },
];

export const mockOtherStaffLeaveRequests: FacultyLeaveRequest[] = [
  {
    id: "o1",
    name: "Mr. G. Venkatesan",
    subtitle: "Librarian",
    fromDate: "07 Aug 2026",
    toDate: "07 Aug 2026",
    days: 1,
    reason: "Personal work.",
    status: "pending",
  },
  {
    id: "o2",
    name: "Mrs. S. Kalaivani",
    subtitle: "Lab Assistant · CSE",
    fromDate: "11 Aug 2026",
    toDate: "12 Aug 2026",
    days: 2,
    reason: "Child's school admission formalities.",
    status: "pending",
  },
  {
    id: "o3",
    name: "Mr. R. Muthu",
    subtitle: "Office Assistant",
    fromDate: "03 Aug 2026",
    toDate: "03 Aug 2026",
    days: 1,
    reason: "Medical appointment.",
    status: "approved",
  },
];
