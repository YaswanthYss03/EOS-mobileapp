import { AcademicsChooserScreen } from "@/features/academics/AcademicsChooserScreen";
import { FacultyProgressScreen } from "@/features/erp/employee/FacultyProgressScreen";
import { HodFacultyScreen } from "@/features/erp/hod/HodFacultyScreen";
import { HrPayrollProgressScreen } from "@/features/erp/hr-payroll/HrPayrollProgressScreen";
import { PrincipalProgressScreen } from "@/features/erp/principal/PrincipalProgressScreen";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/context/AuthContext";

export default function AcademicsIndex() {
  const role = useRole();
  const { activeAccountMode } = useAuth();
  // This tab is relabeled "Progress" for Employee (faculty self-service
  // Leave/OD/Payslip/Appraisal - see app/(tabs)/_layout.tsx) - a completely
  // different screen from the student/alumni Academics chooser this same
  // route renders for every other visible role. HOD gets the same Progress
  // screen while acting as Faculty (Switch Account - see AuthContext.tsx's
  // ViewMode), or a new "Faculty" tab root (Leave/OD/POP-SOP/Appraisal/
  // Timetable Allocation/Assign Faculty/Announcement) while acting as HOD.
  // HR & Payroll gets its own dedicated Progress tab too now (Attendance/
  // Appraisal only - see HrPayrollProgressScreen's own doc comment).
  // Principal gets one too (Attendance/Leave/OD - see
  // PrincipalProgressScreen's own doc comment).
  if (role === "employee" || (role === "hod" && activeAccountMode === "FACULTY")) return <FacultyProgressScreen />;
  if (role === "hod") return <HodFacultyScreen />;
  if (role === "hr-payroll") return <HrPayrollProgressScreen />;
  if (role === "principal") return <PrincipalProgressScreen />;
  return <AcademicsChooserScreen />;
}
