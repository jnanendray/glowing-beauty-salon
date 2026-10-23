import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/Container";
import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata: Metadata = {
  title: "Admin | Glowing Beauty Salon",
  robots: { index: false, follow: false },
};

// Always render per request — admin data must never be cached/static.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#fdf5f1]">
      <header className="espresso-field">
        <Container className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-[#b8765f] text-base font-bold italic text-[#fdf5f1]">
              G
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-[#fdf5f1]">Salon admin</p>
              <p className="font-body text-xs text-[#d8b3a6]">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <AdminNav />
            <Link href="/" className="font-body text-sm text-[#d8b3a6] underline-offset-4 hover:underline">
              View website →
            </Link>
          </div>
        </Container>
      </header>

      <main className="py-8">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
