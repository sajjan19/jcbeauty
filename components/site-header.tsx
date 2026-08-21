"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";
import { business } from "@/lib/content";
import styles from "./site-header.module.css";

const links = [
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

  return (
    <header className={styles.header}>
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
