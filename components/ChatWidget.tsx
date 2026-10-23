"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  type ChatMessage,
  MAX_MESSAGE_LENGTH,
  MESSAGE_COLUMNS,
  formatMessageTime,
  upsertMessage,
} from "@/lib/chat";

type Who =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "admin" }
  | { kind: "customer"; customerId: string; firstName: string | null }
  | { kind: "no-profile" };

/**
 * Floating "Chat with us" bubble for customers. Signed-out visitors
 * are asked to sign in first (so every conversation belongs to a real
 * customer the salon can see). The salon's own staff get a shortcut
 * to the admin inbox instead.
 */
export default function ChatWidget() {
  const pathname = usePathname();
  const [who, setWho] = useState<Who>({ kind: "loading" });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const customerId = who.kind === "customer" ? who.customerId : null;

  // Work out who's looking: signed out / admin / customer.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function resolve(userId: string | null) {
      if (!userId) {
        if (!cancelled) setWho({ kind: "signed-out" });
        return;
      }
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (cancelled) return;
      if (isAdmin === true) {
        setWho({ kind: "admin" });
        return;
      }
      const { data } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("auth_user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      const row = data as { id: string; full_name: string | null } | null;
      setWho(
        row
          ? { kind: "customer", customerId: row.id, firstName: row.full_name?.split(" ")[0] ?? null }
          : { kind: "no-profile" }
      );
    }

    supabase.auth.getUser().then(({ data }) => resolve(data.user?.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") resolve(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Load the conversation and keep it live.
  useEffect(() => {
    if (!customerId) {
      setMessages([]);
      return;
    }
    const supabase = createClient();
    const id = customerId;
    let cancelled = false;

    function load() {
      supabase
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .eq("customer_id", id)
        .order("created_at", { ascending: true })
        .limit(300)
        .then(({ data }) => {
          if (!cancelled && data) setMessages(data as ChatMessage[]);
        });
    }
    load();

    const channel = supabase
      .channel(`chat-customer-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `customer_id=eq.${id}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const msg = payload.new as ChatMessage;
          setMessages((list) => upsertMessage(list, msg));
        }
      )
      .subscribe();

    // Safety net in case the live connection drops.
    const poll = window.setInterval(load, 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [customerId]);

  const unread = messages.filter((m) => m.sender === "owner" && !m.read_at).length;

  // Opening the panel marks the salon's replies as read.
  useEffect(() => {
    if (!open || !customerId || unread === 0) return;
    const supabase = createClient();
    const now = new Date().toISOString();
    supabase.rpc("mark_messages_read", { p_customer_id: customerId }).then(() => {
      setMessages((list) => list.map((m) => (m.sender === "owner" && !m.read_at ? { ...m, read_at: now } : m)));
    });
  }, [open, customerId, unread]);

  // Keep the newest message in view.
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || !customerId || sending) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({ customer_id: customerId, sender: "customer", body })
      .select(MESSAGE_COLUMNS)
      .single();
    setSending(false);
    if (insertError) {
      setError("Couldn't send that — please try again.");
      return;
    }
    setDraft("");
    if (data) setMessages((list) => upsertMessage(list, data as ChatMessage));
  }

  // The admin area has its own inbox; no bubble there.
  if (pathname.startsWith("/admin")) return null;
  if (who.kind === "loading") return null;

  if (who.kind === "admin") {
    return (
      <Link
        href="/admin/chat"
        className="font-body fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#3a241f] px-5 py-3 text-sm font-semibold text-[#fdf5f1] shadow-[0_10px_30px_rgba(58,36,31,0.35)] hover:bg-[#4a2f28]"
      >
        <ChatIcon />
        Chat inbox
      </Link>
    );
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Chat with Glowing Beauty Salon"
          className="fixed inset-x-3 bottom-24 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-3xl border border-[#3a241f]/10 bg-white shadow-[0_20px_50px_rgba(58,36,31,0.3)] sm:inset-x-auto sm:right-6 sm:w-[370px]"
        >
          <div className="espresso-field flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-display text-base font-semibold text-[#fdf5f1]">Glowing Beauty Salon</p>
              <p className="font-body text-xs text-[#d8b3a6]">We usually reply during salon hours</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#fdf5f1] hover:bg-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {who.kind === "customer" ? (
            <>
              <div ref={listRef} className="flex min-h-[220px] flex-1 flex-col gap-2 overflow-y-auto bg-[#fdf5f1] px-4 py-4">
                <Bubble mine={false}>
                  Hi{who.firstName ? ` ${who.firstName}` : ""}! Ask us anything — services, prices, or your
                  booking.
                </Bubble>
                {messages.map((m) => (
                  <Bubble key={m.id} mine={m.sender === "customer"} time={formatMessageTime(m.created_at)}>
                    {m.body}
                  </Bubble>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="border-t border-[#3a241f]/10 bg-white p-3"
              >
                {error && <p className="font-body pb-2 text-xs text-red-600">{error}</p>}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder="Type a message…"
                    aria-label="Message"
                    className="font-body max-h-28 min-h-[42px] flex-1 resize-none rounded-2xl border border-[#3a241f]/15 px-3.5 py-2.5 text-sm text-[#3a241f] outline-none focus-visible:border-[#b8765f]"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="font-body h-[42px] rounded-full bg-[#b8765f] px-4 text-sm font-semibold text-[#fdf5f1] disabled:opacity-50"
                  >
                    {sending ? "…" : "Send"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 bg-[#fdf5f1] px-6 py-10 text-center">
              <p className="font-body text-sm text-[#5c4038]">
                {who.kind === "no-profile"
                  ? "We couldn't load your profile. Please sign out and sign in again."
                  : "Sign in to chat with the salon — so we know who we're talking to and can help with your bookings."}
              </p>
              {who.kind === "signed-out" && (
                <Link
                  href={`/login?next=${encodeURIComponent(pathname || "/")}`}
                  className="font-body rounded-full bg-[#b8765f] px-5 py-2.5 text-sm font-semibold text-[#fdf5f1]"
                >
                  Sign in to chat
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-body fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#b8765f] px-5 py-3 text-sm font-semibold text-[#fdf5f1] shadow-[0_10px_30px_rgba(58,36,31,0.35)] hover:bg-[#c48670]"
      >
        <ChatIcon />
        {open ? "Close" : "Chat with us"}
        {!open && unread > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fdf5f1] px-1.5 text-[11px] font-bold text-[#b8765f]">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}

function Bubble({ mine, time, children }: { mine: boolean; time?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div
        className={`font-body max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
          mine ? "rounded-br-md bg-[#b8765f] text-[#fdf5f1]" : "rounded-bl-md bg-white text-[#3a241f] shadow-sm"
        }`}
      >
        {children}
      </div>
      {time && <span className="font-body mt-0.5 px-1 text-[10px] text-[#8a6b61]">{time}</span>}
    </div>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
