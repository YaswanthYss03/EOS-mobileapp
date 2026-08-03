export type LessonPlanSubject = {
  id: string;
  subject: string;
  faculty: string;
  unitsCompleted: number;
  totalUnits: number;
  lastTopic: string;
};

export const mockLessonPlans: LessonPlanSubject[] = [
  {
    id: "ds",
    subject: "Data Structures",
    faculty: "Dr. Meera",
    unitsCompleted: 3,
    totalUnits: 5,
    lastTopic: "Binary Search Trees",
  },
  {
    id: "os",
    subject: "Operating Systems",
    faculty: "Prof. Anand",
    unitsCompleted: 4,
    totalUnits: 5,
    lastTopic: "Deadlock Avoidance",
  },
  {
    id: "dbms",
    subject: "Database Systems",
    faculty: "Dr. Kavitha",
    unitsCompleted: 2,
    totalUnits: 5,
    lastTopic: "Normalization (3NF)",
  },
  {
    id: "cn",
    subject: "Computer Networks",
    faculty: "Dr. Ilango",
    unitsCompleted: 3,
    totalUnits: 5,
    lastTopic: "TCP Congestion Control",
  },
  {
    id: "maths3",
    subject: "Mathematics III",
    faculty: "Prof. Suresh",
    unitsCompleted: 5,
    totalUnits: 5,
    lastTopic: "Laplace Transforms",
  },
];
