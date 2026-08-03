"use client";

import { business, scheduling, type Service } from "@/lib/content";
import { buildIcs, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar";
import { parseTime } from "@/lib/time";
import styles from "./add-to-calendar.module.css";

export function AddToCalendar({
  service,
  date,
  time,
  reference,
}: {
  service: Service;
  date: string;
  /** "HH:MM" */
  time: string;
  reference: string;
}) {
  const event: CalendarEvent = {
    title: `${service.name} — ${business.name}`,
    description: [
      `${service.name} with ${business.artist}.`,
      `Booking reference: ${reference}.`,
      "",
      "This appointment is pending confirmation — you'll get an email once it's confirmed.",
      "",
      `Questions: instagram.com/${business.instagram}`,
    ].join("\n"),
    location: business.showAddress ? business.address : business.city,
    date,
    startMinutes: parseTime(time),
    durationMinutes: service.durationMinutes,
    timeZone: scheduling.timezone,
    uid: `${reference}@jcbeauty`,
  };

  // Built at click time rather than on render: no blob URL is created for
  // people who never use the button, and nothing needs revoking later.
  function download() {
    const blob = new Blob([buildIcs(event)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `jc-beauty-${reference}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className="btn" onClick={download}>
        <CalendarIcon /> Add to Calendar
      </button>
      <a
        className={styles.googleLink}
        href={googleCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
      >
        or add to Google Calendar
      </a>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
    >
      <rect x="1.75" y="3" width="12.5" height="11.25" rx="1.5" />
      <path d="M1.75 6.5h12.5M5.25 1.75v2.5M10.75 1.75v2.5" />
    </svg>
  );
}
