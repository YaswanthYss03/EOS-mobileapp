export type CopyType = "signed" | "unsigned";

// TODO: replace with a real call once a certificates backend endpoint exists.
export const purposes = [
  "Bank loan",
  "Passport application",
  "Scholarship",
  "Internship",
  "Visa",
  "Educational loan",
  "Other",
];

export const copyTypeInfo: Record<CopyType, { label: string; description: string }> = {
  signed: {
    label: "Signed copy",
    description: "Digitally signed by the HoD and the principal · issued as a verified PDF",
  },
  unsigned: {
    label: "Unsigned copy",
    description: "Plain draft for your review · collect the signed copy from the office",
  },
};
