import { apiClient } from "./client";

// HoD-scoped Entrepreneurship roster - which students in the HoD's own
// department have registered a startup/business idea, from the real
// `student_entrepreneurship` table (see EOS-backend's HodEdcService, GET
// /hod/edc[/:id]). Distinct from student-entrepreneurship.api.ts's
// Principal-only (college-wide) and Advisor/class-mentor-scoped views -
// this one sits one level up, at the whole department.
//
// batch_id and class_id are both optional server-side AND-filters (not
// mutually exclusive), same "batch + class/section" scoping pattern as
// hod-higher-education.api.ts above.

export type HodEdcFilters = {
  batches: { batch_id: number; label: string }[];
  departments: { department_id: number; name: string; code: string }[];
};

export type HodEdcRow = {
  id: number;
  student_id: number;
  student_id_no: string;
  name: string;
  photo_url: string | null;
  department_code: string | null;
  batch_label: string | null;
  venture: string;
  domain: string | null;
  role: string | null;
  monthly_revenue: number | null;
  stage: string | null;
};

export type HodEdcOverview = {
  stats: {
    total: number;
    startups_beyond_idea: number;
    registered_ventures: number;
    private_limited_count: number;
    startups_inside_college: number;
  };
  filters: HodEdcFilters;
  rows: HodEdcRow[];
};

export async function getHodEdcOverview(params?: {
  search?: string;
  batchId?: number;
  classId?: number;
}): Promise<HodEdcOverview> {
  const { data } = await apiClient.get<{ data: HodEdcOverview }>("/hod/edc", {
    params: {
      search: params?.search || undefined,
      batch_id: params?.batchId,
      class_id: params?.classId,
    },
  });
  return data.data;
}
