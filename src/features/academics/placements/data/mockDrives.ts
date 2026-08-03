export type Drive = {
  id: string;
  company: string;
  role: string;
  package: string;
  driveDate: string;
  eligibility: string;
};

export const mockDrives: Drive[] = [
  {
    id: "1",
    company: "TCS",
    role: "Ninja / Digital",
    package: "₹7 LPA",
    driveDate: "5 Aug 2026",
    eligibility: "CGPA ≥ 6.5, no active backlogs",
  },
  {
    id: "2",
    company: "Zoho",
    role: "Member Technical Staff",
    package: "₹9 LPA",
    driveDate: "12 Aug 2026",
    eligibility: "CGPA ≥ 7.0, CSE/IT only",
  },
  {
    id: "3",
    company: "Amazon",
    role: "SDE Intern",
    package: "₹20 LPA",
    driveDate: "20 Aug 2026",
    eligibility: "CGPA ≥ 7.5, no active backlogs",
  },
  {
    id: "4",
    company: "Deloitte",
    role: "Analyst",
    package: "₹9 LPA",
    driveDate: "28 Aug 2026",
    eligibility: "CGPA ≥ 6.5, all branches",
  },
];
