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
  // Accepted period swaps/takeovers for that date (see the backend's
  // findTodayForFaculty). covered_by set = this slot was handed to someone
  // else that day; is_substitution = this caller is covering it.
  is_substitution?: boolean;
  covered_by?: { id: number; name: string } | null;
};

// GET /me/classes/today?date=YYYY-MM-DD (Faculty/HoD) - the caller's own
// timetable for that date (today when omitted), ordered by period. The
// Student Attendance screen's only class-picker source.
export async function getTodayClasses(date?: string): Promise<TodayClassSlot[]> {
  const { data } = await apiClient.get<{ data: TodayClassSlot[] }>("/me/classes/today", {
    params: date ? { date } : undefined,
  });
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
  // The classroom photo the backend kept as evidence (its own Cloudinary
  // attendance/ folder), or null. Handed back unchanged to
  // markClassAttendance - the backend rejects any other URL.
  photo_url: string | null;
  students: RosterStudent[];
};

// Mirrors the backend's MAX_RECOGNIZE_IMAGES (RecognizeAttendanceDto).
export const MAX_RECOGNIZE_IMAGES = 10;

// POST /me/classes/:class_id/attendance/recognize (Faculty/HoD mapped to
// teach this subject/class, or covering it on attendanceDate via an
// accepted period swap/takeover). Call with no images to fetch the plain
// roster (active students only - populates the manual grid as soon as a
// class is picked); call again with captured photos to get back AI
// suggestions for the same roster. Read-only - never persists attendance
// itself, see markClassAttendance.
export async function recognizeAttendance(
  classId: number,
  subjectId: number,
  attendanceDate: string,
  images?: string[],
): Promise<RecognizeAttendanceResult> {
  const { data } = await apiClient.post<{ data: RecognizeAttendanceResult }>(
    `/me/classes/${classId}/attendance/recognize`,
    {
      subject_id: subjectId,
      attendance_date: attendanceDate,
      ...(images && images.length > 0 ? { images } : {}),
    },
  );
  return data.data;
}

export type MarkClassAttendanceResult = {
  class_id: number;
  attendance_date: string;
  marked: number;
  is_published: boolean;
};

// POST /me/classes/:class_id/attendance (Faculty/HoD mapped to teach this
// subject/class) - persists attendance as a draft (is_published: false,
// see EOSbackend1's AttendanceService.markForClass). Not yet visible to
// students/parents/advisors via the role-scoped GET /attendance until
// publishClassAttendance is called - re-saving before that just replaces
// the draft rows, so this can be called repeatedly while still reviewing.
export async function markClassAttendance(
  classId: number,
  subjectId: number,
  attendanceDate: string,
  records: Array<{ student_id: number; status: "present" | "absent" | "on_duty" }>,
  photoUrl?: string | null,
): Promise<MarkClassAttendanceResult> {
  const { data } = await apiClient.post<{ data: MarkClassAttendanceResult }>(
    `/me/classes/${classId}/attendance`,
    {
      subject_id: subjectId,
      attendance_date: attendanceDate,
      records,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    },
  );
  return data.data;
}

export type PublishClassAttendanceResult = {
  class_id: number;
  subject_id: number;
  attendance_date: string;
  published: number;
  published_at: string;
};

// POST /me/classes/:class_id/attendance/publish - flips a previously-saved
// draft to is_published: true, the exact moment it becomes visible to
// students/parents/advisors. 404s with ATTENDANCE_DRAFT_NOT_FOUND if
// markClassAttendance was never called for this class/subject/date first.
export async function publishClassAttendance(
  classId: number,
  subjectId: number,
  attendanceDate: string,
): Promise<PublishClassAttendanceResult> {
  const { data } = await apiClient.post<{ data: PublishClassAttendanceResult }>(
    `/me/classes/${classId}/attendance/publish`,
    { subject_id: subjectId, attendance_date: attendanceDate },
  );
  return data.data;
}

export type ClassAttendanceDraft = {
  class_id: number;
  subject_id: number;
  attendance_date: string;
  is_published: boolean;
  records: Array<{ student_id: number; status: "present" | "absent" | "on_duty" }>;
};

// GET /me/classes/:class_id/attendance/draft?subject_id=&date= - whatever
// was already saved for this class/subject/date (empty records if nothing
// yet), plus whether it's been published. Lets the screen resume a draft
// and lock a date that's already final.
export async function getClassAttendanceDraft(
  classId: number,
  subjectId: number,
  date: string,
): Promise<ClassAttendanceDraft> {
  const { data } = await apiClient.get<{ data: ClassAttendanceDraft }>(
    `/me/classes/${classId}/attendance/draft`,
    { params: { subject_id: subjectId, date } },
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
