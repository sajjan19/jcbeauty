import styles from "./page-header.module.css";

export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className="container">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {lede && <p className={`lede ${styles.lede}`}>{lede}</p>}
        {children && <div className={styles.actions}>{children}</div>}
      </div>
    </header>
  );
}
