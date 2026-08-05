export type SubjectClearance = {
  code: string;
  name: string;
  a1: boolean;
  a2: boolean;
  a3: boolean;
  record: boolean;
};

// TODO: replace with a real call once a no-due/clearance backend endpoint exists.
export const mockSubjectClearance: SubjectClearance[] = [
  { code: "CS601", name: "Compiler Design", a1: true, a2: true, a3: true, record: true },
  { code: "CS602", name: "Machine Learning", a1: true, a2: true, a3: false, record: true },
  { code: "CS603", name: "Computer Networks", a1: true, a2: false, a3: false, record: true },
  { code: "CS604", name: "Cloud Computing", a1: true, a2: true, a3: true, record: false },
  { code: "HS401", name: "Professional Ethics", a1: true, a2: true, a3: false, record: true },
];
