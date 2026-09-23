import { useLocalSearchParams } from "expo-router";
import { LmsSubjectScreen } from "@/features/academics/lms/LmsSubjectScreen";

export default function LmsSubjectRoute() {
  const { subjectId, subjectName, subjectCode, tab } = useLocalSearchParams<{
    subjectId: string;
    subjectName?: string;
    subjectCode?: string;
    // Forwarded from Daily Task's today-cards (see DailyTaskScreen.tsx) to
    // land directly on the Task or Online Class tab instead of always
    // defaulting to Task.
    tab?: "task" | "lessons" | "online-class";
  }>();
  return (
    <LmsSubjectScreen
      subjectId={Number(subjectId)}
      subjectName={subjectName}
      subjectCode={subjectCode}
      initialTab={tab}
    />
  );
}
