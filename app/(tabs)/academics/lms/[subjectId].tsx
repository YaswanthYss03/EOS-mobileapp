import { useLocalSearchParams } from "expo-router";
import { LmsSubjectScreen } from "@/features/academics/lms/LmsSubjectScreen";

export default function LmsSubjectRoute() {
  const { subjectId, subjectName, subjectCode } = useLocalSearchParams<{
    subjectId: string;
    subjectName?: string;
    subjectCode?: string;
  }>();
  return <LmsSubjectScreen subjectId={Number(subjectId)} subjectName={subjectName} subjectCode={subjectCode} />;
}
