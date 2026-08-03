import Image from "next/image";
import type { GalleryItem } from "@/lib/content";
import styles from "./gallery-tile.module.css";

export function GalleryTile({
  item,
  priority = false,
}: {
  item: GalleryItem;
  priority?: boolean;
}) {
  return (
    <figure className={styles.tile}>
      <Image
        src={item.src}
        alt={item.alt}
        fill
        sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 280px"
        className={styles.image}
        priority={priority}
      />
      <figcaption className={styles.caption}>{item.caption}</figcaption>
    </figure>
  );
}
