import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import DemoLogin from "@/components/DemoLogin";

export const metadata: Metadata = {
  title: "Demo | Glowing Beauty Salon",
  description: "Try the Glowing Beauty Salon app with a demo sign-in.",
  robots: { index: false, follow: false },
};

export default async function DemoPage({
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
          <span className="font-body inline-block rounded-full bg-[#3a241f] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#fdf5f1]">
            Demo
          </span>
          <h1 className="font-display mb-1 mt-3 text-2xl font-semibold text-[#3a241f]">Try the app</h1>
          <p className="font-body mb-6 text-sm text-[#5c4038]">
            Sign in with any name and number — your code appears on screen. Then book, chat and explore.
          </p>
          <DemoLogin next={next ?? "/"} />
        </div>

        <p className="font-body mt-6 max-w-[420px] text-center text-xs text-[#806155]">
          Demo accounts are private to you and clearly marked for the salon. No real SMS is sent.
        </p>
      </Container>
    </main>
  );
}
