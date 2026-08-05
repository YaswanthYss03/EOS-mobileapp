export type StudentOdStatus = "pending" | "approved" | "rejected";

export type StudentOdRequest = {
  id: string;
  name: string;
  rollNo: string;
  section: string;
  category: string;
  dates: string;
  session: string;
  docs: number;
  reason: string;
  status: StudentOdStatus;
};

// TODO: replace with a real call once an on-duty backend endpoint exists.
export const classInfo = {
  section: "III CSE-A",
  studentCount: 64,
};

export const mockStudentOdRequests: StudentOdRequest[] = [
  {
    id: "1",
    name: "Karthik S",
    rollNo: "21CSE015",
    section: "III CSE-A",
    category: "Sports Meet",
    dates: "05 Aug 2026",
    session: "All day",
    docs: 0,
    reason: "Inter-college athletics meet participation.",
    status: "pending",
  },
  {
    id: "2",
    name: "Meena Priya R",
    rollNo: "21CSE019",
    section: "III CSE-A",
    category: "Placement",
    dates: "08 Aug 2026",
    session: "All day",
    docs: 1,
    reason: "Infosys off-campus drive, Chennai.",
    status: "pending",
  },
  {
    id: "3",
    name: "Suresh Babu T",
    rollNo: "21CSE033",
    section: "III CSE-A",
    category: "Symposium",
    dates: "12 Aug 2026",
    session: "Half day (AN)",
    docs: 0,
    reason: "Presenting paper at inter-college tech symposium.",
    status: "pending",
  },
  {
    id: "4",
    name: "Divya Bharathi M",
    rollNo: "21CSE011",
    section: "III CSE-A",
    category: "Placement",
    dates: "19 Jul 2026",
    session: "All day",
    docs: 1,
    reason: "TCS Digital hiring drive, Coimbatore.",
    status: "approved",
  },
  {
    id: "5",
    name: "Gokul Krishna B",
    rollNo: "21CSE022",
    section: "III CSE-A",
    category: "NSS Camp",
    dates: "11 Jul – 13 Jul 2026",
    session: "All day",
    docs: 1,
    reason: "NSS special camp at Kinathukadavu village.",
    status: "approved",
  },
  {
    id: "6",
    name: "Ramya Devi K",
    rollNo: "21CSE044",
    section: "III CSE-A",
    category: "Personal Event",
    dates: "01 Jul 2026",
    session: "All day",
    docs: 0,
    reason: "Attending cousin's engagement ceremony.",
    status: "rejected",
  },
];
