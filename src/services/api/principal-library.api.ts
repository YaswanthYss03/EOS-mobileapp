import { apiClient } from "./client";

// Principal-only Library overview - see EOS-backend's
// src/modules/principal-library/principal-library.service.ts. "Borrowed"
// counts currently-open loans, not all-time borrow events.

export type PrincipalLibraryCategory = {
  id: number;
  name: string;
  total_copies: number;
  borrowed: number;
  available: number;
  overdue: number;
};

export type PrincipalLibraryOverview = {
  total_books: number;
  borrowed_books: number;
  available_books: number;
  overdue_books: number;
  categories: PrincipalLibraryCategory[];
};

export async function getPrincipalLibraryOverview(): Promise<PrincipalLibraryOverview> {
  const { data } = await apiClient.get<{ data: PrincipalLibraryOverview }>("/principal-library/overview");
  return data.data;
}
