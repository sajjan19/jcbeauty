import type { Metadata } from "next";
import { getService } from "@/lib/content";
import { firstBookableDate, lastBookableDate } from "@/lib/bookings";
import { PageHeader } from "@/components/page-header";
import { BookingFlow } from "./booking-flow";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description:
    "Choose your brow service, pick a time that works and request your appointment.",
};

export default async function BookPage({
  searchParams,
}: PageProps<"/book">) {
  // Deep links from the services page arrive as ?service=slug.
  const params = await searchParams;
  const raw = params.service;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const initialService = requested && getService(requested) ? requested : null;

  return (
    <>
      <PageHeader
        eyebrow="Booking"
        title="Book an appointment."
        lede="Four quick steps. Your request is confirmed by email and isn't final until you hear back from me."
      />

      <section className="section-sm">
        <div className="container">
          <BookingFlow
            initialService={initialService}
            minDate={firstBookableDate()}
            maxDate={lastBookableDate()}
          />
        </div>
      </section>
    </>
  );
}
