export type RoundStatus = "cleared" | "rejected" | "pending";

export type Round = {
  name: string;
  status: RoundStatus;
};

export type PlacementRecord = {
  id: string;
  company: string;
  role: string;
  appliedOn: string;
  rounds: Round[];
};

export const mockHistory: PlacementRecord[] = [
  {
    id: "1",
    company: "Zoho",
    role: "Member Technical Staff",
    appliedOn: "2 Jul 2026",
    rounds: [
      { name: "R1 - Aptitude", status: "cleared" },
      { name: "R2 - Technical", status: "cleared" },
      { name: "R3 - HR", status: "pending" },
    ],
  },
  {
    id: "2",
    company: "TCS",
    role: "Ninja / Digital",
    appliedOn: "18 Jun 2026",
    rounds: [
      { name: "R1 - Aptitude", status: "cleared" },
      { name: "R2 - Technical", status: "pending" },
    ],
  },
  {
    id: "3",
    company: "Cognizant",
    role: "GenC",
    appliedOn: "10 Jun 2026",
    rounds: [
      { name: "R1 - Aptitude", status: "rejected" },
    ],
  },
];
