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

    getMyClassSection()
      .then((classSection) => set({ classSection }))
      .catch(() => {});

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

    getMyExamResults(semesterNumber(defaultSemester))
      .then((res) => {
        // Prefer the semester exam once it's published; otherwise fall back
        // to the most recent internal - same precedence a student would
        // read the Performance screen in (semester exam tab first).
        const latestInternal = res.internals[res.internals.length - 1] ?? null;
        const group = res.semester_exam ?? latestInternal;
        if (!group || group.marks_total <= 0) {
          set({ performance: { value: "–", subtitle: "No results yet", progress: 0, loading: false } });
          return;
        }
        const pct = (group.marks_obtained / group.marks_total) * 100;
        set({
          performance: {
            value: `${pct.toFixed(1)}%`,
            subtitle: group.title,
            progress: pct / 100,
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
          hostel: {
            value: room.is_hostel_resident ? room.room_number ?? "Allotted" : "Not allotted",
            subtitle: room.hostel_name ?? "",
            progress: 0,
            loading: false,
          },
        });
      })
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
