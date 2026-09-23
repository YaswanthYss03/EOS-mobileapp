import { Directory, File, Paths } from "expo-file-system";
import { apiClient, getAuthToken } from "./client";
import type { MyAttendanceResponse } from "./attendance.api";
import type { ExamResultsResponse } from "./academics.api";
import type { MyFeesResponse } from "./fees.api";
import type { MyTimetableDay } from "./current-semester.api";
import type { MyAcademicCalendar } from "./academic-calendar.api";
import type { UpcomingDrive, DriveHistoryItem } from "./placements.api";
import type { MyProfile } from "./profile.api";
import type {
  FeePaymentOrder,
  FeePaymentVerifyResult,
  VerifyFeePaymentPayload,
} from "./fees.api";
import type { CraveoOrder } from "./craveo.api";
import type { StationeryOrder } from "./stationery.api";
import type { MyStationaryRequest } from "./stationary.api";
import type { MyAppointment } from "./medical-appointments.api";
import type { HostelRoomInfo, MyNightAttendance } from "./hostel.api";

// Mirrors EOS-backend's parent-facing endpoints (see
// EOS-backend/src/modules/parents/parents.service.ts). A parent can be
// linked to more than one child (siblings) via parent_student_mapping, so
// this is always a list, never an assumed single student. Ownership of each
// child is enforced server-side (parent_student_mapping lookup) - a
// student_id the caller isn't actually linked to 403s as NOT_THIS_PARENT
// rather than ever being trusted from the client.
export type ParentChild = {
  id: number;
  name: string;
  student_id_no: string;
  roll_no: string | null;
  relationship: "father" | "mother" | "guardian";
  section: string | null;
  semester: number | null;
  department: { id: number; name: string; code: string } | null;
  student_type: "hosteller" | "dayscholar";
};

export async function listMyChildren(): Promise<ParentChild[]> {
  const { data } = await apiClient.get<{ data: ParentChild[] }>("/me/children");
  return data.data;
}

// Same response shape as getMyProfile (student's own) - see profile.api.ts -
// always the "student" role branch, since a child is always a student.
export async function getChildProfile(studentId: number): Promise<MyProfile> {
  const { data } = await apiClient.get<{ data: MyProfile }>(`/me/children/${studentId}/profile`);
  return data.data;
}

// Same response shape as getMyAttendance (student's own) - see attendance.api.ts.
export async function getChildAttendance(
  studentId: number,
  from: string,
  to: string,
  subjectId?: number,
): Promise<MyAttendanceResponse> {
  const { data } = await apiClient.get<{ data: MyAttendanceResponse }>(
    `/me/children/${studentId}/attendance`,
    { params: { from, to, ...(subjectId !== undefined ? { subject_id: subjectId } : {}) } },
  );
  return data.data;
}

// Same response shape as getMyExamResults (student's own) - see academics.api.ts.
export async function getChildPerformance(
  studentId: number,
  semester: number,
): Promise<ExamResultsResponse> {
  const { data } = await apiClient.get<{ data: ExamResultsResponse }>(
    `/me/children/${studentId}/performance`,
    { params: { semester } },
  );
  return data.data;
}

// GET /me/children/:studentId/marksheet/:semester - a rendered PDF, same
// download pattern as downloadChildFeeReceipt below, just through the
// parent-child gateway route. Ownership of the child is checked
// server-side (ParentsService.getChildMarksheet's assertOwnChild).
export async function downloadChildSemesterMarksheet(studentId: number, semester: number) {
  const token = getAuthToken();
  const directory = new Directory(Paths.cache, "marksheets");
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  const destination = new File(directory, `Marksheet-Sem${semester}.pdf`);

  return File.downloadFileAsync(
    `${apiClient.defaults.baseURL}/me/children/${studentId}/marksheet/${semester}`,
    destination,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      idempotent: true,
    },
  );
}

// Same response shape as getMyFees (student's own) - see fees.api.ts.
export async function getChildFees(studentId: number): Promise<MyFeesResponse> {
  const { data } = await apiClient.get<{ data: MyFeesResponse }>(`/me/children/${studentId}/fees`);
  return data.data;
}

// Same response shape as getMyTimetable (student's own) - see current-semester.api.ts.
export async function getChildTimetable(studentId: number): Promise<MyTimetableDay[]> {
  const { data } = await apiClient.get<{ data: { days: MyTimetableDay[] } }>(
    `/me/children/${studentId}/timetable`,
  );
  return data.data.days;
}

// Same response shape as getMyHostelRoom (student's own) - see hostel.api.ts.
// Backs the parent's Hostel tab, shown instead of "My Bus" once this child's
// student_type is 'hosteller' (see app/(tabs)/_layout.tsx).
export async function getChildHostelRoom(studentId: number): Promise<HostelRoomInfo> {
  const { data } = await apiClient.get<{ data: HostelRoomInfo }>(`/me/children/${studentId}/hostel-room`);
  return data.data;
}

