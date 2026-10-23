"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/recall", label: "Recall" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Admin sections">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`font-body whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
              active ? "bg-[#fdf5f1] text-[#3a241f]" : "text-[#f1d9cf] hover:bg-white/10"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      <span
        className="font-body disabled-option whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-[#f1d9cf]"
        title="Arrives with the website chat feature"
      >
        Chat · soon
      </span>
    </nav>
  );
}
