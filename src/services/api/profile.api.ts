import { apiClient } from "./client";

// Mirrors EOS-backend's /me/my-profile/* routes (see
// EOS-backend/src/modules/profile/profile.service.ts). Every field here is
// read straight from real tables - there is no fixed/hardcoded catalogue of
// "academic profile" platforms; social_links is a free-form, user-authored
// list (see user_social_links) shared identically by every role.
export type SocialLink = {
  id: number;
  title: string;
  url: string;
};

export type MyChild = {
  id: number;
  name: string;
  student_id_no: string;
  relationship: string;
  course: string;
  section: string | null;
  department: string | null;
};

export type MyProfile = {
  role: "student" | "faculty" | "parent";
  name: string;
  id_no: string;
  designation: string;
  department: string | null;
  photo_url: string | null;
  resume_url: string | null;
  work_email: string;
  date_of_joining: string | null;
  reporting_to: string | null;
  social_links: SocialLink[];
  children?: MyChild[];

  // Personal/contact biodata - present for student and faculty-type roles
  // (HoD/HR/Principal all resolve through the same faculty branch server
  // side), absent for parent (no personal record exists for that role).
  gender?: string | null;
  date_of_birth?: string | null;
  personal_email?: string | null;
  address?: string | null;

  // Student-only.
  blood_group?: string | null;
  nationality?: string | null;
  religion?: string | null;
  community?: string | null;
  mobile?: string | null;
  father_name?: string | null;
  father_mobile?: string | null;
  father_occupation?: string | null;
  father_photo_url?: string | null;
  mother_name?: string | null;
  mother_mobile?: string | null;
  mother_occupation?: string | null;
  mother_photo_url?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;

  // Faculty-type only.
  whatsapp_number?: string | null;
  alternate_phone?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  previous_institution?: string | null;
  previous_experience_years?: number | null;
  office_room?: string | null;
  work_location?: string | null;
  employment_type?: string | null;
  employment_status?: string | null;
  staff_code?: string | null;
};

export type MyIdCard = {
  role: "student" | "faculty";
  name: string;
  photo_url: string | null;
  secondary_id_label: string;
  secondary_id: string;
  degree_dept_label: string;
  batch_label: string | null;
  issued_at: string | null;
  blood_group: string | null;
  date_of_birth: string | null;
  parent_name: string | null;
  resi_tel_no: string | null;
  address: string | null;
};

export async function getMyProfile(): Promise<MyProfile> {
  const { data } = await apiClient.get<{ data: MyProfile }>("/me/my-profile");
  return data.data;
}

export async function uploadMyResume(file: { uri: string; name: string; mimeType: string }): Promise<{ resume_url: string }> {
  const formData = new FormData();
  formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  const { data } = await apiClient.post<{ data: { resume_url: string } }>(
    "/me/my-profile/resume",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data;
}

export async function addMySocialLink(title: string, url: string): Promise<SocialLink> {
  const { data } = await apiClient.post<{ data: SocialLink }>("/me/my-profile/social-links", { title, url });
  return data.data;
}

export async function removeMySocialLink(id: number): Promise<void> {
  await apiClient.delete(`/me/my-profile/social-links/${id}`);
}

export async function getMyIdCard(): Promise<MyIdCard> {
  const { data } = await apiClient.get<{ data: MyIdCard }>("/me/my-profile/id-card");
  return data.data;
}

export async function issueMyIdCard(): Promise<{ issued_at: string }> {
  const { data } = await apiClient.post<{ data: { issued_at: string } }>("/me/my-profile/id-card/issue");
  return data.data;
}