// Same response shape as getMyNightAttendance (student's own) - see hostel.api.ts.
export async function getChildNightAttendance(
  studentId: number,
  from?: string,
  to?: string,
): Promise<MyNightAttendance> {
  const { data } = await apiClient.get<{ data: MyNightAttendance }>(
    `/me/children/${studentId}/hostel-night-attendance`,
    { params: from && to ? { from, to } : undefined },
  );
  return data.data;
}

export type ChildGateLogEntryType = "in" | "out";

export type ChildGateLogEntry = {
  id: number;
  entry_type: ChildGateLogEntryType;
  recorded_at: string;
};

// Read-only view of the gate_warden's own hostel_in_out_ledger entries for
// this child - most-recent-first, capped server-side at 60 rows.
export async function getChildGateLog(studentId: number): Promise<ChildGateLogEntry[]> {
  const { data } = await apiClient.get<{ data: ChildGateLogEntry[] }>(
    `/me/children/${studentId}/hostel-gate-log`,
  );
  return data.data;
}

// Same response shape as getMyAcademicCalendar (student's own) - see academic-calendar.api.ts.
export async function getChildAcademicCalendar(studentId: number): Promise<MyAcademicCalendar> {
  const { data } = await apiClient.get<{ data: MyAcademicCalendar }>(
    `/me/children/${studentId}/academic-calendar`,
  );
  return data.data;
}

// Same response shape as getUpcomingDrives/getDriveHistory (student's own) - see placements.api.ts.
export async function getChildUpcomingDrives(studentId: number): Promise<UpcomingDrive[]> {
  const { data } = await apiClient.get<{ data: UpcomingDrive[] }>(
    `/me/children/${studentId}/upcoming-drives`,
  );
  return data.data;
}

export async function getChildPlacementHistory(studentId: number): Promise<DriveHistoryItem[]> {
  const { data } = await apiClient.get<{ data: DriveHistoryItem[] }>(
    `/me/children/${studentId}/placement-history`,
  );
  return data.data;
}

// Same shape/flow as the student's own createFeePaymentOrder/verifyFeePayment
// (see fees.api.ts) - just scoped through the parent-child link. Ownership
// of `studentId` is checked server-side both times (assertOwnChild), same
// as every other child-scoped call above.
export async function createChildFeePaymentOrder(
  studentId: number,
  demandId: number,
  amount: number,
): Promise<FeePaymentOrder> {
  const { data } = await apiClient.post<{ data: FeePaymentOrder }>(
    `/me/children/${studentId}/fees/demands/${demandId}/payment-order`,
    { amount },
  );
  return data.data;
}

export async function verifyChildFeePayment(
  studentId: number,
  payload: VerifyFeePaymentPayload,
): Promise<FeePaymentVerifyResult> {
  const { data } = await apiClient.post<{ data: FeePaymentVerifyResult }>(
    `/me/children/${studentId}/fees/payment-order/verify`,
    payload,
  );
  return data.data;
}

/**
 * GET /me/children/:studentId/fees/payments/:paymentId/receipt — downloads
 * the same real, backend-rendered PDF receipt as the student's own
 * downloadFeeReceipt (see fees.api.ts), just through the parent-child
 * gateway route. Ownership of both the child and the payment are checked
 * server-side (ParentsService.getChildFeeReceipt / MeFeesService's
 * RECEIPT_NOT_YOURS check).
 */
export async function downloadChildFeeReceipt(studentId: number, paymentId: number, receiptNo: string) {
  const token = getAuthToken();
  const directory = new Directory(Paths.cache, "receipts");
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  const safeName = receiptNo.replace(/[^a-zA-Z0-9_-]/g, "_") || String(paymentId);
  const destination = new File(directory, `${safeName}.pdf`);

  return File.downloadFileAsync(
    `${apiClient.defaults.baseURL}/me/children/${studentId}/fees/payments/${paymentId}/receipt`,
    destination,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      idempotent: true,
    },
  );
}

// The Progress tab's "Acknowledge" page - one feed each for Leave/Hostel
// Leave (same underlying table, told apart by `kind`) and OD requests, plus
// the acknowledge action for each. Mirrors EOS-backend's
// ParentsService.getChildLeaves/acknowledgeChildLeave/getChildOdRequests/
// acknowledgeChildOdRequest.

export type ChildLeaveKind = "leave" | "hostel_leave";
export type ChildLeaveStatus = "pending" | "faculty_approved" | "hod_approved" | "rejected" | "warden_approved";

