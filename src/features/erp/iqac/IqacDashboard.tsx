import { PlaceholderDashboard } from "../components/PlaceholderDashboard";

// TODO: iqac RBAC - view-only pages for this role go here as siblings/subfolders.
// Anything with complex operations (bulk edits, approvals, config) stays on the web app.
export function IqacDashboard() {
  return <PlaceholderDashboard subtitle="IQAC services" label="Iqac Dashboard" />;
}
