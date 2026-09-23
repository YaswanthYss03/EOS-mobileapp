import { useEffect, useState } from "react";
import { getMyAttendance } from "@/services/api/attendance.api";
import { getMyExamResults } from "@/services/api/academics.api";
import { getMyFees } from "@/services/api/fees.api";
import { getMyOdRequests } from "@/services/api/od.api";
import { listMyLeaves } from "@/services/api/leaves.api";
import { getMyExamSchedule } from "@/services/api/exam-schedule.api";
import { getMyHostelRoom } from "@/services/api/hostel.api";
import { getMyBorrowRecords } from "@/services/api/library.api";
import { listMyFeedbackForms } from "@/services/api/feedback.api";
import { listMyAssignmentStatuses } from "@/services/api/no-due.api";
import { getMyAppointments } from "@/services/api/medical-appointments.api";
import { getMyClassSection } from "@/services/api/current-semester.api";
import { computeCreditWeightedGpa } from "@/utils/grading";
import { defaultSemester, semesterNumber } from "../../student-performance/data/mockStudentPerformance";

// Same window the Attendance overview screen uses for its own "overall" %
// (see StudentAttendanceOverviewScreen.OVERALL_WINDOW_DAYS) - kept in sync
// here rather than imported since that screen doesn't export it.
const ATTENDANCE_WINDOW_DAYS = 180;
const ATTENDANCE_MIN_PERCENT = 75;

export type CardStat = {
  // "…" while the request is in flight, "–" once it's failed - never a
  // fabricated number.
  value: string;
  subtitle: string;
  progress: number;
  loading: boolean;
};

export type StudentDashboardData = {
  classSection: string | null;
  // null while the hostel-room lookup is still in flight - the Campus grid
  // holds off rendering the Hostel tile until this resolves, rather than
  // flashing it for a dayscholar before hiding it again.
  isHostelResident: boolean | null;
  attendance: CardStat;
  performance: CardStat;
  fees: CardStat;
  od: CardStat;
  leave: CardStat;
  examSchedule: CardStat;
  bonafide: CardStat;
  hostel: CardStat;
  library: CardStat;
  feedback: CardStat;
  noDue: CardStat;
  medical: CardStat;
};

