import { apiClient } from "./client";

// Mirrors EOS-backend's library module (see EOS-backend/src/modules/library/*).
// GET /me/library/borrow-records is student-only and self-scoped; GET
// /library/books and /library/e-resources are shared catalogue reads (any
// authenticated user). e_resources has no author/publisher columns at all
// (it's generic links, not bibliographic ebook records) - only
// title/url/format/size/license_type.
export type BorrowStatus = "borrowed" | "returned" | "lost" | "damaged";

export type MyBorrowRecord = {
  id: number;
  book_id: number;
  title: string;
  author: string | null;
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: BorrowStatus;
  renewal_count: number;
  last_renewed_at: string | null;
};

export async function getMyBorrowRecords(status?: BorrowStatus): Promise<MyBorrowRecord[]> {
  const { data } = await apiClient.get<{ data: MyBorrowRecord[] }>("/me/library/borrow-records", {
    params: status ? { status } : undefined,
  });
  return data.data;
}

// GET /library/borrow-records has no @Roles restriction and auto-scopes by
// the caller's own role (student -> student_id, faculty -> faculty_id) - see
// BorrowRecordsService.findAll. This is how a FACULTY member sees their own
// borrow records; /me/library/borrow-records above is student-only. The
// book relation here has no author field (RECORD_INCLUDE only selects
// id/title/qr_code) and there is no faculty-callable renew/return action -
// those mutations are library/admin only.
export type FacultyBorrowRecord = {
  id: number;
  book: { id: number; title: string; qr_code: string };
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: "borrowed" | "returned" | "lost" | "damaged";
  is_overdue: boolean;
  renewal_count: number;
};

type PaginatedFacultyBorrowRecords = { data: FacultyBorrowRecord[]; total: number };

export async function getMyFacultyBorrowRecords(
  status?: "borrowed" | "returned",
): Promise<FacultyBorrowRecord[]> {
  const { data } = await apiClient.get<{ data: PaginatedFacultyBorrowRecords }>("/library/borrow-records", {
    params: { status, page_size: 100 },
  });
  return data.data.data;
}

export type LibraryBook = {
  id: number;
  qr_code: string;
  title: string;
  author: string | null;
  category_name: string;
  total_copies: number;
  available_copies: number;
  rack: { id: number; rack_code: string; subject_range: string | null } | null;
};

type PaginatedBooks = { data: LibraryBook[]; total: number; page: number; page_size: number };

export async function searchBooks(q: string): Promise<LibraryBook[]> {
  const { data } = await apiClient.get<{ data: PaginatedBooks }>("/library/books", {
    params: { q: q.trim() || undefined, page_size: 50 },
  });
  return data.data.data;
}

export type EResource = {
  id: number;
  title: string;
  url: string;
  format: string | null;
  file_size_bytes: number | null;
  license_type: string | null;
};

type PaginatedEResources = { data: EResource[]; total: number };

export async function searchEResources(q: string): Promise<EResource[]> {
  const { data } = await apiClient.get<{ data: PaginatedEResources }>("/library/e-resources", {
    params: { q: q.trim() || undefined, publish_state: "published", page_size: 50 },
  });
  return data.data.data;
}
