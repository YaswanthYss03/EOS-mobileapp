import { apiClient } from "./client";

// Mirrors EOS-backend's HoD-facing Timetable Allocation endpoints (see
// EOSbackend1/src/modules/hod/hod-timetable.service.ts, exposed on
// HodDepartment2Controller as GET/PUT/DELETE under /hod/timetable). Real
// department- and academic-year-scoped CRUD over `timetable_slots` - not
// the read-only faculty roster viewer (@/services/api/faculty-timetable-roster.api,
// a different backend module entirely). "lab" vs "class" comes from
// `subjects.course_type` containing PRACTICAL, not a stored boolean. There
// is no "break" concept anywhere in the schema, so an empty cell is always
// "free". `columns` (period_number + start/end time) are derived from
// whatever slots already exist for the selected class - a brand new class
// with zero slots yet has zero columns, since there's no separate "period
// master" schedule table to fall back on (see setSlot's own NO_PERIOD_TIMING
// error: the very first slot for a new period_number can't be created from
// this screen alone, only from an existing one on another day).

export type HodTimetableClass = {
  class_id: number;
  short_label: string;
  label: string;
};

export type HodTimetableSubject = {
  subject_id: number;
  name: string;
  code: string;
  // Faculty already mapped to teach this subject for this class this
  // academic year (faculty_subject_class_mapping) - not every faculty in
  // the department. Can be empty if no mapping exists yet.
  faculty_ids: number[];
};

export type HodTimetableFacultyOption = {
  faculty_id: number;
  name: string;
};

export type HodTimetableColumn = {
  period_number: number;
  start_time: string;
  end_time: string;
};

export type HodTimetableCell =
  | { period_number: number; type: "free" }
  | {
      period_number: number;
      type: "class" | "lab";
      slot_id: number;
      subject_id: number;
      subject_name: string;
      subject_code: string;
      faculty_id: number;
      faculty_name: string;
      venue_name: string | null;
    };

export type HodTimetableRow = {
  day_of_week: number;
  day_label: string;
  cells: HodTimetableCell[];
};

export type HodTimetableOverview = {
  classes: HodTimetableClass[];
  selected_class_id: number | null;
  selected_class_label: string | null;
  subjects: HodTimetableSubject[];
  faculty_options: HodTimetableFacultyOption[];
  columns: HodTimetableColumn[];
  rows: HodTimetableRow[];
};

// classId omitted picks the department's first class server-side (see
// getOverview's own selectedClassId fallback) - always pass it explicitly
// once the caller knows which class is selected, to avoid re-triggering
// that fallback on every refetch.
export async function getHodTimetable(classId?: number): Promise<HodTimetableOverview> {
  const { data } = await apiClient.get<{ data: HodTimetableOverview }>("/hod/timetable", {
    params: classId != null ? { class_id: classId } : undefined,
  });
  return data.data;
}

// Creates or updates the one slot at (classId, dayOfWeek, periodNumber).
// Requires a period_number that already has a real start/end time
// somewhere in this class's timetable (any day) - the backend has no
// separate period-timing input, it only ever reuses an existing slot's
// times. Also rejected (409) if facultyId is already teaching another
// class at this exact day+period anywhere in the college.
export async function setHodTimetableSlot(params: {
  classId: number;
  dayOfWeek: number;
  periodNumber: number;
  subjectId: number;
  facultyId: number;
}): Promise<void> {
  await apiClient.put("/hod/timetable/slot", {
    class_id: params.classId,
    day_of_week: params.dayOfWeek,
    period_number: params.periodNumber,
    subject_id: params.subjectId,
    faculty_id: params.facultyId,
  });
}

export async function clearHodTimetableSlot(slotId: number): Promise<void> {
  await apiClient.delete(`/hod/timetable/slot/${slotId}`);
}
