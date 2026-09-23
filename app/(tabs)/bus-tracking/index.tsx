import { BusTrackingScreen } from "@/features/bus-tracking/BusTrackingScreen";
import { StudentHostelScreen } from "@/features/erp/student-hostel/StudentHostelScreen";
import { FacultyHostelScreen } from "@/features/erp/faculty-hostel/FacultyHostelScreen";
import { ParentHostelScreen } from "@/features/erp/parent/ParentHostelScreen";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";

// This tab is relabeled "Hostel" for a hosteller student, faculty, OR parent
// of a hosteller child (see app/(tabs)/_layout.tsx's isHosteller) - for that
// case it also swaps its actual CONTENT away from bus tracking, which has no
// relevance to a hosteller. A student gets their own Hostel self-service
// screen (Outing/Complaints/Mess Feedback); a hosteller faculty gets a
// Complaints page (FacultyHostelScreen); a parent gets a read-only view of
// their (selected) child's room/night attendance/gate in-out (see
// ParentHostelScreen - reads studentType off the FIRST/selected child, see
// AuthContext.refreshTravelInfo's parent branch). Every dayscholar and every
// other role keeps the unchanged bus-tracking screen.
export default function BusTracking() {
  const role = useRole();
  const { studentType } = useAuth();
  const isHosteller = studentType === "hosteller" && (role === "student" || role === "employee" || role === "parent");

  if (isHosteller) {
    if (role === "student") return <StudentHostelScreen asTabRoot />;
    if (role === "parent") return <ParentHostelScreen />;
    return <FacultyHostelScreen />;
  }
  return <BusTrackingScreen />;
}
