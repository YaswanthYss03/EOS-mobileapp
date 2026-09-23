import { apiClient } from "./client";

// Alumni self-service (distinct from alumni.api.ts, which is the
// Principal-facing admin/alumni-batches browsing API) - mirrors
// EOSbackend1's src/modules/alumni/me-alumni.controller.ts.

// GET /me/alumni/arrears - whether the caller currently has a standing
// arrear (a subject whose latest official exam attempt is still a fail).
// Gates the Campus tab's "Exam schedule" card - see
// AcademicsChooserScreen.tsx's alumni branch.
export async function getMyArrearStatus(): Promise<{ hasStandingArrear: boolean }> {
  const { data } = await apiClient.get<{ data: { hasStandingArrear: boolean } }>("/me/alumni/arrears");
  return data.data;
}
