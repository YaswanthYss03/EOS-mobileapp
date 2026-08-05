export type SopRequestStatus = "pending" | "forwarded" | "returned";

export type SopRequest = {
  id: string;
  serviceType: string;
  location: string;
  units: string;
  neededBy: string;
  complaintDetails: string;
  ref: string;
  raisedOn: string;
  status: SopRequestStatus;
};

// TODO: replace with a real call once a facilities backend endpoint exists.
export const sopServiceTypes = [
  "AC repair",
  "Fan",
  "Light",
  "Electrical",
  "Plumbing",
  "Projector",
  "Furniture",
  "Network",
  "Housekeeping",
];

export const mockSopHistory: SopRequest[] = [
  {
    id: "1",
    serviceType: "AC repair",
    location: "Server room · Block C, second floor",
    units: "6",
    neededBy: "10 Aug 2026",
    complaintDetails: "Two ACs not cooling, gas top-up needed before the semester exams.",
    ref: "SOP/CSE/2026/014",
    raisedOn: "27 Jul 2026",
    status: "pending",
  },
  {
    id: "2",
    serviceType: "Housekeeping",
    location: "Seminar Hall - Block A",
    units: "1",
    neededBy: "05 Aug 2026",
    complaintDetails: "Deep cleaning required before the guest lecture.",
    ref: "SOP/CSE/2026/013",
    raisedOn: "25 Jul 2026",
    status: "forwarded",
  },
];
