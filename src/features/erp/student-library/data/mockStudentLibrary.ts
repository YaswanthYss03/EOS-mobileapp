export type BorrowedStatus = "due-soon" | "on-time" | "overdue";

export type BorrowedBook = {
  id: string;
  title: string;
  author: string;
  code: string;
  accNo: string;
  dueDate: string;
  status: BorrowedStatus;
  dueInDays?: number;
};

export type Ebook = {
  id: string;
  title: string;
  author: string;
  format: string;
  sizeMb: number;
  publisher: string;
  actionLabel: "Read online" | "Open portal";
};

export type CatalogueItem = {
  id: string;
  title: string;
  author: string;
  shelf: string;
  code: string;
  availability: string;
};

export type HistoryItem = {
  id: string;
  title: string;
  author: string;
  issuedOn: string;
  returnedOn: string;
  fine?: number;
};

// TODO: replace with a real call once a library backend endpoint exists.
export const maxBooksAllowed = 5;

export const mockBorrowedBooks: BorrowedBook[] = [
  {
    id: "1",
    title: "Computer Networks: A Top-Down Approach",
    author: "Kurose & Ross",
    code: "CS5102",
    accNo: "acc 41822",
    dueDate: "04 Aug 2026",
    status: "due-soon",
    dueInDays: 3,
  },
  {
    id: "2",
    title: "Pattern Recognition and Machine Learning",
    author: "C. M. Bishop",
    code: "CS5210",
    accNo: "acc 39014",
    dueDate: "19 Aug 2026",
    status: "on-time",
  },
  {
    id: "3",
    title: "Software Engineering: A Practitioner's Approach",
    author: "Pressman",
    code: "CS5108",
    accNo: "acc 40021",
    dueDate: "28 Jul 2026",
    status: "overdue",
  },
];

export const mockEbooks: Ebook[] = [
  {
    id: "1",
    title: "Deep Learning",
    author: "Goodfellow, Bengio, Courville",
    format: "PDF",
    sizeMb: 18,
    publisher: "MIT Press",
    actionLabel: "Read online",
  },
  {
    id: "2",
    title: "Cloud Computing: Concepts & Technology",
    author: "T. Erl",
    format: "EPUB",
    sizeMb: 9,
    publisher: "Pearson",
    actionLabel: "Read online",
  },
  {
    id: "3",
    title: "IEEE Xplore — Networking collection",
    author: "IEEE",
    format: "Portal",
    sizeMb: 0,
    publisher: "IEEE",
    actionLabel: "Open portal",
  },
];

export const mockCatalogue: CatalogueItem[] = [
  {
    id: "1",
    title: "Operating System Concepts",
    author: "Silberschatz",
    shelf: "Shelf B4",
    code: "CS-005",
    availability: "4 of 6 available",
  },
  {
    id: "2",
    title: "Artificial Intelligence: A Modern Approach",
    author: "Russell & Norvig",
    shelf: "Shelf C1",
    code: "CS-118",
    availability: "1 of 5 available",
  },
  {
    id: "3",
    title: "Database System Concepts",
    author: "Silberschatz & Korth",
    shelf: "Shelf B2",
    code: "CS-042",
    availability: "All 3 issued",
  },
];

export const mockHistory: HistoryItem[] = [
  {
    id: "1",
    title: "Introduction to Algorithms",
    author: "Cormen et al.",
    issuedOn: "02 Jun",
    returnedOn: "28 Jun 2026",
  },
  {
    id: "2",
    title: "Compiler Design",
    author: "Aho & Ullman",
    issuedOn: "11 May",
    returnedOn: "04 Jun 2026",
  },
  {
    id: "3",
    title: "Discrete Mathematics",
    author: "K. Rosen",
    issuedOn: "04 Apr",
    returnedOn: "02 May 2026",
    fine: 20,
  },
];
