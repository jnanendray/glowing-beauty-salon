"use client";

import { useState } from "react";
import Container from "@/components/Container";

const navLinks = [
  { href: "#services", label: "Services" },
  { href: "#stylists", label: "Our Stylists" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#3a241f]/10 bg-[#fdf5f1]/90 backdrop-blur">
      <Container className="flex items-center justify-between py-4">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-[#b8765f] text-base font-bold italic text-[#fdf5f1]">
            G
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-[#3a241f]">
            Glowing Beauty Salon
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body text-sm font-medium text-[#5c4038] hover:text-[#3a241f]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="#booking"
          className="font-body hidden rounded-full bg-[#b8765f] px-5 py-2.5 text-sm font-semibold text-[#fdf5f1] hover:bg-[#c48670] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3a241f] md:inline-block"
        >
          Book an appointment
        </a>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3a241f]/15 text-[#3a241f] md:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {open ? (
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <>
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </Container>

      {open && (
        <div className="border-t border-[#3a241f]/10 bg-[#fdf5f1] md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="font-body rounded-lg px-2 py-2.5 text-sm font-medium text-[#5c4038] hover:bg-[#f1d9cf]/50"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#booking"
              onClick={() => setOpen(false)}
              className="font-body mt-2 rounded-full bg-[#b8765f] px-5 py-2.5 text-center text-sm font-semibold text-[#fdf5f1]"
            >
              Book an appointment
            </a>
          </Container>
        </div>
      )}
    </header>
  );
}
