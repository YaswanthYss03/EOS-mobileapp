export type Subject = {
  id: string;
  code: string;
  name: string;
  room: string;
  section: string;
  materials: number;
  tasks: number;
  hoursPerWeek: number;
};

// TODO: view-only - replace mockSubjects with a real call once the academics backend endpoint exists
export const mockSubjects: Subject[] = [
  {
    id: "1",
    code: "CS6501",
    name: "Compiler Design",
    room: "Room 402",
    section: "III CSE-A",
    materials: 4,
    tasks: 2,
    hoursPerWeek: 4,
  },
  {
    id: "2",
    code: "CS6502",
    name: "Machine Learning",
    room: "Room 405",
    section: "III CSE-B",
    materials: 4,
    tasks: 2,
    hoursPerWeek: 4,
  },
  {
    id: "3",
    code: "CS6503",
    name: "Cloud Computing",
    room: "Room 402",
    section: "III CSE-A",
    materials: 3,
    tasks: 1,
    hoursPerWeek: 3,
  },
  {
    id: "4",
    code: "CS6511",
    name: "Machine Learning Laboratory",
    room: "Lab 3",
    section: "III CSE-C",
    materials: 3,
    tasks: 1,
    hoursPerWeek: 4,
  },
];
