import AdminChat from "@/components/admin/AdminChat";
import { requireAdmin } from "@/lib/admin/guard";

export default async function AdminChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  await requireAdmin();
  const { c } = await searchParams;
  const initialCustomerId = c && /^[0-9a-f-]{36}$/i.test(c) ? c : null;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-[#3a241f] md:text-3xl">Chat</h1>
      <p className="font-body mt-1 pb-5 text-sm text-[#5c4038]">
        Messages from the &ldquo;Chat with us&rdquo; button on the website. New messages appear here live.
      </p>
      <AdminChat initialCustomerId={initialCustomerId} />
    </div>
  );
}
