import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { startConversation } from "../actions";
import { SubmitButton } from "../../ui/form-controls";

type Member = { id: string; full_name: string | null; email: string };

const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted";
const field = "w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue";

export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("users")
    .select("id, full_name, email")
    .neq("id", user.id)
    .order("full_name", { ascending: true, nullsFirst: false });
  const members = (data ?? []) as Member[];

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <Link href="/inbox" className="text-sm text-blue hover:underline">
        &larr; Back to Inbox
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">New Message</h1>

      <form action={startConversation} className="mt-8 flex flex-col gap-5">
        <div>
          <label htmlFor="recipient_ids" className={label}>
            To (⌘/Ctrl-click for more than one)
          </label>
          <select
            id="recipient_ids"
            name="recipient_ids"
            multiple
            required
            size={8}
            defaultValue={to ? [to] : []}
            className="w-full rounded-md border border-hair bg-white px-2 py-2 text-sm text-text outline-none focus:border-blue"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? m.email}
                {m.full_name ? ` (${m.email})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="subject" className={label}>Subject (optional)</label>
          <input id="subject" name="subject" className={field} />
        </div>

        <div>
          <label htmlFor="body" className={label}>Message</label>
          <textarea id="body" name="body" required rows={6} className={field} />
        </div>

        <div className="flex gap-3">
          <SubmitButton
            pendingText="Sending…"
            className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Send
          </SubmitButton>
          <Link
            href="/inbox"
            className="rounded-md border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
