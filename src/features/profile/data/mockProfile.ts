export type AcademicProfileLink = {
  id: string;
  label: string;
  value: string;
  icon: string;
};

// TODO: replace with a real call once a profile/resume backend endpoint exists.
// The logged-in user (see src/context/AuthContext) only carries id/email/role
// today - none of this richer profile data is available from the API yet.
export const mockProfile = {
  name: "Aishwarya R",
  employeeId: "EMP-CSE-2214",
  designation: "Assistant Professor · Networks & Security",
  department: "Computer Science & Engineering · 7 yrs",
  resumeUpdatedOn: "18 Jul 2026",
  dateOfJoining: "14 Jun 2019",
  reportingTo: "Dr. S. Vasanthi (HoD)",
  workEmail: "aishwarya.r@svit.ac.in",
  idCard: {
    validTill: "31 May 2027",
  },
};

export const academicProfileLinks: AcademicProfileLink[] = [
  { id: "linkedin", label: "LinkedIn", value: "in/aishwarya-r", icon: "logo-linkedin" },
  { id: "scholar", label: "Google Scholar", value: "412 citations · h-index 11", icon: "school-outline" },
  { id: "orcid", label: "ORCID", value: "0000-0002-4417-8823", icon: "finger-print-outline" },
  { id: "scopus", label: "Scopus", value: "14 indexed publications", icon: "document-text-outline" },
  { id: "github", label: "GitHub", value: "@aishwarya-r", icon: "logo-github" },
];
