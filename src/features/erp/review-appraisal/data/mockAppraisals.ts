export type AppraisalStatus = "pending" | "approved" | "returned";

export type FacultyAppraisal = {
  id: string;
  name: string;
  empId: string;
  designation: string;
  ref: string;
  submittedOn: string;
  score: number;
  publications: number;
  projects: number;
  courses: number;
  status: AppraisalStatus;
};

// TODO: replace with a real call once an appraisal backend endpoint exists.
export const cycleInfo = {
  label: "CSE faculty · cycle 2025 - 2026",
};

export const mockAppraisals: FacultyAppraisal[] = [
  {
    id: "1",
    name: "Dr. K. Ramesh",
    empId: "EMP-CSE-1108",
    designation: "Associate Professor",
    ref: "APR-2026-08",
    submittedOn: "28 Jul 2026",
    score: 88,
    publications: 4,
    projects: 3,
    courses: 2,
    status: "pending",
  },
  {
    id: "2",
    name: "Mrs. P. Divya",
    empId: "EMP-CSE-1421",
    designation: "Assistant Professor",
    ref: "APR-2026-11",
    submittedOn: "29 Jul 2026",
    score: 81,
    publications: 2,
    projects: 5,
    courses: 4,
    status: "pending",
  },
  {
    id: "3",
    name: "Mr. S. Karthik",
    empId: "EMP-CSE-1533",
    designation: "Assistant Professor",
    ref: "APR-2026-12",
    submittedOn: "30 Jul 2026",
    score: 74,
    publications: 1,
    projects: 2,
    courses: 6,
    status: "pending",
  },
  {
    id: "4",
    name: "Dr. R. Meenakshi",
    empId: "EMP-CSE-0925",
    designation: "Professor",
    ref: "APR-2026-05",
    submittedOn: "20 Jul 2026",
    score: 92,
    publications: 6,
    projects: 4,
    courses: 3,
    status: "approved",
  },
  {
    id: "5",
    name: "Mr. V. Arunkumar",
    empId: "EMP-CSE-1687",
    designation: "Assistant Professor",
    ref: "APR-2026-14",
    submittedOn: "15 Jul 2026",
    score: 85,
    publications: 3,
    projects: 3,
    courses: 5,
    status: "approved",
  },
  {
    id: "6",
    name: "Ms. T. Sowmya",
    empId: "EMP-CSE-1802",
    designation: "Assistant Professor",
    ref: "APR-2026-16",
    submittedOn: "10 Jul 2026",
    score: 58,
    publications: 0,
    projects: 1,
    courses: 3,
    status: "returned",
  },
];
