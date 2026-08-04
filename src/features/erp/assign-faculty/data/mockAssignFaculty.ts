export type Subject = {
  id: string;
  name: string;
  code: string;
  className: string;
  assignedFacultyId: string | null;
};

export type FacultyOption = {
  id: string;
  name: string;
};

// TODO: replace with a real call once a faculty-assignment backend endpoint exists.
export const classInfo = {
  className: "III CSE-A",
  studentCount: 64,
  advisorName: "Dr. K. Ramesh",
};

export const mockFacultyOptions: FacultyOption[] = [
  { id: "f1", name: "Dr. K. Ramesh" },
  { id: "f2", name: "Mrs. P. Divya" },
  { id: "f3", name: "Mr. S. Karthik" },
  { id: "f4", name: "Dr. R. Meenakshi" },
  { id: "f5", name: "Mr. V. Arunkumar" },
  { id: "f6", name: "Ms. T. Sowmya" },
  { id: "f7", name: "Aishwarya R" },
];

export const mockSubjects: Subject[] = [
  {
    id: "s1",
    name: "Cryptography & Network Security",
    code: "CS8792",
    className: "III CSE-A",
    assignedFacultyId: "f1",
  },
  {
    id: "s2",
    name: "Cloud Computing",
    code: "CS8791",
    className: "III CSE-A",
    assignedFacultyId: "f2",
  },
  {
    id: "s3",
    name: "Machine Learning",
    code: "CS8751",
    className: "III CSE-A",
    assignedFacultyId: "f7",
  },
  {
    id: "s4",
    name: "Compiler Design",
    code: "CS8071",
    className: "III CSE-A",
    assignedFacultyId: null,
  },
];
