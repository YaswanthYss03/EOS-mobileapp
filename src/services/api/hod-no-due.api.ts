import { apiClient } from "./client";

// Mirrors EOS-backend's HoD-facing "No-Due Approval" endpoints (see
// EOS-backend/src/modules/faculty/no-due/no-due.service.ts). Everything here
// is computed live from real fee_payments/student_fee_demand_mapping and
// book_borrow_records data - there is no stored "cleared/pending" column
// anywhere in the schema, and fee categories are whatever demand_categories
// rows actually exist for a student (never a fixed hardcoded list).
export type NoDueBatch = {
  id: number;
  name: string;
};

export type NoDueFeeCategory = {
  category: string;
  cleared: boolean;
  pending_amount: number;
};

export type NoDueStudent = {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  register_no: string | null;
  section: string | null;
  fees: NoDueFeeCategory[];
  library: { cleared: boolean; pending_amount: number };
  total_pending: number;
  // Reflects an existing, currently-valid HoD override (see approveNoDue) -
  // does NOT mean the student is actually cleared; real dues (total_pending)
  // remain the source of truth for the Cleared/Pending split.
  override_approved: boolean;
};

export async function getMyDepartmentBatches(): Promise<NoDueBatch[]> {
  const { data } = await apiClient.get<{ data: NoDueBatch[] }>("/me/no-due/batches");
  return data.data;
}

export type NoDueStudentsParams = {
  status: "cleared" | "pending";
  batchId?: number;
  search?: string;
};

export async function getNoDueStudents(params: NoDueStudentsParams): Promise<NoDueStudent[]> {
  const { data } = await apiClient.get<{ data: { data: NoDueStudent[] } }>("/me/no-due/students", {
    params: {
      status: params.status,
      batch_id: params.batchId,
      search: params.search || undefined,
      limit: 100,
    },
  });
  return data.data.data;
}

// HoD-initiated override - no prior student request needed. Never changes
// the student's real dues; a student who owes money still shows up under
// Pending afterwards, just with override_approved: true.
export async function approveNoDue(studentId: number): Promise<{ student_id: number; override_approved: boolean }> {
  const { data } = await apiClient.post<{ data: { student_id: number; override_approved: boolean } }>(
    `/me/no-due/students/${studentId}/approve`,
  );
  return data.data;
}
