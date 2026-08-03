export type LmsSubject = {
  id: string;
  subject: string;
  faculty: string;
  notesCount: number;
};

export type LmsNote = {
  id: string;
  title: string;
  uploadedOn: string;
  fileType: "pdf" | "doc" | "ppt";
};

export const mockLmsSubjects: LmsSubject[] = [
  { id: "ds", subject: "Data Structures", faculty: "Dr. Meera", notesCount: 4 },
  { id: "os", subject: "Operating Systems", faculty: "Prof. Anand", notesCount: 3 },
  { id: "dbms", subject: "Database Systems", faculty: "Dr. Kavitha", notesCount: 5 },
  { id: "cn", subject: "Computer Networks", faculty: "Dr. Ilango", notesCount: 2 },
  { id: "maths3", subject: "Mathematics III", faculty: "Prof. Suresh", notesCount: 3 },
];

export const mockLmsNotes: Record<string, LmsNote[]> = {
  ds: [
    { id: "1", title: "Unit 1 - Arrays & Linked Lists", uploadedOn: "12 Jun", fileType: "pdf" },
    { id: "2", title: "Unit 2 - Stacks & Queues", uploadedOn: "20 Jun", fileType: "pdf" },
    { id: "3", title: "Unit 3 - Trees & BSTs", uploadedOn: "10 Jul", fileType: "ppt" },
    { id: "4", title: "Lab Manual", uploadedOn: "15 Jul", fileType: "doc" },
  ],
  os: [
    { id: "1", title: "Unit 1 - Process Management", uploadedOn: "14 Jun", fileType: "pdf" },
    { id: "2", title: "Unit 2 - CPU Scheduling", uploadedOn: "25 Jun", fileType: "pdf" },
    { id: "3", title: "Unit 3 - Deadlocks", uploadedOn: "18 Jul", fileType: "ppt" },
  ],
  dbms: [
    { id: "1", title: "Unit 1 - ER Model", uploadedOn: "10 Jun", fileType: "pdf" },
    { id: "2", title: "Unit 2 - Relational Algebra", uploadedOn: "17 Jun", fileType: "pdf" },
    { id: "3", title: "Unit 3 - Normalization", uploadedOn: "5 Jul", fileType: "ppt" },
    { id: "4", title: "Unit 4 - Transactions", uploadedOn: "20 Jul", fileType: "pdf" },
    { id: "5", title: "Lab Manual", uploadedOn: "22 Jul", fileType: "doc" },
  ],
  cn: [
    { id: "1", title: "Unit 1 - OSI Model", uploadedOn: "13 Jun", fileType: "pdf" },
    { id: "2", title: "Unit 2 - TCP/IP", uploadedOn: "22 Jun", fileType: "ppt" },
  ],
  maths3: [
    { id: "1", title: "Unit 1 - Fourier Series", uploadedOn: "11 Jun", fileType: "pdf" },
    { id: "2", title: "Unit 2 - Laplace Transforms", uploadedOn: "19 Jun", fileType: "pdf" },
    { id: "3", title: "Problem Set 3", uploadedOn: "28 Jun", fileType: "doc" },
  ],
};
