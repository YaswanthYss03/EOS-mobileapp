import { apiClient } from "./client";

// Principal-only Finance & Fees oversight (aggregate only) - see
// EOS-backend's src/modules/principal-finance/principal-finance.service.ts.
// Transaction-level accounting stays with the Finance office's own module.
// There's no "budget" table anywhere in the schema, so unlike the reference
// design's "Budget utilised" card, this shows real total expenditure
// instead of a fabricated budget ratio.

export type PrincipalFinanceYearRow = {
  year: number;
  label: string;
  demand: number;
  collected: number;
  pending: number;
};

export type PrincipalFinanceOverview = {
  total_collected: number;
  collected_pct_of_demand: number | null;
  outstanding_dues: number;
  students_with_dues: number;
  scholarship_total: number;
  scholarship_beneficiaries: number;
  total_expenditure: number;
  expenditure_category_count: number;
  collection_by_year: PrincipalFinanceYearRow[];
};

export async function getPrincipalFinanceOverview(): Promise<PrincipalFinanceOverview> {
  const { data } = await apiClient.get<{ data: PrincipalFinanceOverview }>("/principal-finance/overview");
  return data.data;
}
