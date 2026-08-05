export type LeaveHistoryStatus = "pending" | "approved" | "rejected";

export type LeaveHistoryItem = {
  id: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: LeaveHistoryStatus;
};

// TODO: replace with a real call once a leave backend endpoint exists.
export const mockLeaveHistory: LeaveHistoryItem[] = [
  { id: "1", fromDate: "12 Aug 2026", toDate: "12 Aug 2026", days: 1, status: "approved" },
  { id: "2", fromDate: "02 Jul 2026", toDate: "04 Jul 2026", days: 3, status: "approved" },
  { id: "3", fromDate: "19 Jun 2026", toDate: "19 Jun 2026", days: 1, status: "rejected" },
  { id: "4", fromDate: "28 May 2026", toDate: "30 May 2026", days: 3, status: "approved" },
];
