import { PayslipRequestScreen } from "@/features/erp/payslip-request/PayslipRequestScreen";

// Reached from the Employee/Faculty Progress tab's own grid (see
// FacultyProgressScreen.tsx) - see my-attendance/index.tsx's identical
// comment for why this needs its own Progress-tab-local route copy.
export default function PayslipRequestAcademicsRoute() {
  return <PayslipRequestScreen />;
}
