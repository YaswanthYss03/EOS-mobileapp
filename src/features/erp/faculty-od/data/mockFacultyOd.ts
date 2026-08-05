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

// TODO: replace with a real call once an on-duty backend endpoint exists.
export const mockFacultyOdRequests: FacultyOdRequest[] = [
  {
    id: "f1",
    name: "Dr. K. Ramesh",
    subtitle: "Associate Professor · CSE",
    fromDate: "07 Aug 2026",
    toDate: "08 Aug 2026",
    days: 2,
    reason: "Paper presentation at ICACCS, Coimbatore.",
    status: "pending",
  },
  {
    id: "f2",
    name: "Mrs. P. Divya",
    subtitle: "Assistant Professor · CSE",
    fromDate: "05 Aug 2026",
    toDate: "05 Aug 2026",
    days: 1,
    reason: "Criteria-3 document verification at the IQAC office.",
    status: "pending",
  },
  {
    id: "f3",
    name: "Mr. S. Karthik",
    subtitle: "Assistant Professor · CSE",
    fromDate: "11 Aug 2026",
    toDate: "12 Aug 2026",
    days: 2,
    reason: "FDP on Generative AI at IIT Madras.",
    status: "pending",
  },
  {
    id: "f4",
    name: "Dr. N. Saravanan",
    subtitle: "Professor · IT",
    fromDate: "13 Aug 2026",
    toDate: "13 Aug 2026",
    days: 1,
    reason: "External examiner duty at KGiSL.",
    status: "pending",
  },
  {
    id: "f5",
    name: "Mrs. R. Kavitha",
    subtitle: "Assistant Professor · ECE",
    fromDate: "14 Aug 2026",
    toDate: "14 Aug 2026",
    days: 1,
    reason: "NBA accreditation documentation review.",
    status: "pending",
  },
  {
    id: "f6",
    name: "Mr. A. Bala",
    subtitle: "Assistant Professor · MECH",
    fromDate: "15 Aug 2026",
    toDate: "16 Aug 2026",
    days: 2,
    reason: "Workshop on Additive Manufacturing, PSG Tech.",
    status: "pending",
  },
  {
    id: "f7",
    name: "Dr. R. Meenakshi",
    subtitle: "Professor · CSE",
    fromDate: "22 Jul 2026",
    toDate: "22 Jul 2026",
    days: 1,
    reason: "Invited talk at Anna University.",
    status: "approved",
  },
  {
    id: "f8",
    name: "Mr. V. Arunkumar",
    subtitle: "Assistant Professor · CSE",
    fromDate: "18 Jul 2026",
    toDate: "18 Jul 2026",
    days: 1,
    reason: "University exam paper-setting meeting.",
    status: "approved",
  },
  {
    id: "f9",
    name: "Dr. P. Suresh",
    subtitle: "Professor · EEE",
    fromDate: "16 Jul 2026",
    toDate: "16 Jul 2026",
    days: 1,
    reason: "Board of Studies meeting, Anna University.",
    status: "approved",
  },
  {
    id: "f10",
    name: "Mrs. L. Anitha",
    subtitle: "Assistant Professor · IT",
    fromDate: "10 Jul 2026",
    toDate: "10 Jul 2026",
    days: 1,
    reason: "Industry-institute MoU signing event.",
    status: "approved",
  },
  {
    id: "f11",
    name: "Ms. T. Sowmya",
    subtitle: "Assistant Professor · CSE",
    fromDate: "12 Jul 2026",
    toDate: "12 Jul 2026",
    days: 1,
    reason: "Clashed with scheduled lab session.",
    status: "rejected",
  },
];

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
