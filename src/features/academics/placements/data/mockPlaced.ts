export type PlacedStudent = {
  id: string;
  name: string;
  rollNo: string;
  section: string;
  cgpa: number;
  package: string;
  placedOn: string;
  company: string;
  role: string;
  status: string;
};

// TODO: view-only - replace mockPlaced with a real call once the placement backend endpoint exists
export const mockPlaced: PlacedStudent[] = [
  {
    id: "1",
    name: "A. Karthikeyan",
    rollNo: "21CS004",
    section: "CSE-A",
    cgpa: 8.9,
    package: "₹12.0 LPA",
    placedOn: "28 Jul",
    company: "Freshworks",
    role: "Software Engineer I",
    status: "Offer accepted",
  },
  {
    id: "2",
    name: "D. Sanjana",
    rollNo: "21CS019",
    section: "CSE-A",
    cgpa: 8.4,
    package: "₹9.0 LPA",
    placedOn: "26 Jul",
    company: "TCS Digital",
    role: "Systems Engineer",
    status: "Offer accepted",
  },
  {
    id: "3",
    name: "M. Rithanya",
    rollNo: "21CS041",
    section: "CSE-B",
    cgpa: 8.1,
    package: "₹7.2 LPA",
    placedOn: "22 Jul",
    company: "Zoho Corporation",
    role: "MTS",
    status: "Offer letter awaited",
  },
  {
    id: "4",
    name: "R. Bala Krishnan",
    rollNo: "21CS057",
    section: "CSE-B",
    cgpa: 7.8,
    package: "₹9.0 LPA",
    placedOn: "19 Jul",
    company: "Deloitte",
    role: "Analyst",
    status: "Offer accepted",
  },
  {
    id: "5",
    name: "S. Priyadharshini",
    rollNo: "21CS063",
    section: "CSE-C",
    cgpa: 8.6,
    package: "₹20.0 LPA",
    placedOn: "15 Jul",
    company: "Amazon",
    role: "SDE Intern",
    status: "Offer accepted",
  },
];
