import { PlaceholderDashboard } from "../components/PlaceholderDashboard";

// TODO: admin RBAC - view-only pages for this role go here as siblings/subfolders.
// Anything with complex operations (bulk edits, approvals, config) stays on the web app.
export function AdminDashboard() {
  return <PlaceholderDashboard subtitle="Admin services" label="Admin Dashboard" />;
}
