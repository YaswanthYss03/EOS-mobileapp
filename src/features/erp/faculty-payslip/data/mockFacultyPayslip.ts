// Row shapes for the HR payslip review cards. Both the Faculty and Others tabs
// are wired to real data (GET/PATCH /me/payslip-requests) — payslip_requests
// holds teaching and non-teaching requests in one table, keyed by faculty_id or
// staff_user_id, and the API labels each row with requester.kind.
//
// The mock request list that used to live here has been removed: the Others tab
// was rendering it AND approving/rejecting into local React state only, so a
// staff decision never reached the database.

// Mirrors payslip_requests.status.
export type PayslipCardStatus = "pending" | "processed" | "rejected";

export type PayslipRequestCard = {
  id: string;
  name: string;
  /** Pre-computed display line, e.g. "Associate Professor". */
  subtitle: string;
  /** Display label for the requested month, e.g. "Aug 2026". */
  month: string;
  purpose: string;
  status: PayslipCardStatus;
  /** Which register the requester came from — used only to split the two tabs. */
  kind: "faculty" | "staff" | "unknown";
};
