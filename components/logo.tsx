import { business } from "@/lib/content";

/**
 * A CSS rebuild of her existing logo: a Didone "JC" over letterspaced
 * "BEAUTY" and "JAPMAN CHERA".
 *
 * If she ever exports the real artwork, drop it in /public/logo.svg and swap
 * these out — the shape and proportions here are deliberately close so the
 * swap won't disturb any layout.
 */

/** Circular mark for the header. Drops the artist line — unreadable that small. */
export function Logo({ size = 48 }: { size?: number }) {
  return (
    <span
      aria-label={business.name}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--white)",
        border: "1px solid var(--sand)",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: size * 0.42,
          letterSpacing: "0.01em",
          color: "var(--char)",
        }}
      >
        JC
      </span>
      <span
        aria-hidden
        style={{
          marginTop: size * 0.08,
          fontSize: size * 0.115,
          letterSpacing: "0.28em",
          textIndent: "0.28em",
          color: "var(--char)",
          textTransform: "uppercase",
        }}
      >
        Beauty
      </span>
    </span>
  );
}

/** The full three-line lockup, for the hero and anywhere with room to breathe. */
export function LogoLockup({ size = 200 }: { size?: number }) {
  return (
    <span
      aria-label={`${business.name}, ${business.artist}`}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--white)",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: size * 0.3,
          letterSpacing: "0.01em",
          color: "var(--char)",
        }}
      >
        JC
      </span>
      <span
        aria-hidden
        style={{
          marginTop: size * 0.07,
          fontSize: size * 0.055,
          letterSpacing: "0.42em",
          textIndent: "0.42em",
          color: "var(--char)",
          textTransform: "uppercase",
        }}
      >
        Beauty
      </span>
      <span
        aria-hidden
        style={{
          marginTop: size * 0.035,
          fontSize: size * 0.055,
          letterSpacing: "0.3em",
          textIndent: "0.3em",
          color: "var(--char)",
          textTransform: "uppercase",
        }}
      >
        {business.artist}
      </span>
    </span>
  );
}
