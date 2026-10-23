import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Container from "@/components/Container";
import BookingWizard from "@/components/BookingWizard";

export const metadata: Metadata = {
  title: "Book an appointment | Glowing Beauty Salon",
  description: "Choose a service, a stylist and a time — at our studio or at your home.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = service ? `/book?service=${encodeURIComponent(service)}` : "/book";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // Salon staff manage bookings rather than make them.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin === true) redirect("/admin/bookings?view=month");

  return (
    <>
      <Header />
      <main className="blush-field min-h-screen py-12">
        <Container>
          <h1 className="font-display text-3xl font-semibold text-[#3a241f] md:text-4xl">
            Book an appointment
          </h1>
          <p className="font-body mt-2 max-w-[560px] text-sm text-[#5c4038] md:text-base">
            Pick a service, a stylist, and a time that works for you.
          </p>

          <div className="mt-8">
            <BookingWizard presetServiceName={service ?? null} />
          </div>
        </Container>
      </main>
    </>
  );
}
