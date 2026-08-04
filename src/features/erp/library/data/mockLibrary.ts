export type CatalogueBook = {
  id: string;
  title: string;
  author: string;
  category: string;
  code: string;
  availability: string;
  inStock: boolean;
};

export type EResource = {
  id: string;
  name: string;
  description: string;
  url: string;
};

export type BorrowedBook = {
  id: string;
  title: string;
  author: string;
  borrowedOn: string;
  dueDate: string;
  status: "active" | "overdue";
};

export type LibraryHistoryEntry = {
  id: string;
  title: string;
  author: string;
  borrowedOn: string;
  returnedOn: string;
};

// TODO: replace with a real call once a library backend endpoint exists.
export const libraryInfo = {
  name: "Central Library",
  accountType: "Staff account",
};

export const mockCatalogue: CatalogueBook[] = [
  {
    id: "1",
    title: "Introduction to Algorithms",
    author: "Cormen, Leiserson, Rivest",
    category: "Computer Science",
    code: "CS-114",
    availability: "3 copies free",
    inStock: true,
  },
  {
    id: "2",
    title: "Pattern Recognition and Machine Learning",
    author: "Christopher M. Bishop",
    category: "Machine Learning",
    code: "CS-241",
    availability: "1 copy free",
    inStock: true,
  },
  {
    id: "3",
    title: "Computer Networks",
    author: "Andrew S. Tanenbaum",
    category: "Networking",
    code: "CS-088",
    availability: "5 copies free",
    inStock: true,
  },
  {
    id: "4",
    title: "The Design of Everyday Things",
    author: "Don Norman",
    category: "Design",
    code: "GN-012",
    availability: "2 copies free",
    inStock: true,
  },
  {
    id: "5",
    title: "Cryptography and Network Security",
    author: "William Stallings",
    category: "Security",
    code: "CS-176",
    availability: "out of stock",
    inStock: false,
  },
];

export const eResources: EResource[] = [
  { id: "1", name: "NPTEL", description: "Video courses & certifications", url: "https://nptel.ac.in" },
  { id: "2", name: "IEEE Xplore", description: "Journals & conference papers", url: "https://ieeexplore.ieee.org" },
  { id: "3", name: "ACM Digital Library", description: "Computing research & publications", url: "https://dl.acm.org" },
  { id: "4", name: "SpringerLink", description: "Books, journals & reference works", url: "https://link.springer.com" },
  { id: "5", name: "ScienceDirect", description: "Scientific & technical research", url: "https://www.sciencedirect.com" },
];

export const mockBorrowedBooks: BorrowedBook[] = [
  {
    id: "1",
    title: "Introduction to Algorithms",
    author: "Cormen, Leiserson, Rivest",
    borrowedOn: "10 Jul 2026",
    dueDate: "24 Jul 2026",
    status: "overdue",
  },
  {
    id: "2",
    title: "Computer Networks",
    author: "Andrew S. Tanenbaum",
    borrowedOn: "28 Jul 2026",
    dueDate: "11 Aug 2026",
    status: "active",
  },
];

export const mockLibraryHistory: LibraryHistoryEntry[] = [
  {
    id: "1",
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt, David Thomas",
    borrowedOn: "02 May 2026",
    returnedOn: "16 May 2026",
  },
  {
    id: "2",
    title: "Clean Code",
    author: "Robert C. Martin",
    borrowedOn: "10 Apr 2026",
    returnedOn: "24 Apr 2026",
  },
  {
    id: "3",
    title: "Design Patterns",
    author: "Gamma, Helm, Johnson, Vlissides",
    borrowedOn: "15 Mar 2026",
    returnedOn: "29 Mar 2026",
  },
];
