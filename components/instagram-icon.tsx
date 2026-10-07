/**
 * Instagram's glyph, drawn inline rather than loaded as an image: it costs no
 * request, takes the colour of whatever text it sits beside, and doesn't go
 * missing if the page is viewed offline.
 *
 * Decorative — the handle next to it already says what it is — so it's
 * hidden from screen readers.
 */
export function InstagramIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: "none", verticalAlign: "-0.12em" }}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