const LOADING: CardStat = { value: "…", subtitle: "", progress: 0, loading: true };
const FAILED: CardStat = { value: "–", subtitle: "Couldn't load", progress: 0, loading: false };

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Fetches every real number the student dashboard's Quick Access/Campus
// tiles show, each independently so one slow/failed endpoint (e.g. Library)
// never blocks the others from rendering their real values.
export function useStudentDashboardData(): StudentDashboardData {
  const [data, setData] = useState<StudentDashboardData>({
    classSection: null,
    isHostelResident: null,
    attendance: LOADING,
    performance: LOADING,
    fees: LOADING,
    od: LOADING,
    leave: LOADING,
    examSchedule: LOADING,
    bonafide: LOADING,
    hostel: LOADING,
    library: LOADING,
    feedback: LOADING,
    noDue: LOADING,
    medical: LOADING,
  });

  useEffect(() => {
    let cancelled = false;
    const set = (patch: Partial<StudentDashboardData>) => {
      if (!cancelled) setData((prev) => ({ ...prev, ...patch }));
    };

    // Resolves the student's REAL current semester (classes.current_semester,
    // e.g. 7) rather than the hardcoded defaultSemester fallback below -
    // querying exam results under the wrong semester number returns nothing
    // even when that student's real, current-semester marks are fully
    // published (a different, unrelated cohort can legitimately occupy the
    // "Semester 5" slot the old hardcoded default pointed at).
    const currentSemesterPromise = getMyClassSection()
      .then(({ class_section, current_semester }) => {
        set({ classSection: class_section });
        return current_semester ?? semesterNumber(defaultSemester);
      })
      .catch(() => semesterNumber(defaultSemester));

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - ATTENDANCE_WINDOW_DAYS);
    getMyAttendance(toDateOnly(from), toDateOnly(to))
      .then((res) => {
        const pct = res.overall.percentage;
        set({
          attendance: {
            value: `${pct.toFixed(1)}%`,
            subtitle: `Min ${ATTENDANCE_MIN_PERCENT}% req.`,
            progress: pct / 100,
            loading: false,
          },
        });
      })
      .catch(() => set({ attendance: FAILED }));

    currentSemesterPromise
      .then((semesterNum) => getMyExamResults(semesterNum))
      .then((res) => {
        // Overall CGPA, not a raw percentage - and only ever from the
        // official end-semester exam (internals are formative assessment,
        // never part of a real CGPA), same rule the credit-weighted
        // calculation itself already enforces. No fallback to internals
        // here: a percentage from an internal isn't a CGPA, so there's
        // nothing honest to show until the semester exam is published.
        const gpa = res.semester_exam ? computeCreditWeightedGpa(res.semester_exam.subjects) : null;
        if (gpa === null) {
          set({ performance: { value: "–", subtitle: "No CGPA yet", progress: 0, loading: false } });
          return;
        }
        set({
          performance: {
            value: gpa.toFixed(2),
            subtitle: "CGPA",
            progress: gpa / 10,
            loading: false,
          },
        });
      })
      .catch(() => set({ performance: FAILED }));

    getMyFees()
      .then((res) => {
        const totalAmount = res.demands.reduce((sum, d) => sum + d.total, 0);
        const totalPaid = res.demands.reduce((sum, d) => sum + d.paid, 0);
        const totalDue = res.demands.reduce((sum, d) => sum + d.due, 0);
        const label = res.demands.length === 0 ? "No dues" : totalDue === 0 ? "Paid" : totalPaid > 0 ? "Partial" : "Due";
        const latestPayment = [...res.payments].sort((a, b) => b.payment_date.localeCompare(a.payment_date))[0];
        set({
          fees: {
            value: label,
            subtitle: latestPayment ? `Rec. #${latestPayment.receipt_no}` : "No payments yet",
            progress: totalAmount > 0 ? totalPaid / totalAmount : 0,
            loading: false,
          },
        });
      })
      .catch(() => set({ fees: FAILED }));

    getMyOdRequests(1, 1)
      .then((res) => set({ od: { value: String(res.total), subtitle: "requests", progress: 0, loading: false } }))
      .catch(() => set({ od: FAILED }));

    listMyLeaves({ page_size: 1 })
      .then((res) => set({ leave: { value: String(res.total), subtitle: "requests", progress: 0, loading: false } }))
      .catch(() => set({ leave: FAILED }));

    getMyExamSchedule()
      .then((rows) => {
        const todayStr = toDateOnly(new Date());
        const upcoming = rows.filter((r) => r.exam_date >= todayStr).length;
        set({
          examSchedule: { value: String(upcoming), subtitle: "upcoming", progress: 0, loading: false },
        });
      })
      .catch(() => set({ examSchedule: FAILED }));

    // Bonafide has no "my requests" list endpoint (create-only, see
    // @/services/api/bonafide.api.ts) - nothing real to count here yet.
    set({ bonafide: { value: "Apply", subtitle: "", progress: 0, loading: false } });

    getMyHostelRoom()
      .then((room) => {
        set({
          isHostelResident: room.is_hostel_resident,
          hostel: {
            value: room.is_hostel_resident ? room.room_number ?? "Allotted" : "Not allotted",
            subtitle: room.hostel_name ?? "",
            progress: 0,
            loading: false,
          },
        });
      })
      // isHostelResident is left unset (null) on failure - StudentDashboard
      // only renders the Hostel tile once it's confirmed true, so a
      // dayscholar never sees it and a hostel resident just sees it appear
      // a beat late on a retry rather than a wrong/stale value now.
      .catch(() => set({ hostel: FAILED }));

    getMyBorrowRecords("borrowed")
      .then((rows) => set({ library: { value: `${rows.length}`, subtitle: "issued", progress: 0, loading: false } }))
      .catch(() => set({ library: FAILED }));

    listMyFeedbackForms()
      .then((forms) => {
        const completed = forms.filter((f) => f.completed).length;
        set({
          feedback: { value: `${completed} / ${forms.length}`, subtitle: "completed", progress: 0, loading: false },
        });
      })
      .catch(() => set({ feedback: FAILED }));

    listMyAssignmentStatuses()
      .then((rows) => {
        const submitted = rows.filter((r) => r.is_submitted).length;
        set({ noDue: { value: `${submitted} / ${rows.length}`, subtitle: "submitted", progress: 0, loading: false } });
      })
      .catch(() => set({ noDue: FAILED }));

    getMyAppointments()
      .then((rows) => {
        const upcoming = rows.filter((a) => a.status === "pending" || a.status === "approved").length;
        set({ medical: { value: String(upcoming), subtitle: "upcoming", progress: 0, loading: false } });
      })
      .catch(() => set({ medical: FAILED }));

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
