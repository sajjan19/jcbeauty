import type { Metadata } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";
import { business } from "@/lib/content";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// High-contrast Didone, chosen to sit alongside the "JC" in her logo.
const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const sans = Jost({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${business.name} — ${business.tagline}`,
    template: `%s — ${business.name}`,
  },
  description: business.intro,
  openGraph: {
    title: `${business.name} — ${business.tagline}`,
    description: business.intro,
    type: "website",
    locale: "en_CA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" style={{ flex: 1 }}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
