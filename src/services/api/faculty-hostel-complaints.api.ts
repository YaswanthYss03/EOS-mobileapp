import { apiClient } from "./client";
import type { HostelComplaintCategory, MyHostelComplaint } from "./hostel.api";

// Self-service hostel complaints for a hostel-resident FACULTY member - the
// faculty-side counterpart of hostel.api.ts's createMyHostelComplaint/
// getMyHostelRoom (see EOS-backend's FacultyHostelComplaintsService).

export type CreateFacultyHostelComplaintPayload = {
  category: HostelComplaintCategory;
  title: string;
  description?: string;
};

export async function createFacultyHostelComplaint(
  payload: CreateFacultyHostelComplaintPayload,
): Promise<MyHostelComplaint> {
  const { data } = await apiClient.post<{ data: MyHostelComplaint }>("/faculty/hostel-complaints", payload);
  return data.data;
}

export async function listMyFacultyHostelComplaints(): Promise<MyHostelComplaint[]> {
  const { data } = await apiClient.get<{ data: MyHostelComplaint[] }>("/faculty/hostel-complaints");
  return data.data;
}
