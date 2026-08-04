export type Drive = {
  id: string;
  company: string;
  initials: string;
  role: string;
  package: string;
  status: string;
  driveDate: string;
  mode: string;
  minCgpa: string;
  arrearsRule: string;
  eligible: number;
  applied: number;
  selected: number | null;
  rounds: string;
};

// TODO: view-only - replace mockDrives with a real call once the placement backend endpoint exists
export const mockDrives: Drive[] = [
  {
    id: "1",
    company: "Zoho Corporation",
    initials: "ZS",
    role: "Member Technical Staff",
    package: "₹7.2 LPA",
    status: "Registration open",
    driveDate: "11 Aug 2026",
    mode: "On campus",
    minCgpa: "CGPA ≥ 7.0",
    arrearsRule: "No standing arrears",
    eligible: 86,
    applied: 61,
    selected: null,
    rounds: "aptitude → 2 coding → HR",
  },
  {
    id: "2",
    company: "TCS Digital",
    initials: "TC",
    role: "Systems Engineer",
    package: "₹9.0 LPA",
    status: "Shortlist out",
    driveDate: "05 Aug 2026",
    mode: "Hybrid",
    minCgpa: "CGPA ≥ 6.5",
    arrearsRule: "Max 1 arrear",
    eligible: 112,
    applied: 104,
    selected: 18,
    rounds: "aptitude → coding → HR",
  },
  {
    id: "3",
    company: "Amazon",
    initials: "AZ",
    role: "SDE Intern",
    package: "₹20.0 LPA",
    status: "Registration open",
    driveDate: "20 Aug 2026",
    mode: "On campus",
    minCgpa: "CGPA ≥ 7.5",
    arrearsRule: "No standing arrears",
    eligible: 48,
    applied: 22,
    selected: null,
    rounds: "aptitude → 2 coding → 2 technical → HR",
  },
  {
    id: "4",
    company: "Deloitte",
    initials: "DL",
    role: "Analyst",
    package: "₹9.0 LPA",
    status: "Shortlist out",
    driveDate: "28 Aug 2026",
    mode: "Hybrid",
    minCgpa: "CGPA ≥ 6.5",
    arrearsRule: "No standing arrears",
    eligible: 96,
    applied: 70,
    selected: 11,
    rounds: "aptitude → group discussion → HR",
  },
];

// Page-level stats shown above the drive list - not derivable from mockDrives
// alone (they roll up the whole batch, not just currently-active drives).
export const placementStats = {
  studentsPlaced: 49,
  placementRate: 78,
  highestCtc: "₹12.0L",
};
