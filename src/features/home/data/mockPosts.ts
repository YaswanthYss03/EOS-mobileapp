export type Comment = {
  id: string;
  author: string;
  text: string;
};

export type Post = {
  id: string;
  description: string;
  images: string[];
  comments: Comment[];
  postedAt: string;
};

// TODO: replace mockPosts with a real call to src/services/api/home.api.ts once the media-team backend is ready
export const mockPosts: Post[] = [
  {
    id: "1",
    description:
      "Our campus Hackathon 3.0 was a tremendous success! Amazing ideas, innovative solutions and unstoppable energy from all participants.\n\nHere's a glimpse of the event.\n#Hackathon3 #Innovation #SECE",
    images: [
      "https://picsum.photos/seed/eos-hackathon-1/800/800",
      "https://picsum.photos/seed/eos-hackathon-2/800/800",
      "https://picsum.photos/seed/eos-hackathon-3/800/800",
      "https://picsum.photos/seed/eos-hackathon-4/800/800",
    ],
    postedAt: "2h ago",
    comments: [{ id: "c1", author: "Dr. S. Vasanthi", text: "Proud of our students. Great work, team!" }],
  },
  {
    id: "2",
    description: "Congratulations to Ananya Rao on landing an SWE internship at Google!",
    images: ["https://picsum.photos/seed/eos-post-2/800/800"],
    postedAt: "5h ago",
    comments: [
      { id: "c2", author: "Rahul", text: "Congratulations! Well deserved" },
      { id: "c3", author: "Sneha", text: "So proud of you!!" },
    ],
  },
  {
    id: "3",
    description: "Karthik Iyer placed at Microsoft as SDE-1. Great going!",
    images: ["https://picsum.photos/seed/eos-post-3/800/800"],
    postedAt: "1d ago",
    comments: [{ id: "c4", author: "Divya", text: "Amazing achievement!" }],
  },
  {
    id: "4",
    description: "Fathima Noor bags an internship offer from Amazon.",
    images: ["https://picsum.photos/seed/eos-post-4/800/800"],
    postedAt: "2d ago",
    comments: [],
  },
];
