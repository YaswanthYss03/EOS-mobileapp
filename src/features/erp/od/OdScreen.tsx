import { ApprovalRequestsScreen } from "../components/ApprovalRequestsScreen";

// Reachable from the HoD dashboard's Student "OD" item (opens on the
// Student tab) and Employee "OD" item (opens on the Faculty tab) - see
// hod/data/mockDashboard.ts.
export function OdScreen() {
  return (
    <ApprovalRequestsScreen
      kind="od"
      title="On Duty"
      studentHeaderSubtitle="Student OD · advisor approved"
      facultyHeaderSubtitle="Faculty OD requests"
    />
  );
}
