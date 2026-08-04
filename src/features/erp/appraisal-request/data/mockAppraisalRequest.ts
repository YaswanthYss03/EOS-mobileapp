export type AppraisalFieldConfig = {
  key: string;
  label: string;
  placeholder: string;
};

export type AppraisalCategoryConfig = {
  id: string;
  title: string;
  subtitle: string;
  entryLabel: string;
  fields: AppraisalFieldConfig[];
};

export type AppraisalHistoryStatus = "pending" | "approved" | "returned";

export type AppraisalHistoryEntry = {
  id: string;
  cycleLabel: string;
  submittedOn: string;
  score?: number;
  status: AppraisalHistoryStatus;
};

// TODO: replace with a real call once an appraisal backend endpoint exists.
export const cycleInfo = {
  label: "Cycle 2025 - 26",
  closesOn: "31 Aug",
};

export const appraisalCategories: AppraisalCategoryConfig[] = [
  {
    id: "subject-handling",
    title: "Subject Handling",
    subtitle: "Courses taught this cycle",
    entryLabel: "Subject",
    fields: [
      { key: "subject", label: "Subjects Handled", placeholder: "e.g. CS8792 Cryptography & Network Security" },
      { key: "semester", label: "Semester", placeholder: "e.g. VI" },
      { key: "year", label: "Academic Year", placeholder: "2025 - 2026" },
    ],
  },
  {
    id: "student-projects",
    title: "Student Projects",
    subtitle: "Guided project work",
    entryLabel: "Project",
    fields: [
      { key: "title", label: "Project Title", placeholder: "e.g. Smart Attendance System" },
      { key: "students", label: "Students Involved", placeholder: "e.g. 4 final-year students" },
      { key: "outcome", label: "Outcome", placeholder: "e.g. Presented at Smart India Hackathon" },
    ],
  },
  {
    id: "faculty-mentorship",
    title: "Faculty Mentorship",
    subtitle: "Students mentored & outcomes",
    entryLabel: "Mentee",
    fields: [
      { key: "mentee", label: "Mentee Name", placeholder: "e.g. Kavin Raj S" },
      { key: "focus", label: "Focus Area", placeholder: "e.g. Career guidance" },
      { key: "outcome", label: "Outcome", placeholder: "e.g. Placed at Microsoft" },
    ],
  },
  {
    id: "online-courses",
    title: "Online Courses",
    subtitle: "NPTEL · Coursera · Udemy · edX",
    entryLabel: "Course",
    fields: [
      { key: "course", label: "Course Name", placeholder: "e.g. Deep Learning Specialization" },
      { key: "platform", label: "Platform", placeholder: "e.g. Coursera" },
      { key: "completed", label: "Completed On", placeholder: "e.g. June 2026" },
    ],
  },
  {
    id: "research-publications",
    title: "Research Publications",
    subtitle: "Journals & conferences",
    entryLabel: "Publication",
    fields: [
      { key: "title", label: "Title", placeholder: "e.g. A Survey on Federated Learning" },
      { key: "venue", label: "Journal / Conference", placeholder: "e.g. IEEE ICACCS 2026" },
      { key: "year", label: "Year", placeholder: "e.g. 2026" },
    ],
  },
  {
    id: "additional-achievements",
    title: "Additional Achievements",
    subtitle: "Awards, FDP, patents, book chapters",
    entryLabel: "Achievement",
    fields: [
      { key: "description", label: "Description", placeholder: "e.g. Best Paper Award" },
      { key: "type", label: "Type", placeholder: "e.g. Award / FDP / Patent / Book Chapter" },
    ],
  },
];

export const mockAppraisalHistory: AppraisalHistoryEntry[] = [
  {
    id: "1",
    cycleLabel: "Cycle 2024 - 25",
    submittedOn: "28 Aug 2025",
    score: 85,
    status: "approved",
  },
  {
    id: "2",
    cycleLabel: "Cycle 2023 - 24",
    submittedOn: "30 Aug 2024",
    score: 79,
    status: "approved",
  },
];
