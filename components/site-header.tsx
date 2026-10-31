"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { business } from "@/lib/content";
import styles from "./site-header.module.css";

const links = [
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/info", label: "Info" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Closing on the link's own click (rather than reacting to the new
  // pathname) keeps the panel from lingering over the incoming page.
  const close = () => setOpen(false);

  /*
   * While the menu covers the screen, the page behind it shouldn't scroll.
   * Locked on <html> as well as <body>: iOS Safari keeps scrolling a page
   * whose body alone is set to hidden. Escape closes it, as a menu should.
   */
  useEffect(() => {
    if (!open) return;

    const root = document.documentElement;
    const previous = {
      html: root.style.overflow,
      body: document.body.style.overflow,
    };
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      root.style.overflow = previous.html;
      document.body.style.overflow = previous.body;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className={`${styles.header} ${open ? styles.headerOpen : ""}`}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} onClick={close}>
          <Logo size={44} />
          <span className={styles.brandText}>
            <span className={styles.brandName}>{business.artist}</span>
            <span className={styles.brandTag}>{business.tagline}</span>
          </span>
        </Link>

        <button
          type="button"
          className={`${styles.toggle} ${open ? styles.toggleOpen : ""}`}
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.toggleBars} aria-hidden />
        </button>

        <nav
          id="site-nav"
          className={`${styles.nav} ${open ? styles.navOpen : ""}`}
        >
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.link} ${active ? styles.linkActive : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={close}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/book"
            className={`btn btn-sm ${styles.navCta}`}
            onClick={close}
          >
            Book Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
