export type BulkAttendanceStatus = "present" | "absent" | "onduty";

export type BulkAttendanceStudent = {
  id: string;
  name: string;
  rollNo: string;
  className: string;
  markedStatus: BulkAttendanceStatus;
};

export type RecentCorrection = {
  id: string;
  label: string;
  date: string;
  count: string;
};

// TODO: replace with a real call once a bulk-attendance-correction backend endpoint exists.
export const sectionInfo = {
  label: "All sections",
  subtitle: "Whole department · 9 sections",
};

export const mockBulkAttendanceStudents: BulkAttendanceStudent[] = [
  { id: "1", name: "Arun Prasad K", rollNo: "22CSE005", className: "III CSE-A", markedStatus: "absent" },
  { id: "2", name: "Kavin Raj S", rollNo: "22CSE042", className: "III CSE-A", markedStatus: "absent" },
  { id: "3", name: "Meenakshi S", rollNo: "22CSE049", className: "III CSE-B", markedStatus: "absent" },
  { id: "4", name: "Swetha Lakshmi V", rollNo: "22CSE072", className: "III CSE-B", markedStatus: "absent" },
  { id: "5", name: "Vignesh Balaji R", rollNo: "22CSE084", className: "III CSE-A", markedStatus: "absent" },
  { id: "6", name: "Divya Bharathi M", rollNo: "22CSE011", className: "III CSE-A", markedStatus: "absent" },
];

export const mockRecentCorrections: RecentCorrection[] = [
  { id: "1", label: "III CSE-A · Forenoon", date: "31 Jul 2026", count: "64 students" },
  { id: "2", label: "CSE Faculty · Full day", date: "29 Jul 2026", count: "6 faculty" },
];
