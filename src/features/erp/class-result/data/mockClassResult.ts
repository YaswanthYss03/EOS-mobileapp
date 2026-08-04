export type ClassResultStudent = {
  id: string;
  name: string;
  rollNo: string;
  className: string;
  attendancePercent: number;
  cgpa: number;
  arrears: number;
  mentor: string;
  guardian: string;
  contact: string;
};

// TODO: replace with a real call once a results backend endpoint exists.
export const classInfo = {
  departmentName: "Computer Science & Engineering",
  sectionCount: 9,
};

export const mockClassResultStudents: ClassResultStudent[] = [
  {
    id: "1",
    name: "Arun Prasad K",
    rollNo: "21CSE005",
    className: "III CSE-B",
    attendancePercent: 92,
    cgpa: 8.64,
    arrears: 0,
    mentor: "Aishwarya R",
    guardian: "Prasad K (Father)",
    contact: "+91 98430 21145",
  },
  {
    id: "2",
    name: "Divya Bharathi M",
    rollNo: "21CSE011",
    className: "III CSE-A",
    attendancePercent: 88,
    cgpa: 9.12,
    arrears: 0,
    mentor: "Dr. K. Ramesh",
    guardian: "Bharathi M (Mother)",
    contact: "+91 98765 43210",
  },
  {
    id: "3",
    name: "Harish Kumar V",
    rollNo: "21CSE028",
    className: "III CSE-A",
    attendancePercent: 76,
    cgpa: 7.58,
    arrears: 1,
    mentor: "Dr. K. Ramesh",
    guardian: "Kumar V (Father)",
    contact: "+91 90123 45678",
  },
  {
    id: "4",
    name: "Kavin Raj S",
    rollNo: "21CSE042",
    className: "III CSE-A",
    attendancePercent: 81,
    cgpa: 7.95,
    arrears: 0,
    mentor: "Mrs. P. Divya",
    guardian: "Raj S (Father)",
    contact: "+91 91234 56789",
  },
  {
    id: "5",
    name: "Meenakshi S",
    rollNo: "21CSE048",
    className: "III CSE-B",
    attendancePercent: 94,
    cgpa: 9.30,
    arrears: 0,
    mentor: "Aishwarya R",
    guardian: "S Meenakshi (Mother)",
    contact: "+91 99887 76655",
  },
  {
    id: "6",
    name: "Sanjay Kumar R",
    rollNo: "21CSE062",
    className: "III CSE-A",
    attendancePercent: 69,
    cgpa: 6.87,
    arrears: 2,
    mentor: "Dr. K. Ramesh",
    guardian: "Kumar R (Father)",
    contact: "+91 93456 78901",
  },
];
