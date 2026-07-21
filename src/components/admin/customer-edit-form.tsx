"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StringListEditor } from "@/components/admin/string-list-editor";
import { updateCustomer } from "@/lib/admin/actions";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blocked", label: "Blocked" },
] as const;

export function CustomerEditForm({
  id, name, email, phone, status, tags, notes,
}: {
  id: string; name: string; email: string | null; phone: string;
  status: string; tags: string[]; notes: string | null;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [nameV, setNameV] = useState(name);
  const [emailV, setEmailV] = useState(email ?? "");
  const [statusV, setStatusV] = useState(status);
  const [tagsV, setTagsV] = useState(tags);
  const [notesV, setNotesV] = useState(notes ?? "");

  const save = () => {
    if (nameV.trim() === "") return toast.error("Name is required.");
    start(async () => {
      const r = await updateCustomer(id, {
        name: nameV,
        email: emailV.trim() === "" ? null : emailV,
        status: statusV,
        tags: tagsV,
        notes: notesV.trim() === "" ? null : notesV,
      });
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
        <Input type="email" value={emailV} onChange={(e) => setEmailV(e.target.value)} placeholder="name@example.com" className="mt-1" />
      </label>
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Phone</span>
        <p className="mt-1 font-mono text-sm text-ink">{phone}</p>
        <span className="text-xs text-ink-soft">Phone can’t be changed.</span>
      </div>
      <div>
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Status</span>
        <Select value={statusV} onValueChange={setStatusV}>
          <SelectTrigger className="mt-1 w-full">
            <SelectValue placeholder="Choose status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <StringListEditor label="Tags" value={tagsV} onChange={setTagsV} addLabel="Add tag" />
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Notes</span>
        <textarea
          value={notesV}
          onChange={(e) => setNotesV(e.target.value)}
          rows={4}
          placeholder="Internal notes (admins only)…"
          className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <Button onClick={save} disabled={busy} className="w-full">{busy ? "Saving…" : "Save"}</Button>
    </div>
  );
}
