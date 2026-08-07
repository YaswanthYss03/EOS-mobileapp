export type FacultyOdStatus = "pending" | "approved" | "rejected";

export type FacultyOdRequest = {
  id: string;
  name: string;
  subtitle: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: FacultyOdStatus;
};

export const mockOtherStaffOdRequests: FacultyOdRequest[] = [
  {
    id: "o1",
    name: "Mr. G. Venkatesan",
    subtitle: "Librarian",
    fromDate: "06 Aug 2026",
    toDate: "06 Aug 2026",
    days: 1,
    reason: "State librarians' association meet, Chennai.",
    status: "pending",
  },
  {
    id: "o2",
    name: "Mrs. S. Kalaivani",
    subtitle: "Lab Assistant · CSE",
    fromDate: "09 Aug 2026",
    toDate: "09 Aug 2026",
    days: 1,
    reason: "Equipment procurement verification at vendor site.",
    status: "pending",
  },
  {
    id: "o3",
    name: "Mr. R. Muthu",
    subtitle: "Office Assistant",
    fromDate: "04 Aug 2026",
    toDate: "04 Aug 2026",
    days: 1,
    reason: "University document submission at Anna University.",
    status: "approved",
  },
];
