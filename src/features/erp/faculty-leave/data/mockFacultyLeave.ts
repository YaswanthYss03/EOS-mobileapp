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

// The Faculty tab is wired to real data (GET/PATCH /me/faculty-leaves) - see
// FacultyLeaveScreen.tsx. Only the Others (non-teaching staff) tab still
// uses this mock data, since no backend module exists for staff leave yet.
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
