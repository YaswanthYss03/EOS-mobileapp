import { PlaceholderDashboard } from "../components/PlaceholderDashboard";

// TODO: billing RBAC - view-only pages for this role go here as siblings/subfolders.
// Anything with complex operations (bulk edits, approvals, config) stays on the web app.
export function BillingDashboard() {
  return <PlaceholderDashboard subtitle="Billing services" label="Billing Dashboard" />;
}
