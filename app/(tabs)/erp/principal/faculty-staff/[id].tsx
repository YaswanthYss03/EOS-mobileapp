import { PrincipalFacultyDetailScreen } from "@/features/erp/principal/faculty-staff/PrincipalFacultyDetailScreen";

// Reached from FacultyStaffScreen's search results (see FacultyRow's
// onPress) - lives under this same faculty-staff route folder so
// back-navigation stays inside the Principal erp-tab Stack, same convention
// as app/(tabs)/erp/placements/student/[studentId].tsx.
export default function PrincipalFacultyDetailRoute() {
  return <PrincipalFacultyDetailScreen />;
}
