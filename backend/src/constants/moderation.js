// Offers stay anonymous until accepted, so free-text fields must not leak a
// way to contact the supplier directly. Shared by the supplier submit route
// (hard block) and the admin offers list (flagging).
const CONTACT_PATTERNS = [
  /(?:\+?966|0)?5\d{8}/, // Saudi mobile
  /\d{3}[\s-]?\d{3}[\s-]?\d{4}/, // generic phone shapes
  /\b(?:whats?app|snap(?:chat)?|insta(?:gram)?|telegram|tiktok)\b/i,
  /واتس|وتس|سناب|انستا|انستقرام|تلقرام|تيك ?توك/,
  /@[\w.]+/,
  /https?:\/\/|www\./i,
];

export function containsContactInfo(text) {
  return CONTACT_PATTERNS.some((pattern) => pattern.test(text || ''));
}
