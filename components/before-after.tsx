"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import styles from "./before-after.module.css";

/**
 * Drag-to-compare: the after photo sits underneath and the before is clipped
 * over it, so moving the handle wipes between them.
 *
 * The control itself is a range input stretched over the whole image at zero
 * opacity. That gets mouse, touch and keyboard for free, which a hand-rolled
 * pointer handler wouldn't — arrow keys nudge it and the handle we draw
 * follows the value.
 */
export function BeforeAfter({
  before,
  after,
  label,
  aspect = 1,
}: {
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  label: string;
  /** Width over height of the two shots. Square unless told otherwise. */
  aspect?: number;
}) {
  const [pos, setPos] = useState(50);

  return (
    <div
      className={styles.compare}
      style={
        { "--pos": `${pos}%`, "--ratio": String(aspect) } as CSSProperties
      }
    >
      <Image
        src={after.src}
        alt={after.alt}
        fill
        sizes="(max-width: 760px) 90vw, 900px"
        className={styles.img}
        priority
      />

      <div className={styles.beforeClip}>
        <Image
          src={before.src}
          alt={before.alt}
          fill
          sizes="(max-width: 760px) 90vw, 900px"
          className={styles.img}
        />
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className={styles.range}
        aria-label={`${label}: drag to compare before and after`}
      />

      <span className={styles.divider} aria-hidden>
        <span className={styles.handle} />
      </span>

      <span className={`${styles.tag} ${styles.tagBefore}`} aria-hidden>
        Before
      </span>
      <span className={`${styles.tag} ${styles.tagAfter}`} aria-hidden>
        After
      </span>
    </div>
  );
}
