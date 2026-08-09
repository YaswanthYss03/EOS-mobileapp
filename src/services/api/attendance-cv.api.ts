import { apiClient } from "./client";

// Mirrors EOSbackend1's src/modules/faculty/attendance-cv module - a thin
// proxy in front of the separate Attendance-CV Flask service. The mobile
// app never talks to that service directly (see AttendanceCvService's own
// doc comment); every call here goes through our own backend, already
// gated by JWT + role guards.

export type TodayClassSlot = {
  id: number;
  period_number: number;
  start_time: string;
  end_time: string;
  subject_id: number;
  subject_name: string;
  class_id: number;
  class_section: string;
  department_name: string;
};

// GET /me/classes/today (Faculty/HoD) - today's own timetable, ordered by
// period. The Student Attendance tile's primary class-picker source.
export async function getTodayClasses(): Promise<TodayClassSlot[]> {
  const { data } = await apiClient.get<{ data: TodayClassSlot[] }>("/me/classes/today");
  return data.data;
}

export type HandledClass = {
  class_id: number;
  subject_id: number;
  academic_year: string;
  section: string;
  semester: number | null;
  department_name: string;
  subject_name: string;
  subject_code: string;
};

// GET /me/handled-classes (Faculty/HoD) - every (class, subject) the caller
// is mapped to teach, regardless of today's timetable. The fallback picker
// for makeup classes/anything not on today's schedule - same endpoint the
// No-Due tile uses (see assignment-status.api.ts).
export async function getHandledClasses(): Promise<HandledClass[]> {
  const { data } = await apiClient.get<{ data: HandledClass[] }>("/me/handled-classes");
  return data.data;
}

export type RosterStudent = {
  student_id: number;
  student_id_no: string;
  name: string;
  has_face_data: boolean;
  // null = not analyzed yet (no photo taken, or this is the plain roster
  // fetch before the camera was ever opened) - never assume absent.
  suggested_status: "present" | "absent" | null;
};

export type RecognizeAttendanceResult = {
  class_id: number;
  subject_id: number;
  analyzed: boolean;
  spoofed: number;
  students: RosterStudent[];
};

// POST /me/classes/:class_id/attendance/recognize (Faculty/HoD mapped to
// teach this subject/class). Call with no images to fetch the plain roster
// (populates the manual grid as soon as a class is picked); call again with
// captured photos to get back AI suggestions for the same roster. Read-only
// - never persists attendance itself, see markClassAttendance.
export async function recognizeAttendance(
  classId: number,
  subjectId: number,
  images?: string[],
): Promise<RecognizeAttendanceResult> {
  const { data } = await apiClient.post<{ data: RecognizeAttendanceResult }>(
    `/me/classes/${classId}/attendance/recognize`,
    { subject_id: subjectId, ...(images && images.length > 0 ? { images } : {}) },
  );
  return data.data;
}

export type MarkClassAttendanceResult = {
  class_id: number;
  attendance_date: string;
  marked: number;
};

// POST /me/classes/:class_id/attendance (Faculty/HoD mapped to teach this
// subject/class) - the real, persisting commit. Unmodified by the AI
// feature; the recognize step above only ever feeds this call's `records`.
export async function markClassAttendance(
  classId: number,
  subjectId: number,
  attendanceDate: string,
  records: Array<{ student_id: number; status: "present" | "absent" | "on_duty" }>,
): Promise<MarkClassAttendanceResult> {
  const { data } = await apiClient.post<{ data: MarkClassAttendanceResult }>(
    `/me/classes/${classId}/attendance`,
    { subject_id: subjectId, attendance_date: attendanceDate, records },
  );
  return data.data;
}

export type EnrollmentRosterStudent = {
  student_id: number;
  student_id_no: string;
  name: string;
  face_enrolled_at: string | null;
};

// GET /me/classes/:class_id/face-enrollment-roster (advisor of class_id
// only). Backs the "Enroll student faces" screen's per-student list.
export async function getEnrollmentRoster(
  classId: number,
): Promise<{ class_id: number; students: EnrollmentRosterStudent[] }> {
  const { data } = await apiClient.get<{ data: { class_id: number; students: EnrollmentRosterStudent[] } }>(
    `/me/classes/${classId}/face-enrollment-roster`,
  );
  return data.data;
}

export type FaceEnrollmentResult = {
  student_id: number;
  student_id_no: string;
  name: string;
  captured: number;
  skipped: number;
};

// POST /me/classes/:class_id/students/:student_id/face-enrollment (advisor
// of :class_id only). Forwards captured face photos for training.
export async function enrollStudentFace(
  classId: number,
  studentId: number,
  images: string[],
): Promise<FaceEnrollmentResult> {
  const { data } = await apiClient.post<{ data: FaceEnrollmentResult }>(
    `/me/classes/${classId}/students/${studentId}/face-enrollment`,
    { images },
  );
  return data.data;
}
