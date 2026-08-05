export type PayslipStatus = "pending" | "approved" | "rejected";

export type PayslipRequest = {
  id: string;
  monthLabel: string;
  requestedOn: string;
  status: PayslipStatus;
  purpose?: string;
  remarks?: string;
};

// TODO: replace with a real call once a payroll backend endpoint exists.
export const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const years = ["2024", "2025", "2026"];

export const mockPayslipHistory: PayslipRequest[] = [
  { id: "1", monthLabel: "June 2026", requestedOn: "02 Jul 2026", status: "approved" },
  { id: "2", monthLabel: "May 2026", requestedOn: "03 Jun 2026", status: "approved" },
  { id: "3", monthLabel: "April 2026", requestedOn: "04 May 2026", status: "rejected" },
  { id: "4", monthLabel: "March 2026", requestedOn: "02 Apr 2026", status: "pending" },
];
