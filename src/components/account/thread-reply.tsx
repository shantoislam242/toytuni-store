"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { replySupportThread } from "@/lib/account/support";

/** Reply composer for a customer support thread. */
export function ThreadReply({ threadId, closed }: { threadId: string; closed: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    const res = await replySupportThread(threadId, body);
    setSending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setBody("");
    router.refresh();
  };

  return (
    <div className="mt-4">
      {closed ? (
        <p className="mb-2 text-xs text-ink-soft">
          This conversation was closed — replying will reopen it.
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply…"
          rows={2}
          maxLength={5000}
          className="min-h-11 flex-1 resize-y rounded-lg border border-cream-300 bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="flex size-11 flex-none items-center justify-center rounded-full bg-neem text-paper transition-colors hover:bg-neem-deep disabled:opacity-50"
          aria-label="Send reply"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
    </div>
  );
}
