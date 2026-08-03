import { useLocalSearchParams } from "expo-router";
import { LmsNotesScreen } from "@/features/academics/lms/LmsNotesScreen";

export default function LmsNotesRoute() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();
  return <LmsNotesScreen subjectId={subjectId} />;
}
