// Row shapes for the HR on-duty review cards. Both the Faculty and Others tabs
// are wired to real data (GET/PATCH /me/faculty-od) — faculty_od holds teaching
// and non-teaching requests in one table, keyed by faculty_id or staff_user_id,
// and the API labels each row with requester.kind.
//
// The mock request list that used to live here has been removed: the Others tab
// was rendering it AND approving into local React state only, so a staff
// approval never reached the database.

export type FacultyOdStatus = "pending" | "approved" | "rejected";

export type FacultyOdRequest = {
  id: string;
  name: string;
  /** Pre-computed display line, e.g. "Associate Professor". */
  subtitle: string;
  fromDate: string;
  toDate: string;
  days: number;
  /** Place + purpose, combined for display. */
  reason: string;
  status: FacultyOdStatus;
  /**
   * Which register the requester came from — used only to split the two
   * tabs. "principal" is included for type parity with the shared
   * MyFacultyOd.requester.kind union (see faculty-od.api.ts) - HR Payroll's
   * own findAll() query excludes Principal-authored rows entirely (see
   * FacultyOdService.findAll's HR_PAYROLL branch), so this value never
   * actually appears here in practice; if it ever did, it'd just land in
   * the "Others" tab like "staff"/"unknown" already do.
   */
  kind: "faculty" | "staff" | "unknown" | "principal";
};
