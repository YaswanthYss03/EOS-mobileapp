export type AttendanceStatus = "present" | "absent" | "onduty";

export type StudentRow = {
  id: string;
  name: string;
  rollNo: string;
};

// TODO: replace with a real call once an attendance backend endpoint exists.
export const classInfo = {
  headerMonth: "July 2026",
  date: "31 July 2026",
  className: "CSE-A",
  subjectCode: "CS8792",
  subjectName: "Cryptography",
  period: "Period 1 · 09:00 – 09:50",
};

export const mockStudents: StudentRow[] = [
  { id: "1", name: "Aarthi Balasubramanian", rollNo: "21CS0001" },
  { id: "2", name: "Adhithya Narayanan", rollNo: "21CS0002" },
  { id: "3", name: "Bhavana Sridhar", rollNo: "21CS0003" },
  { id: "4", name: "Deepak Raj Kumar", rollNo: "21CS0004" },
  { id: "5", name: "Divya Priyadarshini", rollNo: "21CS0005" },
  { id: "6", name: "Gokul Krishnan M", rollNo: "21CS0006" },
  { id: "7", name: "Harini Venkatesh", rollNo: "21CS0007" },
  { id: "8", name: "Hariharan Muthu", rollNo: "21CS0008" },
  { id: "9", name: "Ishwarya Ramesh", rollNo: "21CS0009" },
  { id: "10", name: "Jayaram Subramanian", rollNo: "21CS0010" },
  { id: "11", name: "Kavya Lakshmanan", rollNo: "21CS0011" },
  { id: "12", name: "Lokesh Prabhakaran", rollNo: "21CS0012" },
  { id: "13", name: "Meenakshi Sundaram", rollNo: "21CS0013" },
  { id: "14", name: "Naveen Kumaresan", rollNo: "21CS0014" },
  { id: "15", name: "Pavithra Chandrasekar", rollNo: "21CS0015" },
  { id: "16", name: "Rajesh Venkataraman", rollNo: "21CS0016" },
  { id: "17", name: "Sanjana Krishnamurthy", rollNo: "21CS0017" },
  { id: "18", name: "Tarun Balakrishnan", rollNo: "21CS0018" },
  { id: "19", name: "Uma Maheswari", rollNo: "21CS0019" },
  { id: "20", name: "Vishnu Vardhan", rollNo: "21CS0020" },
];
