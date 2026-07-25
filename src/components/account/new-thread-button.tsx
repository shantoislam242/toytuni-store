"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Plus, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { startSupportThread } from "@/lib/account/support";

const inputCls =
  "w-full rounded-lg border border-cream-300 bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus-visible:border-neem focus-visible:ring-2 focus-visible:ring-neem/25";

/** Opens a dialog to start a new support conversation, then navigates to it. */
export function NewThreadButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    const res = await startSupportThread(subject, body);
    setSending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Message sent.");
    setOpen(false);
    setSubject("");
    setBody("");
    router.push(`/account/inbox/${res.id}`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full bg-neem px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-neem-deep"
        >
          <Plus className="size-4" /> New message
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 duration-200 data-open:animate-in data-open:fade-in-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-cream-300 bg-paper text-sm text-ink shadow-2xl duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
          <div className="flex items-start justify-between gap-3 border-b border-cream-300 px-5 py-4 sm:px-6">
            <div>
              <Dialog.Title className="font-display text-xl font-semibold tracking-tight text-ink">
                New message
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-ink-muted">
                Ask us anything — we&apos;ll reply here and notify you.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="-mr-1.5 -mt-1 flex size-10 flex-none items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-200 hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4.5" />
            </Dialog.Close>
          </div>

          <div className="space-y-3 px-5 py-5 sm:px-6">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What's this about?"
                maxLength={200}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Message</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message…"
                rows={5}
                maxLength={5000}
                className={`${inputCls} resize-y`}
              />
            </label>
          </div>

          <div className="border-t border-cream-300 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-neem px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-neem-deep disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sending ? "Sending…" : "Send message"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
