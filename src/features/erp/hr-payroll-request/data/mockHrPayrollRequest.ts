// HR help-desk request categories offered in the compose form.
//
// These are a genuine UI taxonomy, not fake data: hr_payroll_requests.category
// is a free-form VARCHAR(100) with no lookup table behind it, so the list of
// choices has to live client-side. Anything picked here is stored verbatim.
//
// The fabricated ticket list that used to sit alongside this has been removed -
// the screen now reads real tickets from GET /me/hr-queries. Submitting used to
// push a locally-built ticket (with an invented ticket number) into React state,
// so a request vanished on the next app launch and HR never received it.
export const requestCategories = [
  "PF & ESI",
  "Payslip Correction",
  "Income Tax / TDS",
  "Salary Advance",
  "Reimbursement",
  "Bank Details Update",
  "Other",
];
