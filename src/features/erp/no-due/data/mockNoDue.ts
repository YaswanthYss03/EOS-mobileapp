export type FeeItem = {
  label: string;
  status: "cleared" | "pending";
  pendingAmount?: number;
};

export type SignOffItem = {
  label: string;
  status: "cleared" | "pending";
};

export type NoDueStudent = {
  id: string;
  name: string;
  rollNo: string;
  className: string;
  appliedFor: string;
  fees: FeeItem[];
  signOffs: SignOffItem[];
};

// TODO: replace with a real call once a no-due/clearance backend endpoint exists.
export const classInfo = {
  className: "III CSE-A",
  studentCount: 64,
  advisorName: "Dr. K. Ramesh",
};

export const mockNoDueStudents: NoDueStudent[] = [
  {
    id: "1",
    name: "Kavin Raj S",
    rollNo: "21CSE042",
    className: "III CSE-A",
    appliedFor: "Semester VI hall ticket",
    fees: [
      { label: "Tuition fee", status: "cleared" },
      { label: "Hostel fee", status: "pending", pendingAmount: 18500 },
      { label: "Transport fee", status: "pending", pendingAmount: 40 },
      { label: "Library", status: "cleared" },
      { label: "Lab & exam fee", status: "cleared" },
    ],
    signOffs: [
      { label: "Class Advisor", status: "cleared" },
      { label: "Accounts - fees", status: "pending" },
      { label: "Library", status: "pending" },
      { label: "Lab & exam cell", status: "cleared" },
      { label: "Hostel warden", status: "cleared" },
    ],
  },
  {
    id: "2",
    name: "Sanjay Kumar R",
    rollNo: "21CSE062",
    className: "III CSE-A",
    appliedFor: "Transfer certificate",
    fees: [
      { label: "Tuition fee", status: "cleared" },
      { label: "Hostel fee", status: "pending", pendingAmount: 6500 },
      { label: "Transport fee", status: "pending", pendingAmount: 320 },
      { label: "Library", status: "cleared" },
      { label: "Lab & exam cell", status: "cleared" },
    ],
    signOffs: [
      { label: "Class Advisor", status: "cleared" },
      { label: "Accounts - fees", status: "pending" },
      { label: "Library", status: "pending" },
      { label: "Lab & exam cell", status: "cleared" },
      { label: "Hostel warden", status: "cleared" },
    ],
  },
  {
    id: "3",
    name: "Gokul Krishna B",
    rollNo: "21CSE022",
    className: "III CSE-A",
    appliedFor: "Semester V hall ticket",
    fees: [
      { label: "Tuition fee", status: "cleared" },
      { label: "Hostel fee", status: "cleared" },
      { label: "Transport fee", status: "cleared" },
      { label: "Library", status: "cleared" },
      { label: "Lab & exam fee", status: "cleared" },
    ],
    signOffs: [
      { label: "Class Advisor", status: "cleared" },
      { label: "Accounts - fees", status: "cleared" },
      { label: "Library", status: "cleared" },
      { label: "Lab & exam cell", status: "cleared" },
      { label: "Hostel warden", status: "cleared" },
    ],
  },
  {
    id: "4",
    name: "Divya Bharathi M",
    rollNo: "21CSE011",
    className: "III CSE-A",
    appliedFor: "Bonafide certificate",
    fees: [
      { label: "Tuition fee", status: "pending", pendingAmount: 12000 },
      { label: "Hostel fee", status: "cleared" },
      { label: "Transport fee", status: "cleared" },
      { label: "Library", status: "pending", pendingAmount: 60 },
      { label: "Lab & exam fee", status: "cleared" },
    ],
    signOffs: [
      { label: "Class Advisor", status: "cleared" },
      { label: "Accounts - fees", status: "pending" },
      { label: "Library", status: "pending" },
      { label: "Lab & exam cell", status: "cleared" },
      { label: "Hostel warden", status: "cleared" },
    ],
  },
];
