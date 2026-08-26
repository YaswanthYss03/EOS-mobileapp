// Row shapes for the HR leave-review cards. Both the Faculty and Others tabs
// are wired to real data (GET/PATCH /me/faculty-leaves) — faculty_leaves holds
// teaching and non-teaching requests in one table, keyed by faculty_id or
// staff_user_id, and the API labels each row with requester.kind.
//
// The mock request list that used to live here has been removed: the Others tab
// was rendering it AND approving into local React state only, so a staff
// approval never reached the database.

export type FacultyLeaveStatus = "pending" | "approved" | "rejected";

export type FacultyLeaveRequest = {
  id: string;
  name: string;
  /** Pre-computed display line, e.g. "Associate Professor". */
  subtitle: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: FacultyLeaveStatus;
  /** Which register the requester came from — used only to split the two tabs. */
  kind: "faculty" | "staff" | "unknown";
};
