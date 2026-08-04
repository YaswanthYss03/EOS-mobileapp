export type BatchRecord = {
  id: string;
  year: number;
  placementRate: number;
  drives: number;
  placed: number;
  avgCtc: string;
  topOfferCompany: string;
  topOfferPackage: string;
};

// TODO: view-only - replace mockBatchHistory with a real call once the placement backend endpoint exists
export const mockBatchHistory: BatchRecord[] = [
  {
    id: "1",
    year: 2025,
    placementRate: 82,
    drives: 19,
    placed: 128,
    avgCtc: "₹6.4 LPA",
    topOfferCompany: "Freshworks",
    topOfferPackage: "₹14.0 LPA",
  },
  {
    id: "2",
    year: 2024,
    placementRate: 76,
    drives: 16,
    placed: 117,
    avgCtc: "₹5.8 LPA",
    topOfferCompany: "Zoho",
    topOfferPackage: "₹11.5 LPA",
  },
  {
    id: "3",
    year: 2023,
    placementRate: 71,
    drives: 14,
    placed: 103,
    avgCtc: "₹5.1 LPA",
    topOfferCompany: "TCS Digital",
    topOfferPackage: "₹9.0 LPA",
  },
];
