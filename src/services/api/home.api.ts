import { apiClient } from "./client";

export async function getPosts() {
  const { data } = await apiClient.get("/posts");
  return data;
}

export async function addComment(postId: string, text: string) {
  const { data } = await apiClient.post(`/posts/${postId}/comments`, { text });
  return data;
}
