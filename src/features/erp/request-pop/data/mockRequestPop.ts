export type PopRequestStatus = "pending" | "forwarded" | "returned";

export type PopRequest = {
  id: string;
  itemRequired: string;
  specification: string;
  quantity: string;
  neededBy: string;
  justification: string;
  ref: string;
  raisedOn: string;
  status: PopRequestStatus;
};

// TODO: replace with a real call once a procurement backend endpoint exists.
// This is the secretary's own raised requests - see erp/pop-sop for the
// HoD's approval view of the same kind of workflow (separate mock data,
// same narrative, no shared backend yet to sync them).
export const mockPopHistory: PopRequest[] = [
  {
    id: "1",
    itemRequired: "GPU workstation for the AI lab",
    specification: "RTX-class GPU, 64 GB RAM, 2TB SSD",
    quantity: "2 units",
    neededBy: "20 Aug 2026",
    justification: "Deep-learning workloads for the final-year project batch.",
    ref: "POP/CSE/2026/041",
    raisedOn: "30 Jul 2026",
    status: "pending",
  },
  {
    id: "2",
    itemRequired: "Networking kits — CN lab",
    specification: "Managed router + patch panel kit",
    quantity: "12 kits",
    neededBy: "18 Aug 2026",
    justification: "Replacement of faulty routers and patch panels.",
    ref: "POP/CSE/2026/042",
    raisedOn: "31 Jul 2026",
    status: "pending",
  },
];
