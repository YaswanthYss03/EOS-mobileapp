import { useLocalSearchParams } from "expo-router";
import { LmsSubjectScreen } from "@/features/academics/lms/LmsSubjectScreen";

// Reached from the erp tab's own Current Semester copy (see
// app/(tabs)/erp/current-semester/index.tsx) - same component/screen as
// app/(tabs)/academics/lms/[subjectId].tsx, just living in this tab's own
// stack so Employee/HoD never cross into the (hidden, for these roles)
// Academics tab. LmsSubjectScreen's own back button is a plain
// router.back(), which works correctly here since it only ever pops
// whichever stack actually pushed it.
export default function LmsSubjectErpRoute() {
  const { subjectId, subjectName, subjectCode } = useLocalSearchParams<{
    subjectId: string;
    subjectName?: string;
    subjectCode?: string;
  }>();
  return <LmsSubjectScreen subjectId={Number(subjectId)} subjectName={subjectName} subjectCode={subjectCode} />;
}
