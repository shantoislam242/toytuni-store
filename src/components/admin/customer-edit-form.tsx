"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateCustomer } from "@/lib/admin/actions";

export function CustomerEditForm({ id, name, email, phone }: { id: string; name: string; email: string | null; phone: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [nameV, setNameV] = useState(name);
  const [emailV, setEmailV] = useState(email ?? "");

  const save = () => {
    if (nameV.trim() === "") return toast.error("Name is required.");
    start(async () => {
      const r = await updateCustomer(id, { name: nameV, email: emailV.trim() === "" ? null : emailV });
      if (r.ok) { toast.success("Customer saved."); router.refresh(); } else toast.error(r.error);
    });
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Name</span>
        <Input value={nameV} onChange={(e) => setNameV(e.target.value)} className="mt-1" />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Email</span>
        <Input value={emailV} onChange={(e) => setEmailV(e.target.value)} placeholder="—" className="mt-1" />
      </label>
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Phone</span>
        <p className="mt-1 font-mono text-sm text-ink">{phone}</p>
        <span className="text-xs text-ink-soft">Phone can’t be changed.</span>
      </div>
      <Button onClick={save} disabled={busy} className="w-full">{busy ? "Saving…" : "Save"}</Button>
    </div>
  );
}
