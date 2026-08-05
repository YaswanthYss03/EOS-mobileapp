export type Grade = "A" | "B" | "C" | "D" | "E";

// TODO: replace with a real call once an academics backend endpoint exists.
export const courses = ["Machine Learning", "Computer Networks", "Cryptography", "Cloud Computing"];

export const grades: { grade: Grade; label: string }[] = [
  { grade: "A", label: "Excellent" },
  { grade: "B", label: "Very good" },
  { grade: "C", label: "Good" },
  { grade: "D", label: "Average" },
  { grade: "E", label: "Poor" },
];

export const ratingCategories = ["Clarity of teaching", "Coverage of syllabus", "Availability outside class"];
