export type HrPayrollTicketStatus = "under-review" | "resolved" | "rejected";

export type HrPayrollTicket = {
  id: string;
  ticketNo: string;
  category: string;
  subject: string;
  description: string;
  status: HrPayrollTicketStatus;
  submittedOn: string;
  hrAssigned: string;
};

// TODO: replace with a real call once an HR/payroll ticketing backend endpoint exists.
export const requestCategories = [
  "PF & ESI",
  "Payslip Correction",
  "Income Tax / TDS",
  "Salary Advance",
  "Reimbursement",
  "Bank Details Update",
  "Other",
];

export const mockHrPayrollTickets: HrPayrollTicket[] = [
  {
    id: "1",
    ticketNo: "HRM-2026-118",
    category: "PF & ESI",
    subject: "Correction in July PF contribution",
    description: "The PF contribution shown for July doesn't match my payslip - please verify and correct.",
    status: "under-review",
    submittedOn: "24 Jul 2026",
    hrAssigned: "Meenakshi R",
  },
  {
    id: "2",
    ticketNo: "HRM-2026-104",
    category: "Payslip Correction",
    subject: "Missing HRA in June payslip",
    description: "June payslip doesn't reflect the HRA component that was there in May.",
    status: "resolved",
    submittedOn: "10 Jul 2026",
    hrAssigned: "Meenakshi R",
  },
  {
    id: "3",
    ticketNo: "HRM-2026-098",
    category: "Reimbursement",
    subject: "Conference travel reimbursement pending",
    description: "Submitted bills for the March conference travel, still not reimbursed.",
    status: "rejected",
    submittedOn: "02 Jul 2026",
    hrAssigned: "Ravi Shankar",
  },
];
