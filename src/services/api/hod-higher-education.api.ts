import { apiClient } from "./client";

// HoD-scoped Higher Education roster - which students in the HoD's own
// department (via their own faculty row's department_id) have registered
// interest in further studies, from the real `student_higher_education`
// table (see EOS-backend's HodHigherEducationService, GET /hod/higher-
// education[/:id]). Distinct from student-higher-education.api.ts's
// Principal-only (college-wide) and Advisor/class-mentor-scoped views -
// this one sits one level up, at the whole department.
//
// batch_id and class_id are both optional server-side AND-filters (not
// mutually exclusive) - class_id narrows to one class+section within
// whichever batch is/isn't also selected, mirroring the same "batch + class/
// section" scoping DrivesService.getDepartmentClasses/getDepartmentStudents
// already use for the HoD Placements History tab.

export type HodHigherEducationFilters = {
  batches: { batch_id: number; label: string }[];
  programmes: string[];
};

export type HodHigherEducationRow = {
  id: number;
  student_id: number;
  student_id_no: string;
  name: string;
  photo_url: string | null;
  department_code: string;
  batch_label: string | null;
  programme: string;
  university: string | null;
  country: string;
  remarks: string | null;
  scholarship: string | null;
  status: string | null;
};

export type HodHigherEducationOverview = {
  department: { id: number; name: string; code: string };
  stats: {
    total: number;
    overseas_count: number;
    domestic_count: number;
    countries: string[];
  };
  filters: HodHigherEducationFilters;
  rows: HodHigherEducationRow[];
};

export async function getHodHigherEducationOverview(params?: {
  search?: string;
  batchId?: number;
  programme?: string;
  classId?: number;
}): Promise<HodHigherEducationOverview> {
  const { data } = await apiClient.get<{ data: HodHigherEducationOverview }>("/hod/higher-education", {
    params: {
      search: params?.search || undefined,
      batch_id: params?.batchId,
      programme: params?.programme,
      class_id: params?.classId,
    },
  });
  return data.data;
}
