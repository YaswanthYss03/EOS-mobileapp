export type PayslipCardStatus = "pending" | "processed" | "rejected";

export type PayslipRequestCard = {
  id: string;
  name: string;
  subtitle: string;
  month: string;
  purpose: string;
  status: PayslipCardStatus;
};

// There is no non-teaching-staff payslip request module in the backend at
// all (same gap as the Others tab on the sibling Leave/OD/Attendance
// screens), so this tab stays on static mock data for now.
export const mockOtherStaffPayslipRequests: PayslipRequestCard[] = [
  {
    id: "o1",
    name: "Mr. G. Venkatesan",
    subtitle: "Librarian",
    month: "July 2026",
    purpose: "",
    status: "pending",
  },
  {
    id: "o2",
    name: "Mrs. S. Kalaivani",
    subtitle: "Lab Assistant · CSE",
    month: "July 2026",
    purpose: "Bank loan documentation",
    status: "pending",
  },
  {
    id: "o3",
    name: "Mr. R. Muthu",
    subtitle: "Office Assistant",
    month: "June 2026",
    purpose: "",
    status: "processed",
  },
];
