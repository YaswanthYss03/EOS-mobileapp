// Pure class-label formatting (no app imports) - unit-testable on its own.

export type ClassLabelParts = {
  label: string;
  year?: number | null;
  department_code?: string;
  section?: string;
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/** "III Year · CSE · Section A" when the parts are known, otherwise the backend's label. */
export function formatClassLine(c: ClassLabelParts): string {
  const parts: string[] = [];
  if (c.year && c.year >= 1) parts.push(`${ROMAN[c.year - 1] ?? c.year} Year`);
  if (c.department_code) parts.push(c.department_code);
  if (c.section) parts.push(`Section ${c.section}`);
  return parts.length >= 2 ? parts.join(" · ") : c.label;
}
