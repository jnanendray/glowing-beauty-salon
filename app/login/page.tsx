import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in | Glowing Beauty Salon",
  description: "Sign in with Google or email to book and manage your appointments at Glowing Beauty Salon.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="blush-field flex min-h-screen items-center justify-center py-16">
      <Container className="flex flex-col items-center">
        <Link href="/" className="font-body mb-8 text-sm font-medium text-[#806155] hover:text-[#3a241f]">
          ← Back to Glowing Beauty Salon
        </Link>

        <div className="w-full max-w-[420px] rounded-3xl border border-[#3a241f]/10 bg-white/70 p-8 shadow-[0_20px_60px_-20px_rgba(58,36,31,0.25)] backdrop-blur">
          <h1 className="font-display mb-1 text-2xl font-semibold text-[#3a241f]">Welcome back</h1>
          <p className="font-body mb-6 text-sm text-[#5c4038]">
            Sign in to book an appointment, see your bookings and chat with us.
          </p>
          <LoginForm next={next || "/"} />
        </div>

        <p className="font-body mt-6 max-w-[420px] text-center text-xs text-[#806155]">
          Phone and WhatsApp sign-in are coming soon — they need a paid SMS/WhatsApp service we only turn on for
          live client launches.
        </p>
      </Container>
    </main>
  );
}
