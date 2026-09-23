import { apiClient } from "./client";

// Mirrors EOS-backend's /me/todos and /placement/todos routes (see
// EOS-backend/src/modules/student-todos/student-todos.service.ts) - a
// Placement Cell staff account posts a to-do, every student sees it here.

export type MyTodo = {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  pdf_url: string | null;
  link_url: string | null;
  is_completed: boolean;
  completed_at: string | null;
};

export async function getMyTodos(): Promise<MyTodo[]> {
  const { data } = await apiClient.get<{ data: MyTodo[] }>("/me/todos");
  return data.data;
}

export async function completeMyTodo(id: number): Promise<void> {
  await apiClient.post(`/me/todos/${id}/complete`);
}

// --- Placement Cell (posting side) ---

export type PlacementTodo = {
  id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  pdf_url: string | null;
  link_url: string | null;
  is_active: boolean;
  created_at: string;
  completed_count: number;
  total_students: number;
};

export async function getMyPostedTodos(): Promise<PlacementTodo[]> {
  const { data } = await apiClient.get<{ data: PlacementTodo[] }>("/placement/todos");
  return data.data;
}

export async function postTodo(input: { title: string; description?: string; deadline?: string }): Promise<{ id: number }> {
  const { data } = await apiClient.post<{ data: { id: number } }>("/placement/todos", input);
  return data.data;
}
