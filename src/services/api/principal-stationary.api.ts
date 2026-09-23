import { apiClient } from "./client";

// Principal/Correspondent-only institution-wide Copy Center overview - see
// EOS-backend's src/modules/stationary/stationary-vendor.controller.ts
// (the vendor-facing GET stats/reports/* routes, widened with a read-only
// method-level @Roles override for these 2 roles - the class-level guard
// stays Stationary-vendor/Admin-only for every write operation in that
// controller). Everything here is computed live from real
// stationary_requests rows - no stored "summary" table exists to read from
// instead.

export type StationaryDashboardStats = {
  pending_count: number;
  oldest_pending_minutes: number | null;
  pages_printed_today: number;
  completed_today: number;
  collected_today: number;
};

export async function getStationaryDashboardStats(): Promise<StationaryDashboardStats> {
  const { data } = await apiClient.get<{ data: StationaryDashboardStats }>("/stationary-requests/stats");
  return data.data;
}

export type StationaryDepartmentUsage = {
  department: string;
  jobs: number;
  pages: number;
  amount: number;
};

export type StationaryUsageByDepartment = {
  range: { start: string; end: string };
  departments: StationaryDepartmentUsage[];
};

export async function getStationaryUsageByDepartment(
  from?: string,
  to?: string,
): Promise<StationaryUsageByDepartment> {
  const { data } = await apiClient.get<{ data: StationaryUsageByDepartment }>(
    "/stationary-requests/reports/usage-by-department",
    { params: { from, to } },
  );
  return data.data;
}

export type StationaryRevenueByMode = { mode: string; amount: number };

export type StationaryRecentPayment = {
  date: string;
  who: string;
  mode: string;
  jobs: number;
  amount: number;
};

export type StationaryRevenueReport = {
  range: { start: string; end: string };
  collected_this_month: number;
  collected_today: number;
  jobs_today: number;
  avg_job_value: number;
  by_mode: StationaryRevenueByMode[];
  recent_payments: StationaryRecentPayment[];
};

export async function getStationaryRevenueReport(from?: string, to?: string): Promise<StationaryRevenueReport> {
  const { data } = await apiClient.get<{ data: StationaryRevenueReport }>("/stationary-requests/reports/revenue", {
    params: { from, to },
  });
  return data.data;
}
