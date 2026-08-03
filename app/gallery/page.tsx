import type { Metadata } from "next";
import Link from "next/link";
import { business, gallery } from "@/lib/content";
import { PageHeader } from "@/components/page-header";
import { GalleryTile } from "@/components/gallery-tile";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Before and after brow lamination, shaping and tinting work by Japman Chera in Vancouver.",
};

export default function GalleryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Recent work"
        title="Before & after."
        lede="A look at recent appointments. Every set of brows is mapped to the face it's on, so no two results are identical."
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
          <div className={styles.grid}>
            {gallery.map((item, i) => (
              <GalleryTile key={item.src} item={item} priority={i < 3} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
