"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const tabs = [
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/recall", label: "Recall" },
  { href: "/admin/chat", label: "Chat" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // Unread customer messages, for the badge on the Chat tab.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function refresh() {
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender", "customer")
        .is("read_at", null)
        .then(({ count }) => {
          if (!cancelled) setUnread(count ?? 0);
        });
    }
    refresh();

    const channel = supabase
      .channel("chat-admin-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [pathname]);

  return (
    <nav className="flex gap-1 overflow-x-auto" aria-label="Admin sections">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const badge = tab.href === "/admin/chat" && unread > 0 ? unread : 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`font-body flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
              active ? "bg-[#fdf5f1] text-[#3a241f]" : "text-[#f1d9cf] hover:bg-white/10"
            }`}
          >
            {tab.label}
            {badge > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#9d5d48] px-1.5 text-[10px] font-bold text-white">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
