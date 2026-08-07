import { ApprovalRequestsScreen } from "../components/ApprovalRequestsScreen";

// Reachable from the HoD dashboard's Student "Leave" item (opens on the
// Student tab) and Employee "Leave" item (opens on the Faculty tab) - see
// hod/data/mockDashboard.ts.
export function LeaveScreen() {
  return (
    <ApprovalRequestsScreen
      kind="leave"
      title="Leave"
      studentHeaderSubtitle="Student leave · advisor approved"
      facultyHeaderSubtitle="Faculty leave requests"
    />
  );
}
