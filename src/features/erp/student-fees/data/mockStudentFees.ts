export type FeeStatus = "paid" | "partial" | "pending";

export type FeeItem = {
  id: string;
  label: string;
  status: FeeStatus;
  total: number;
  paid: number;
  due: number;
};

export type PaymentRecord = {
  id: string;
  title: string;
  date: string;
  method: string;
  receiptNo: string;
  amount: number;
};

// TODO: replace with a real call once a fees backend endpoint exists.
export const semesters = [
  "Semester 1", "Semester 2", "Semester 3", "Semester 4",
  "Semester 5", "Semester 6", "Semester 7", "Semester 8",
];

export const defaultSemester = "Semester 5";

// Fee items, payment history, and the summary totals below are all derived
// from the same underlying numbers - Tuition's paid amount (40,000) and
// Hostel's paid amount (52,000) are the same transactions that show up in
// mockPaymentsBySemester, and the summary is their sum, not a separate figure.
export const mockFeesBySemester: Record<string, FeeItem[]> = {
  "Semester 5": [
    { id: "tuition", label: "Tuition fee", status: "partial", total: 62000, paid: 40000, due: 22000 },
    { id: "hostel", label: "Hostel fee", status: "paid", total: 52000, paid: 52000, due: 0 },
    { id: "transport", label: "Transport fee", status: "partial", total: 26300, paid: 18000, due: 8300 },
    { id: "exam", label: "Exam fee", status: "pending", total: 1800, paid: 0, due: 1800 },
  ],
};

export const mockPaymentsBySemester: Record<string, PaymentRecord[]> = {
  "Semester 5": [
    {
      id: "1",
      title: "Semester 5 tuition fee",
      date: "12 Jun 2026",
      method: "Net banking",
      receiptNo: "SEC/26/10428",
      amount: 40000,
    },
    {
      id: "2",
      title: "Hostel fee · Block C",
      date: "05 Jun 2026",
      method: "UPI",
      receiptNo: "SEC/26/10193",
      amount: 52000,
    },
    {
      id: "3",
      title: "Transport fee",
      date: "01 Jun 2026",
      method: "UPI",
      receiptNo: "SEC/26/10150",
      amount: 18000,
    },
  ],
};
