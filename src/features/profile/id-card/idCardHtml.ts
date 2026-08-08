import type { MyIdCard } from "@/services/api/profile.api";
import { CARD_HEIGHT, CARD_WIDTH, WAVE_BLUE, WAVE_GOLD, WAVE_GREEN } from "./idCardLayout";

const WAVE_TRANSITION = "M0,10 C70,-4 210,22 280,6 L280,34 L0,34 Z";

// A4 at 72dpi, matched to what Print.printToFileAsync is called with.
export const PAGE_WIDTH = 595;
export const PAGE_HEIGHT = 842;
const HALF_HEIGHT = PAGE_HEIGHT / 2;

// Fit the card (preserving its exact aspect ratio - never stretched) inside
// each half of the page, leaving a comfortable margin so it reads as a
// physical ID card sitting on the page, not a full-bleed image.
const FIT_SCALE = Math.min((HALF_HEIGHT - 40) / CARD_HEIGHT, (PAGE_WIDTH - 60) / CARD_WIDTH);
const SCALED_WIDTH = Math.round(CARD_WIDTH * FIT_SCALE);
const SCALED_HEIGHT = Math.round(CARD_HEIGHT * FIT_SCALE);

// Builds a single A4 page with the front on the top half and the back on
// the bottom half, both at identical scale (real card proportions, never
// distorted), for expo-print to rasterize into one downloadable PDF. Kept
// in sync with <IdCardFront/>/<IdCardBack/> by hand - any layout/wave-path
// change there should be mirrored here (and vice versa).
export function buildIdCardHtml(card: MyIdCard, logoDataUri: string): string {
  const photoBlock = card.photo_url
    ? `<img src="${card.photo_url}" class="photo" />`
    : `<div class="photo photo-placeholder">${initials(card.name)}</div>`;

  const contactLabel = card.role === "student" ? "Parent Name" : "Contact";

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${PAGE_WIDTH}px ${PAGE_HEIGHT}px; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, Helvetica, Arial, sans-serif; }
  .sheet { width: ${PAGE_WIDTH}px; height: ${PAGE_HEIGHT}px; }
  .half {
    width: 100%;
    height: ${HALF_HEIGHT}px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .half + .half { border-top: 1px dashed #D1D5DB; }
  .scale-wrap {
    width: ${SCALED_WIDTH}px;
    height: ${SCALED_HEIGHT}px;
    overflow: hidden;
  }
  .card {
    width: ${CARD_WIDTH}px;
    height: ${CARD_HEIGHT}px;
    transform: scale(${FIT_SCALE.toFixed(4)});
    transform-origin: top left;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #fff;
    border: 1px solid #E5E7EB;
    overflow: hidden;
  }
  /* --- front --- */
  .header { width: 100%; display: flex; align-items: flex-start; gap: 8px; padding: 16px 14px 10px 14px; }
  .header img { width: 42px; height: 42px; margin-top: 2px; }
  .header .titles { flex: 1; }
  .header .name-of-college { font-size: 14px; font-weight: 700; color: #14264D; line-height: 16px; }
  .header .sub { font-size: 8.5px; font-weight: 600; color: #4B5563; margin-top: 2px; }
  .divider { width: 100%; height: 1px; background: #E5E7EB; }
  .body { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 20px 16px 0 16px; width: 100%; }
  .photo { width: 124px; height: 150px; border: 2px solid #111827; border-radius: 2px; object-fit: cover; background: #F3F4F6; }
  .photo-placeholder { display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; color: #2F6FE0; }
  .name { margin-top: 14px; font-size: 16px; font-weight: 700; color: #111827; text-align: center; }
  .secondary-id { margin-top: 3px; font-size: 11px; font-weight: 600; color: #6B7280; text-align: center; }
  .line2 { margin-top: 8px; font-size: 15px; font-weight: 700; color: #111827; text-align: center; }
  .line3 { margin-top: 4px; font-size: 14px; font-weight: 700; color: #111827; text-align: center; }
  .footer { width: 100%; margin-top: auto; }
  /* --- back --- */
  .back-body { flex: 1; width: 100%; padding: 22px 16px 0 16px; display: flex; flex-direction: column; }
  .row { display: flex; margin-bottom: 12px; }
  .row-label { width: 96px; font-size: 11.5px; font-weight: 600; color: #374151; }
  .row-value { flex: 1; font-size: 11.5px; color: #111827; }
  .signature-row { display: flex; justify-content: space-between; margin-top: auto; padding-bottom: 14px; }
  .signature-block { width: 100px; display: flex; flex-direction: column; align-items: center; }
  .signature-line { width: 100%; height: 1px; background: #9CA3AF; margin-bottom: 4px; }
  .signature-label { font-size: 10px; color: #6B7280; }
  .institution-bar { width: 100%; background: #1B3F91; display: flex; flex-direction: column; align-items: center; padding: 6px 12px 14px 12px; }
  .institution-name { font-size: 12px; font-weight: 700; color: #F2C744; text-align: center; margin-bottom: 2px; }
  .institution-line { font-size: 7.5px; color: #EAF0FD; text-align: center; line-height: 10px; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="half">
      <div class="scale-wrap">
        <div class="card">
          <div class="header">
            <img src="${logoDataUri}" />
            <div class="titles">
              <div class="name-of-college">Sri Eshwar College of Engineering</div>
              <div class="sub">An Autonomous Institution</div>
              <div class="sub">Accredited by NAAC | NBA</div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="body">
            ${photoBlock}
            <div class="name">${escapeHtml(card.name)}</div>
            <div class="secondary-id">${escapeHtml(card.secondary_id)}</div>
            <div class="line2">${escapeHtml(card.degree_dept_label)}</div>
            ${card.batch_label ? `<div class="line3">${escapeHtml(card.batch_label)}</div>` : ""}
          </div>
          <svg class="footer" width="${CARD_WIDTH}" height="40" viewBox="0 0 280 46" preserveAspectRatio="none">
            <path d="${WAVE_BLUE}" fill="#1B3F91" />
            <path d="${WAVE_GOLD}" fill="#F0CF7A" />
            <path d="${WAVE_GREEN}" fill="#8FCB4A" />
          </svg>
        </div>
      </div>
    </div>

    <div class="half">
      <div class="scale-wrap">
        <div class="card">
          <div class="back-body">
            ${row("Blood Group", card.blood_group)}
            ${row("Date of Birth", card.date_of_birth)}
            ${row(contactLabel, card.parent_name)}
            ${row("Resi. Tel. No", card.resi_tel_no)}
            ${row("Address", card.address)}
            <div class="signature-row">
              <div class="signature-block"><div class="signature-line"></div><div class="signature-label">Holder Sign</div></div>
              <div class="signature-block"><div class="signature-line"></div><div class="signature-label">Principal</div></div>
            </div>
          </div>
          <svg width="${CARD_WIDTH}" height="34" viewBox="0 0 280 34" preserveAspectRatio="none" style="margin-top:-2px">
            <path d="${WAVE_TRANSITION}" fill="#8FCB4A" />
          </svg>
          <div class="institution-bar">
            <div class="institution-name">SRI ESHWAR COLLEGE OF ENGINEERING</div>
            <div class="institution-line">Accredited by NAAC with 'A' Grade</div>
            <div class="institution-line">Approved by AICTE, New Delhi &middot; Affiliated to Anna University, Chennai</div>
            <div class="institution-line">Kondampatti Post, Vadasithur via, Kinathukadavu, Coimbatore - 641202</div>
            <div class="institution-line">Phone: 04259 200300 &middot; Email: sece@sece.ac.in</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function row(label: string, value: string | null): string {
  if (!value) return "";
  return `<div class="row"><div class="row-label">${escapeHtml(label)}</div><div class="row-value">${escapeHtml(value)}</div></div>`;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
