export type Announcement = {
  id: string;
  badge: string;
  title: string;
  description: string;
  meta: string;
  ctaLabel: string;
};

// TODO: replace with src/services/api/home.api.ts once the media-team backend is ready
export const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    badge: "NEW",
    title: "Hackathon 3.0",
    description: "Innovate. Code. Elevate.",
    meta: "19th – 21st July 2026",
    ctaLabel: "Register Now",
  },
  {
    id: "2",
    badge: "VISIT",
    title: "Industry Visit",
    description: "For III Year students",
    meta: "28th July 2026",
    ctaLabel: "Know More",
  },
  {
    id: "3",
    badge: "NEW",
    title: "Guest Lecture",
    description: "AI in Healthcare",
    meta: "2nd August 2026",
    ctaLabel: "Register Now",
  },
];
