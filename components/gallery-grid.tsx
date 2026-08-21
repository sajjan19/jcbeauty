"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { GalleryItem } from "@/lib/content";
import styles from "./gallery-grid.module.css";
import tileStyles from "./gallery-tile.module.css";

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex === null ? null : items[openIndex];

  const close = useCallback(() => setOpenIndex(null), []);

  // Close on Escape, and stop the page behind the overlay from scrolling.
  useEffect(() => {
    if (open === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  return (
    <>
      <div className={styles.grid}>
        {items.map((item, i) => {
          // Only paired items have anything more to show, so only those
          // become buttons — the rest stay plain figures.
          if (!item.pair) {
            return (
              <figure key={item.src} className={tileStyles.tile}>
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 280px"
                  className={tileStyles.image}
                />
                <figcaption className={tileStyles.caption}>
                  {item.caption}
                </figcaption>
              </figure>
            );
          }

          return (
            <button
              key={item.src}
              type="button"
              className={`${tileStyles.tile} ${styles.tileButton}`}
              onClick={() => setOpenIndex(i)}
              aria-label={`${item.caption} — view before and after`}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 280px"
                className={tileStyles.image}
                priority={i === 0}
              />
              <span className={tileStyles.caption}>
                {item.caption}
                <span className={styles.viewHint}>Tap to compare</span>
              </span>
            </button>
          );
        })}
      </div>

      {open?.pair && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={`${open.caption}, before and after`}
          onClick={close}
        >
          {/* Clicks inside the panel shouldn't dismiss it. */}
          <div
            className={styles.dialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogHead}>
              <p className={styles.dialogTitle}>{open.caption}</p>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={close}
                aria-label="Close"
                autoFocus
              >
                ✕
              </button>
            </div>

            <div className={styles.pair}>
              <figure className={styles.pane}>
                <span className={styles.paneLabel}>Before</span>
                <div className={styles.paneImage}>
                  <Image
                    src={open.pair.before.src}
                    alt={open.pair.before.alt}
                    fill
                    sizes="(max-width: 760px) 90vw, 45vw"
                    className={styles.paneImg}
                  />
                </div>
              </figure>

              <figure className={styles.pane}>
                <span className={`${styles.paneLabel} ${styles.paneLabelAfter}`}>
                  After
                </span>
                <div className={styles.paneImage}>
                  <Image
                    src={open.pair.after.src}
                    alt={open.pair.after.alt}
                    fill
                    sizes="(max-width: 760px) 90vw, 45vw"
                    className={styles.paneImg}
                  />
                </div>
              </figure>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
