export type PopSopType = "pop" | "sop";
export type PopSopStatus = "pending" | "forwarded" | "returned";
export type PopSopStage = "secretary" | "hod" | "finance";

export type PopSopOrder = {
  id: string;
  type: PopSopType;
  title: string;
  ref: string;
  raisedOn: string;
  raisedBy: string;
  raisedByRole: string;
  specification: string;
  quantity: string;
  neededBy: string;
  justification: string;
  budgetHead: string;
  indicativeCost: number;
  status: PopSopStatus;
  currentStage: PopSopStage;
};

// TODO: replace with a real call once a procurement backend endpoint exists.
export const deptInfo = {
  label: "CSE DEPT",
};

export const mockOrders: PopSopOrder[] = [
  {
    id: "1",
    type: "pop",
    title: "GPU workstation for the AI lab",
    ref: "POP/CSE/2026/041",
    raisedOn: "30 Jul 2026",
    raisedBy: "Mrs. G. Sudha",
    raisedByRole: "Dept Secretary",
    specification: "RTX-class GPU, 64 GB RAM, 2TB SSD",
    quantity: "2 units",
    neededBy: "20 Aug 2026",
    justification: "Deep-learning workloads for the final-year project batch.",
    budgetHead: "Lab equipment · Plan fund",
    indicativeCost: 486000,
    status: "pending",
    currentStage: "hod",
  },
  {
    id: "2",
    type: "pop",
    title: "Networking kits — CN lab",
    ref: "POP/CSE/2026/042",
    raisedOn: "31 Jul 2026",
    raisedBy: "Mrs. G. Sudha",
    raisedByRole: "Dept Secretary",
    specification: "Managed router + patch panel kit",
    quantity: "12 kits",
    neededBy: "18 Aug 2026",
    justification: "Replacement of faulty routers and patch panels.",
    budgetHead: "Consumables",
    indicativeCost: 96500,
    status: "pending",
    currentStage: "hod",
  },
  {
    id: "3",
    type: "pop",
    title: "3D printer for Mech-CSE joint lab",
    ref: "POP/CSE/2026/037",
    raisedOn: "22 Jul 2026",
    raisedBy: "Mrs. G. Sudha",
    raisedByRole: "Dept Secretary",
    specification: "FDM 3D printer, 300x300x400mm build volume",
    quantity: "1 unit",
    neededBy: "15 Aug 2026",
    justification: "Rapid prototyping for the joint capstone project.",
    budgetHead: "Lab equipment · Plan fund",
    indicativeCost: 168000,
    status: "forwarded",
    currentStage: "finance",
  },
  {
    id: "4",
    type: "pop",
    title: "Laptops for placement cell",
    ref: "POP/CSE/2026/029",
    raisedOn: "10 Jul 2026",
    raisedBy: "Mrs. G. Sudha",
    raisedByRole: "Dept Secretary",
    specification: "i5, 16GB RAM, 512GB SSD",
    quantity: "5 units",
    neededBy: "05 Aug 2026",
    justification: "Existing placement-cell laptops are out of warranty.",
    budgetHead: "Placement cell fund",
    indicativeCost: 275000,
    status: "returned",
    currentStage: "secretary",
  },
  {
    id: "5",
    type: "sop",
    title: "AMC for lab air conditioners",
    ref: "SOP/CSE/2026/014",
    raisedOn: "27 Jul 2026",
    raisedBy: "Mrs. G. Sudha",
    raisedByRole: "Dept Secretary",
    specification: "Annual maintenance contract, 8 split units",
    quantity: "1 contract",
    neededBy: "01 Sep 2026",
    justification: "Current AMC expires end of August.",
    budgetHead: "Facilities · Recurring",
    indicativeCost: 120000,
    status: "pending",
    currentStage: "hod",
  },
  {
    id: "6",
    type: "sop",
    title: "Annual pest control service",
    ref: "SOP/CSE/2026/009",
    raisedOn: "12 Jul 2026",
    raisedBy: "Mrs. G. Sudha",
    raisedByRole: "Dept Secretary",
    specification: "Whole-block pest control, quarterly visits",
    quantity: "1 contract",
    neededBy: "20 Aug 2026",
    justification: "Renewal of existing pest control service.",
    budgetHead: "Facilities · Recurring",
    indicativeCost: 18000,
    status: "forwarded",
    currentStage: "finance",
  },
];