export type ChildLeave = {
  id: number;
  kind: ChildLeaveKind;
  from_date: string;
  to_date: string;
  reason: string | null;
  status: ChildLeaveStatus;
  created_at: string;
  // This parent's OWN acknowledgement, not "any parent" - unlike the
  // Advisor/Warden screens' single parent_acknowledged badge, a parent's
  // own Acknowledge page needs to know whether THEY specifically have
  // acted, so their pending list is correct even when a co-parent already
  // acknowledged.
  acknowledged_at: string | null;
};

export async function getChildLeaves(studentId: number): Promise<ChildLeave[]> {
  const { data } = await apiClient.get<{ data: ChildLeave[] }>(`/me/children/${studentId}/leaves`);
  return data.data;
}

export async function acknowledgeChildLeave(
  studentId: number,
  leaveId: number,
): Promise<{ leave_id: number; acknowledged_at: string }> {
  const { data } = await apiClient.post<{ data: { leave_id: number; acknowledged_at: string } }>(
    `/me/children/${studentId}/leaves/${leaveId}/acknowledge`,
  );
  return data.data;
}

export type ChildOdRequest = {
  id: number;
  unique_code: string;
  team_name: string | null;
  from_date: string;
  to_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  acknowledged_at: string | null;
};

export async function getChildOdRequests(studentId: number): Promise<ChildOdRequest[]> {
  const { data } = await apiClient.get<{ data: ChildOdRequest[] }>(`/me/children/${studentId}/od-requests`);
  return data.data;
}

export async function acknowledgeChildOdRequest(
  studentId: number,
  odRequestId: number,
): Promise<{ od_request_id: number; acknowledged_at: string }> {
  const { data } = await apiClient.post<{ data: { od_request_id: number; acknowledged_at: string } }>(
    `/me/children/${studentId}/od-requests/${odRequestId}/acknowledge`,
  );
  return data.data;
}

// The Campus tab's read-only history views (Food Court/Library/Medical/
// Stationery Store/Copy Center) - a parent never orders/books/borrows on
// the child's behalf, so these are GET-only, no cart/checkout/booking
// mutations at all. Same response shapes the corresponding student-side
// API modules already declare (craveo.api.ts's CraveoOrder, stationary.
// api.ts's MyStationaryRequest, stationery.api.ts's StationeryOrder) since
// the backend reuses those exact same service methods under the hood - see
// ParentsService.getChildCraveoOrders/getChildStationeryOrders/
// getChildStationaryRequests.

export async function getChildCraveoOrders(studentId: number): Promise<CraveoOrder[]> {
  const { data } = await apiClient.get<{ data: CraveoOrder[] }>(`/me/children/${studentId}/craveo-orders`);
  return data.data;
}

export type ParentChildBorrowRecord = {
  id: number;
  book: { id: number; title: string; qr_code: string };
  borrowed_date: string;
  due_date: string;
  returned_date: string | null;
  status: "borrowed" | "returned" | "lost" | "damaged";
  is_overdue: boolean;
  renewal_count: number;
};

export async function getChildLibraryHistory(studentId: number): Promise<ParentChildBorrowRecord[]> {
  const { data } = await apiClient.get<{ data: { data: ParentChildBorrowRecord[]; total: number } }>(
    `/me/children/${studentId}/library-history`,
  );
  return data.data.data;
}

export async function getChildMedicalAppointments(studentId: number): Promise<MyAppointment[]> {
  const { data } = await apiClient.get<{ data: MyAppointment[] }>(`/me/children/${studentId}/medical-appointments`);
  return data.data;
}

export async function getChildStationeryOrders(studentId: number): Promise<StationeryOrder[]> {
  const { data } = await apiClient.get<{ data: StationeryOrder[] }>(`/me/children/${studentId}/stationery-orders`);
  return data.data;
}

export async function getChildStationaryRequests(studentId: number): Promise<MyStationaryRequest[]> {
  const { data } = await apiClient.get<{ data: MyStationaryRequest[] }>(
    `/me/children/${studentId}/stationary-requests`,
  );
  return data.data;
}

// Free-text feedback a parent submits - about their child, or about the
// college in general. Deliberately not the student's Mess/Academic/Service
// star-rating filter (see ParentCampusFeedbackScreen.tsx's own comment).
export type SubmitParentFeedbackPayload = { message: string; rating?: number };
export type ParentFeedbackReceipt = { id: number; created_at: string };

export async function submitChildFeedback(
  studentId: number,
  payload: SubmitParentFeedbackPayload,
): Promise<ParentFeedbackReceipt> {
  const { data } = await apiClient.post<{ data: ParentFeedbackReceipt }>(
    `/me/children/${studentId}/feedback`,
    payload,
  );
  return data.data;
}

export async function submitCollegeFeedback(
  payload: SubmitParentFeedbackPayload,
): Promise<ParentFeedbackReceipt> {
  const { data } = await apiClient.post<{ data: ParentFeedbackReceipt }>("/me/feedback/college", payload);
  return data.data;
}
