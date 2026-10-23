"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  type ChatMessage,
  MAX_MESSAGE_LENGTH,
  MESSAGE_COLUMNS,
  formatMessageTime,
  upsertMessage,
} from "@/lib/chat";

type Customer = { id: string; full_name: string | null; email: string | null; phone: string | null };

function customerLabel(c: Customer | undefined): string {
  if (!c) return "Customer";
  return c.full_name || c.email?.split("@")[0] || "Customer";
}

/**
 * Salon inbox: conversation list on the left, the selected thread on
 * the right (one or the other on a phone). New messages arrive live.
 */
export default function AdminChat({ initialCustomerId }: { initialCustomerId: string | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialCustomerId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const customersRef = useRef(customers);
  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  // Initial load + live updates for every conversation.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function fetchCustomers(ids: string[]) {
      const missing = ids.filter((id) => !customersRef.current[id]);
      if (missing.length === 0) return;
      const { data } = await supabase.from("customers").select("id, full_name, email, phone").in("id", missing);
      if (cancelled || !data) return;
      setCustomers((prev) => {
        const next = { ...prev };
        for (const c of data as Customer[]) next[c.id] = c;
        return next;
      });
    }

    async function load() {
      const { data, error } = await supabase
        .from("messages")
        .select(MESSAGE_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }
      const rows = ((data ?? []) as ChatMessage[]).slice().reverse();
      setMessages(rows);
      setLoading(false);
      await fetchCustomers(Array.from(new Set(rows.map((m) => m.customer_id))));
    }
    load();

    const channel = supabase
      .channel("chat-admin-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (payload.eventType === "DELETE") return;
        const msg = payload.new as ChatMessage;
        setMessages((list) => upsertMessage(list, msg));
        fetchCustomers([msg.customer_id]);
      })
      .subscribe();

    const poll = window.setInterval(load, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, []);

  // Make sure a conversation opened from a link has its customer loaded.
  useEffect(() => {
    if (!selectedId || customers[selectedId]) return;
    const supabase = createClient();
    supabase
      .from("customers")
      .select("id, full_name, email, phone")
      .eq("id", selectedId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCustomers((prev) => ({ ...prev, [(data as Customer).id]: data as Customer }));
      });
  }, [selectedId, customers]);

  const conversations = useMemo(() => {
    const byCustomer = new Map<string, { last: ChatMessage; unread: number }>();
    for (const m of messages) {
      const entry = byCustomer.get(m.customer_id);
      const unread = (entry?.unread ?? 0) + (m.sender === "customer" && !m.read_at ? 1 : 0);
      byCustomer.set(m.customer_id, { last: m, unread });
    }
    return Array.from(byCustomer.entries())
      .map(([customerId, v]) => ({ customerId, ...v }))
      .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [messages]);

  const thread = useMemo(
    () => (selectedId ? messages.filter((m) => m.customer_id === selectedId) : []),
    [messages, selectedId]
  );
  const threadUnread = thread.some((m) => m.sender === "customer" && !m.read_at);

  // Opening a conversation (or a new message landing in it) marks it read.
  useEffect(() => {
    if (!selectedId || !threadUnread) return;
    const supabase = createClient();
    const id = selectedId;
    const now = new Date().toISOString();
    supabase.rpc("mark_messages_read", { p_customer_id: id }).then(() => {
      setMessages((list) =>
        list.map((m) => (m.customer_id === id && m.sender === "customer" && !m.read_at ? { ...m, read_at: now } : m))
      );
    });
  }, [selectedId, threadUnread]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [selectedId, thread.length]);

  function select(id: string | null) {
    setSelectedId(id);
    setDraft("");
    setSendError(null);
    const url = id ? `/admin/chat?c=${id}` : "/admin/chat";
    window.history.replaceState(null, "", url);
  }

  async function send() {
    const body = draft.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    setSendError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ customer_id: selectedId, sender: "owner", body })
      .select(MESSAGE_COLUMNS)
      .single();
    setSending(false);
    if (error) {
      setSendError("Couldn't send that — please try again.");
      return;
    }
    setDraft("");
    if (data) setMessages((list) => upsertMessage(list, data as ChatMessage));
  }

  const selectedCustomer = selectedId ? customers[selectedId] : undefined;

  if (loadError) {
    return (
      <p className="font-body rounded-2xl bg-red-50 p-4 text-sm text-red-700">
        Couldn&rsquo;t load messages: {loadError}
      </p>
    );
  }

  return (
    <div className="grid h-[calc(100vh-15rem)] min-h-[480px] overflow-hidden rounded-2xl border border-[#3a241f]/10 bg-white md:grid-cols-[320px_minmax(0,1fr)]">
      {/* Conversation list */}
      <aside
        className={`flex min-h-0 flex-col border-[#3a241f]/10 md:border-r ${selectedId ? "hidden md:flex" : "flex"}`}
      >
        <div className="border-b border-[#3a241f]/10 px-4 py-3">
          <p className="font-body text-sm font-semibold text-[#3a241f]">Conversations</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="font-body p-4 text-sm text-[#8a6b61]">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="font-body p-4 text-sm text-[#8a6b61]">
              No messages yet. When a customer uses &ldquo;Chat with us&rdquo; on the website, it shows up here.
            </p>
          ) : (
            conversations.map((c) => {
              const active = c.customerId === selectedId;
              return (
                <button
                  key={c.customerId}
                  type="button"
                  onClick={() => select(c.customerId)}
                  className={`flex w-full items-start gap-3 border-b border-[#3a241f]/5 px-4 py-3 text-left ${
                    active ? "bg-[#fdf5f1]" : "hover:bg-[#fdf5f1]/60"
                  }`}
                >
                  <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1d9cf] text-sm font-semibold text-[#8a4a37]">
                    {customerLabel(customers[c.customerId]).charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`font-body truncate text-sm text-[#3a241f] ${c.unread ? "font-semibold" : "font-medium"}`}
                      >
                        {customerLabel(customers[c.customerId])}
                      </span>
                      <span className="font-body shrink-0 text-[10px] text-[#8a6b61]">
                        {formatMessageTime(c.last.created_at)}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`font-body truncate text-xs ${c.unread ? "text-[#3a241f]" : "text-[#8a6b61]"}`}>
                        {c.last.sender === "owner" ? "You: " : ""}
                        {c.last.body}
                      </span>
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#b8765f] px-1.5 text-[10px] font-bold text-white">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className={`min-h-0 flex-col ${selectedId ? "flex" : "hidden md:flex"}`}>
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <p className="font-body text-sm text-[#8a6b61]">Pick a conversation to read and reply.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-[#3a241f]/10 px-4 py-3">
              <button
                type="button"
                onClick={() => select(null)}
                aria-label="Back to conversations"
                className="font-body rounded-full px-2 py-1 text-sm text-[#5c4038] hover:bg-[#fdf5f1] md:hidden"
              >
                ←
              </button>
              <div className="min-w-0">
                <p className="font-body truncate text-sm font-semibold text-[#3a241f]">
                  {customerLabel(selectedCustomer)}
                </p>
                <p className="font-body truncate text-xs text-[#8a6b61]">
                  {[selectedCustomer?.phone, selectedCustomer?.email].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>

            <div ref={threadRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-[#fdf5f1] px-4 py-4">
              {thread.length === 0 && (
                <p className="font-body text-center text-xs text-[#8a6b61]">No messages in this conversation yet.</p>
              )}
              {thread.map((m) => {
                const mine = m.sender === "owner";
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    <div
                      className={`font-body max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                        mine ? "rounded-br-md bg-[#3a241f] text-[#fdf5f1]" : "rounded-bl-md bg-white text-[#3a241f] shadow-sm"
                      }`}
                    >
                      {m.body}
                    </div>
                    <span className="font-body mt-0.5 px-1 text-[10px] text-[#8a6b61]">
                      {formatMessageTime(m.created_at)}
                      {mine && (m.read_at ? " · Seen" : " · Sent")}
                    </span>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="border-t border-[#3a241f]/10 p-3"
            >
              {sendError && <p className="font-body pb-2 text-xs text-red-600">{sendError}</p>}
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
                  placeholder={`Reply to ${customerLabel(selectedCustomer)}…`}
                  aria-label="Reply"
                  className="font-body max-h-32 min-h-[42px] flex-1 resize-none rounded-2xl border border-[#3a241f]/15 px-3.5 py-2.5 text-sm text-[#3a241f] outline-none focus-visible:border-[#b8765f]"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="font-body h-[42px] rounded-full bg-[#b8765f] px-5 text-sm font-semibold text-[#fdf5f1] disabled:opacity-50"
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
