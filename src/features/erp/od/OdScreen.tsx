import { ApprovalRequestsScreen } from "../components/ApprovalRequestsScreen";
import { mockStudentOdRequests, mockFacultyOdRequests } from "./data/mockOd";

// Reachable from the HoD dashboard's Student "OD" item (opens on the
// Student tab) and Employee "OD" item (opens on the Faculty tab) - see
// hod/data/mockDashboard.ts.
export function OdScreen() {
  return (
    <ApprovalRequestsScreen
      title="On Duty"
      studentHeaderSubtitle="Student OD · advisor approved"
      facultyHeaderSubtitle="Faculty OD requests"
      initialStudentRequests={mockStudentOdRequests}
      initialFacultyRequests={mockFacultyOdRequests}
    />
  );
}
