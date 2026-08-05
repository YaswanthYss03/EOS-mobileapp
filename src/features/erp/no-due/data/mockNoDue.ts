export type FeeItem = {
  label: string;
  status: "cleared" | "pending";
  pendingAmount?: number;
};

export type NoDueStatus = "pending" | "cleared" | "onhold";

export type NoDueStudent = {
  id: string;
  name: string;
  rollNo: string;
  section: string;
  appliedFor: string;
  status: NoDueStatus;
  fees: FeeItem[];
};

// TODO: replace with a real call once a no-due/clearance backend endpoint exists.
export const classInfo = {
  section: "III CSE-A",
  studentCount: 64,
};

export const mockNoDueStudents: NoDueStudent[] = [
  {
    id: "1",
    name: "Kavin Raj S",
    rollNo: "21CSE042",
    section: "III CSE-A",
    appliedFor: "Semester VI hall ticket",
    status: "pending",
    fees: [
      { label: "Tuition fee", status: "cleared" },
      { label: "Hostel fee", status: "pending", pendingAmount: 18500 },
      { label: "Transport fee", status: "cleared" },
      { label: "Library", status: "pending", pendingAmount: 40 },
      { label: "Lab & exam fee", status: "cleared" },
    ],
  },
  {
    id: "2",
    name: "Sanjay Kumar R",
    rollNo: "21CSE062",
    section: "III CSE-A",
    appliedFor: "Transfer certificate",
    status: "pending",
    fees: [
      { label: "Tuition fee", status: "cleared" },
      { label: "Hostel fee", status: "pending", pendingAmount: 6500 },
      { label: "Transport fee", status: "pending", pendingAmount: 320 },
      { label: "Library", status: "cleared" },
      { label: "Lab & exam fee", status: "cleared" },
    ],
  },
  {
    id: "3",
    name: "Divya Bharathi M",
    rollNo: "21CSE011",
    section: "III CSE-A",
    appliedFor: "Bonafide certificate",
    status: "pending",
    fees: [
      { label: "Tuition fee", status: "pending", pendingAmount: 12000 },
      { label: "Hostel fee", status: "cleared" },
      { label: "Transport fee", status: "cleared" },
      { label: "Library", status: "pending", pendingAmount: 60 },
      { label: "Lab & exam fee", status: "cleared" },
    ],
  },
  {
    id: "4",
    name: "Gokul Krishna B",
    rollNo: "21CSE022",
    section: "III CSE-A",
    appliedFor: "Semester V hall ticket",
    status: "cleared",
    fees: [
      { label: "Tuition fee", status: "cleared" },
      { label: "Hostel fee", status: "cleared" },
      { label: "Transport fee", status: "cleared" },
      { label: "Library", status: "cleared" },
      { label: "Lab & exam fee", status: "cleared" },
    ],
  },
  {
    id: "5",
    name: "Priya Dharshini V",
    rollNo: "21CSE035",
    section: "III CSE-A",
    appliedFor: "Semester VI hall ticket",
    status: "onhold",
    fees: [
      { label: "Tuition fee", status: "cleared" },
      { label: "Hostel fee", status: "pending", pendingAmount: 9200 },
      { label: "Transport fee", status: "cleared" },
      { label: "Library", status: "pending", pendingAmount: 150 },
      { label: "Lab & exam fee", status: "cleared" },
    ],
  },
];
