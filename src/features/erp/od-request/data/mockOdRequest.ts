export type MyOdStatus = "pending" | "approved" | "rejected";

export type MyOdRequest = {
  id: string;
  odType: string;
  place: string;
  fromDate: string;
  toDate: string;
  days: number;
  purpose: string;
  status: MyOdStatus;
  appliedOn: string;
};

// TODO: replace with a real call once an on-duty backend endpoint exists.
export const odBalance = {
  availed: 6,
  remaining: 14,
};

export const odTypes = [
  "Conference / Seminar",
  "Industrial Visit",
  "Sports / Cultural Event",
  "Official Duty",
  "Workshop / FDP",
];

export const mockOdHistory: MyOdRequest[] = [
  {
    id: "1",
    odType: "Workshop / FDP",
    place: "IIT Madras",
    fromDate: "11 Aug 2026",
    toDate: "12 Aug 2026",
    days: 2,
    purpose: "FDP on Generative AI.",
    status: "pending",
    appliedOn: "30 Jul 2026",
  },
  {
    id: "2",
    odType: "Industrial Visit",
    place: "L&T Construction, Chennai",
    fromDate: "12 Jul 2026",
    toDate: "12 Jul 2026",
    days: 1,
    purpose: "Escorting final-year students on an industrial visit.",
    status: "approved",
    appliedOn: "08 Jul 2026",
  },
  {
    id: "3",
    odType: "Conference / Seminar",
    place: "Anna University, Chennai",
    fromDate: "05 Jun 2026",
    toDate: "05 Jun 2026",
    days: 1,
    purpose: "Presenting a paper at a national conference.",
    status: "approved",
    appliedOn: "28 May 2026",
  },
  {
    id: "4",
    odType: "Sports / Cultural Event",
    place: "NIT Trichy",
    fromDate: "20 May 2026",
    toDate: "20 May 2026",
    days: 1,
    purpose: "Accompanying the college sports team.",
    status: "rejected",
    appliedOn: "15 May 2026",
  },
];
