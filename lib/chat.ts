// Shared bits for the website chat (customer widget + admin inbox).

export type ChatMessage = {
  id: string;
  customer_id: string;
  sender: "customer" | "owner";
  body: string;
  read_at: string | null;
  created_at: string;
};

export const MESSAGE_COLUMNS = "id, customer_id, sender, body, read_at, created_at";
export const MAX_MESSAGE_LENGTH = 2000;

/** Insert or replace a message by id, keeping the list in time order. */
export function upsertMessage(list: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const i = list.findIndex((m) => m.id === msg.id);
  if (i >= 0) {
    const next = list.slice();
    next[i] = msg;
    return next;
  }
  const next = [...list, msg];
  next.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return next;
}

/** "3:05 PM" for today, "24 Oct, 3:05 PM" otherwise — in salon time. */
export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const time = d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });
  if (dayFmt.format(d) === dayFmt.format(new Date())) return time;
  const day = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
  return `${day}, ${time}`;
}
