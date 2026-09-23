import { PrincipalStudentDetailScreen } from "@/features/erp/principal/students/PrincipalStudentDetailScreen";

// Full-profile drill-down from PrincipalStudentsScreen's search
// results/recent lookups (see that screen's openStudent) - lives in this
// same stack (not a separate tab) so back-navigation stays correct.
export default function PrincipalStudentDetailRoute() {
  return <PrincipalStudentDetailScreen />;
}
