"use client";

import { dateToIndex } from "@/lib/time";
import styles from "./calendar.module.css";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type CalendarProps = {
  year: number;
  month: number; // 1–12
  /** date string → whether any slot is free that day */
  availability: Record<string, boolean>;
  selected: string | null;
  loading?: boolean;
  minDate: string;
  maxDate: string;
  onSelect: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
};

export function Calendar({
  year,
  month,
  availability,
  selected,
  loading = false,
  minDate,
  maxDate,
  onSelect,
  onMonthChange,
}: CalendarProps) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const minIndex = dateToIndex(minDate);
  const maxIndex = dateToIndex(maxDate);

  // Only offer navigation to months that overlap the bookable window.
  const prevDisabled =
    dateToIndex(
      `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(
        2,
        "0",
      )}`,
    ) -
      daysInMonth +
      1 <=
    minIndex;

  const nextDisabled =
    dateToIndex(`${year}-${String(month).padStart(2, "0")}-01`) + daysInMonth >
    maxIndex;

  function step(delta: number) {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    onMonthChange(next.getUTCFullYear(), next.getUTCMonth() + 1);
  }

  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) =>
        `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(
          2,
          "0",
        )}`,
    ),
  ];

  return (
    <div className={styles.calendar}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => step(-1)}
          disabled={prevDisabled}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className={styles.monthLabel} aria-live="polite">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => step(1)}
          disabled={nextDisabled}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className={styles.weekdays} aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div
        className={`${styles.grid} ${loading ? styles.gridLoading : ""}`}
        role="group"
        aria-label="Choose a date"
      >
        {cells.map((date, i) => {
          if (!date) return <span key={`pad-${i}`} className={styles.pad} />;

          const index = dateToIndex(date);
          const inWindow = index >= minIndex && index <= maxIndex;
          const free = availability[date] === true;
          const isSelected = selected === date;
          const disabled = !inWindow || !free;

          return (
            <button
              key={date}
              type="button"
              className={`${styles.day} ${
                isSelected ? styles.daySelected : ""
              } ${free && !isSelected ? styles.dayFree : ""}`}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`${date}${disabled ? " (unavailable)" : ""}`}
              onClick={() => onSelect(date)}
            >
              {Number(date.slice(-2))}
            </button>
          );
        })}
      </div>

      <p className={styles.legend}>
        <span className={styles.legendDot} aria-hidden /> Available
      </p>
    </div>
  );
}
