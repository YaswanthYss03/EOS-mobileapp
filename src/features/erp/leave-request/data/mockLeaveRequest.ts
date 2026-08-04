export type MyLeaveStatus = "pending" | "approved" | "rejected";

export type MyLeaveRequest = {
  id: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: MyLeaveStatus;
  appliedOn: string;
};

// TODO: replace with a real call once a leave-management backend endpoint exists.
export const leaveBalance = {
  taken: 9,
  remaining: 26,
};

export const leaveTypes = ["Casual Leave", "Sick Leave", "On Duty", "Compensatory Off"];

export const mockLeaveHistory: MyLeaveRequest[] = [
  {
    id: "1",
    leaveType: "Casual Leave",
    fromDate: "10 Jul 2026",
    toDate: "10 Jul 2026",
    days: 1,
    reason: "Personal work at the registrar's office.",
    status: "approved",
    appliedOn: "08 Jul 2026",
  },
  {
    id: "2",
    leaveType: "Sick Leave",
    fromDate: "18 Jun 2026",
    toDate: "19 Jun 2026",
    days: 2,
    reason: "Viral fever, medical certificate attached.",
    status: "approved",
    appliedOn: "18 Jun 2026",
  },
  {
    id: "3",
    leaveType: "Casual Leave",
    fromDate: "02 May 2026",
    toDate: "02 May 2026",
    days: 1,
    reason: "Family function.",
    status: "rejected",
    appliedOn: "28 Apr 2026",
  },
  {
    id: "4",
    leaveType: "On Duty",
    fromDate: "05 Aug 2026",
    toDate: "05 Aug 2026",
    days: 1,
    reason: "FDP on Generative AI at IIT Madras.",
    status: "pending",
    appliedOn: "30 Jul 2026",
  },
];
