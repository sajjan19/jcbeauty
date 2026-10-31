import type { Metadata } from "next";
import Link from "next/link";
import { business, gallery } from "@/lib/content";
import { PageHeader } from "@/components/page-header";
import { GalleryGrid } from "@/components/gallery-grid";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Before and after brow, lash and skin work by Japman Chera in Vancouver.",
};

export default function GalleryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Recent work"
        title="Before & after."
        lede="A look at recent appointments. Every result is tailored to the person it's on, so no two are identical."
      >
        <Link href="/book" className="btn">
          Book an Appointment
        </Link>
        <a
          href={business.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          More on Instagram
        </a>
      </PageHeader>

      <section className="section-sm">
        <div className="container">
          <GalleryGrid items={gallery} />
        </div>
      </section>
    </>
  );
}
