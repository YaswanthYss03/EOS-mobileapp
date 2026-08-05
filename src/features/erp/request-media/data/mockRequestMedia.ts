export type MediaRequestStatus = "pending" | "forwarded" | "returned";

export type MediaRequest = {
  id: string;
  publishType: string;
  category: string;
  achievementTitle: string;
  eventDate: string;
  publishBy: string;
  peopleToFeature: string;
  captionDetails: string;
  channel: string;
  ref: string;
  raisedOn: string;
  status: MediaRequestStatus;
};

// TODO: replace with a real call once a media-relations backend endpoint exists.
export const publishTypes = ["Post", "Reel", "Story", "Poster", "Video coverage"];

export const mediaCategories = [
  "Hackathon win",
  "Paper published",
  "Placement",
  "Workshop",
  "Class achievement",
  "Sports",
];

export const mediaChannels = ["Instagram", "LinkedIn", "College website", "All channels"];

export const mockMediaHistory: MediaRequest[] = [
  {
    id: "1",
    publishType: "Post",
    category: "Hackathon win",
    achievementTitle: "CSE team wins Smart India Hackathon 2026",
    eventDate: "05 Aug 2026",
    publishBy: "08 Aug 2026",
    peopleToFeature: "Team Zenith — 4 students, III CSE-A · mentor Dr. K. Ramesh",
    captionDetails: "Team Zenith secured first place in the Smart India Hackathon grand finale.",
    channel: "All channels",
    ref: "MED/CSE/2026/021",
    raisedOn: "06 Aug 2026",
    status: "pending",
  },
  {
    id: "2",
    publishType: "Reel",
    category: "Placement",
    achievementTitle: "Divya Bharathi M placed at Google",
    eventDate: "28 Jul 2026",
    publishBy: "30 Jul 2026",
    peopleToFeature: "Divya Bharathi M, III CSE-A",
    captionDetails: "Congratulations to Divya Bharathi M on landing an SWE offer from Google.",
    channel: "Instagram",
    ref: "MED/CSE/2026/020",
    raisedOn: "28 Jul 2026",
    status: "forwarded",
  },
];
