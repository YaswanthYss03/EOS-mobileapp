export type TrainingProgramme = {
  id: string;
  title: string;
  conductedBy: string;
  schedule: string;
  status: string;
  completedSessions: number;
  totalSessions: number;
};

// TODO: view-only - replace mockTraining with a real call once the placement backend endpoint exists
export const mockTraining: TrainingProgramme[] = [
  {
    id: "1",
    title: "Aptitude & logical reasoning",
    conductedBy: "CoCubes trainers",
    schedule: "Mon & Wed · 3:30 PM",
    status: "Ongoing",
    completedSessions: 14,
    totalSessions: 20,
  },
  {
    id: "2",
    title: "Advanced DSA bootcamp",
    conductedBy: "Dr. K. Ramesh",
    schedule: "Sat · full day",
    status: "Ongoing",
    completedSessions: 6,
    totalSessions: 12,
  },
  {
    id: "3",
    title: "Communication & GD practice",
    conductedBy: "English dept.",
    schedule: "Fri · 2:00 PM",
    status: "Scheduled",
    completedSessions: 0,
    totalSessions: 8,
  },
  {
    id: "4",
    title: "Mock interviews · panel round",
    conductedBy: "Industry mentors",
    schedule: "21-23 Aug",
    status: "Planned",
    completedSessions: 0,
    totalSessions: 3,
  },
];
