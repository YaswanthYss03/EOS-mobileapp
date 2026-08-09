import { useLocalSearchParams } from "expo-router";
import { FolderResourcesScreen } from "@/features/academics/lms/FolderResourcesScreen";

export default function LmsFolderRoute() {
  const { folderId, title } = useLocalSearchParams<{ folderId: string; title?: string }>();
  return <FolderResourcesScreen folderId={Number(folderId)} title={title} />;
}
