export type Comment = {
  id: string;
  author: string;
  text: string;
};

export type Post = {
  id: string;
  studentName: string;
  company: string;
  role: string;
  package: string;
  imageUrl: string;
  description: string;
  comments: Comment[];
  postedAt: string;
};

export const mockPosts: Post[] = [
  {
    id: "1",
    studentName: "Ananya Rao",
    company: "Google",
    role: "SWE Intern",
    package: "₹28 LPA",
    imageUrl: "https://picsum.photos/seed/eos-post-1/800/800",
    description: "Congratulations to Ananya Rao on landing an SWE internship at Google! 🎉",
    postedAt: "2h ago",
    comments: [
      { id: "c1", author: "Rahul", text: "Congratulations! Well deserved 🔥" },
      { id: "c2", author: "Sneha", text: "So proud of you!!" },
    ],
  },
  {
    id: "2",
    studentName: "Karthik Iyer",
    company: "Microsoft",
    role: "SDE-1",
    package: "₹24 LPA",
    imageUrl: "https://picsum.photos/seed/eos-post-2/800/800",
    description: "Karthik Iyer placed at Microsoft as SDE-1. Great going! 💪",
    postedAt: "5h ago",
    comments: [{ id: "c3", author: "Divya", text: "Amazing achievement!" }],
  },
  {
    id: "3",
    studentName: "Fathima Noor",
    company: "Amazon",
    role: "SDE Intern",
    package: "₹20 LPA",
    imageUrl: "https://picsum.photos/seed/eos-post-3/800/800",
    description: "Fathima Noor bags an internship offer from Amazon 🚀",
    postedAt: "1d ago",
    comments: [],
  },
  {
    id: "4",
    studentName: "Vignesh Kumar",
    company: "Deloitte",
    role: "Analyst",
    package: "₹9 LPA",
    imageUrl: "https://picsum.photos/seed/eos-post-4/800/800",
    description: "Vignesh Kumar placed at Deloitte as an Analyst. Congratulations!",
    postedAt: "2d ago",
    comments: [
      { id: "c4", author: "Meena", text: "Congrats Vignesh!" },
      { id: "c5", author: "Arjun", text: "Well done 👏" },
    ],
  },
];
