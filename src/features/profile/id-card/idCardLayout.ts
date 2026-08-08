// Single source of truth for card sizing and the wave-footer path data,
// shared by IdCardFront, IdCardBack, and idCardHtml.ts (the PDF renderer)
// so all three never visually drift apart.
export const CARD_WIDTH = 280;
export const CARD_HEIGHT = 440;

export const WAVE_BLUE = "M0,18 C60,4 100,32 160,20 C210,10 250,26 280,14 L280,46 L0,46 Z";
export const WAVE_GOLD = "M0,26 C60,14 100,40 160,28 C210,18 250,34 280,22 L280,46 L0,46 Z";
export const WAVE_GREEN = "M0,34 C60,24 100,44 160,36 C210,28 250,40 280,30 L280,46 L0,46 Z";
