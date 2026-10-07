/**
 * Small glyphs that sit beside a piece of contact detail.
 *
 * Drawn inline rather than loaded as images: no request each, they take the
 * colour of whatever text they sit beside, and they survive being viewed
 * offline. All decorative — the detail beside each one already says what it
 * is — so they're hidden from screen readers.
 */

type IconProps = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false as const,
  style: { flex: "none", verticalAlign: "-0.12em" },
});

export function InstagramIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function EmailIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2.5 6.5 9.5 7 9.5-7" />
    </svg>
  );
}

export function PhoneIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M21 16.9v2.6a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.7 2 2 0 0 1 3.1 1.5h2.6a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L6.7 9.3a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

export function LocationIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M20 10.5c0 6-8 12.5-8 12.5s-8-6.5-8-12.5a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10.5" r="3" />
    </svg>
  );
}
