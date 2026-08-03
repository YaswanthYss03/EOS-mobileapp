import { useLocalSearchParams } from "expo-router";
import { PostDetailScreen } from "@/features/home/PostDetailScreen";

export default function PostDetail() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  return <PostDetailScreen postId={postId} />;
}
