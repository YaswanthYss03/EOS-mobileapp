export type CiaStudent = {
  id: string;
  name: string;
  rollNo: string;
};

// TODO: replace with a real call once a CIA-marks backend endpoint exists.
export const classInfo = {
  className: "III CSE-A",
  subjectCode: "CS8792",
  subjectName: "Cryptography",
  studentCount: 64,
  maxMarks: 50,
};

export const mockCiaStudents: CiaStudent[] = [
  { id: "1", name: "Arun Prasad K", rollNo: "21CSE005" },
  { id: "2", name: "Divya Bharathi M", rollNo: "21CSE011" },
  { id: "3", name: "Harish Kumar V", rollNo: "21CSE028" },
  { id: "4", name: "Kavin Raj S", rollNo: "21CSE042" },
  { id: "5", name: "Meenakshi S", rollNo: "21CSE048" },
  { id: "6", name: "Nithya Sri R", rollNo: "21CSE055" },
  { id: "7", name: "Praveen Raj T", rollNo: "21CSE058" },
  { id: "8", name: "Sanjay Kumar R", rollNo: "21CSE062" },
  { id: "9", name: "Swetha Lakshmi V", rollNo: "21CSE071" },
  { id: "10", name: "Vignesh Balaji R", rollNo: "21CSE084" },
];
