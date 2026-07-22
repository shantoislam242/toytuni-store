"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { addAdminUser, setAdminRole, removeAdminUser } from "@/lib/admin/actions";
import type { AdminTeamMember } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
] as const;

/** Role badge — Super Admin gets a distinct filled style, Admin an
 *  outline/muted one (mirrors `HiddenBadge` in `reviews-manager.tsx`). */
function RoleBadge({ role }: { role: AdminTeamMember["role"] }) {
  if (role === "super_admin") {
    return (
      <span className="inline-flex items-center rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-paper">
        Super Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-cream-300 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
      Admin
    </span>
  );
}

/** Small pill flagging an env-bootstrap ("permanent") member — not editable
 *  from this UI. `title` doubles as a lightweight tooltip. */
function PermanentBadge() {
  return (
    <span
      title="Managed via server config"
      className="inline-flex items-center rounded-full bg-mustard/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-mustard"
    >
      Permanent
    </span>
  );
}

/**
 * Team management UI (Task 5). Super-only page (`/admin/team`'s server gate).
 * Two cards: an "Add admin" form (`addAdminUser`) and the members list, each
 * row offering a role change (`setAdminRole`) and remove (`removeAdminUser`)
 * — both disabled for env-bootstrap ("permanent") rows and for the caller's
 * own row, mirroring the guard the Server Actions already enforce (Task 4).
 * Every mutation follows the shared idiom: `useTransition`, check `r.ok`,
 * toast, then `router.refresh()` to re-pull the server data.
 */
export function TeamManager({ members, selfEmail }: { members: AdminTeamMember[]; selfEmail: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      <AddAdminCard onAdded={refresh} />
      <MembersCard members={members} selfEmail={selfEmail} onChanged={refresh} />
      <p className="text-xs text-ink-soft">
        Permanent members are configured on the server and can’t be edited here. You can’t remove or demote yourself.
      </p>
    </div>
  );
}

function AddAdminCard({ onAdded }: { onAdded: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("admin");
  const [busy, start] = useTransition();

  const add = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    start(async () => {
      const r = await addAdminUser(trimmed, role);
      if (r.ok) {
        toast.success("Admin added.");
        setEmail("");
        setRole("admin");
        onAdded();
      } else {
        toast.error(r.error);
      }
    });
  };

  return (
    <Card className="border-cream-300">
      <CardHeader>
        <CardTitle>Add admin</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Email</span>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="mt-1"
            />
          </label>
          <div className="sm:w-44">
            <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Role</span>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={busy || email.trim() === ""}>
            <UserPlus className="size-4" /> {busy ? "Adding…" : "Add"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          They sign in with this email (Google or email/password) and get access immediately.
        </p>
      </CardContent>
    </Card>
  );
}

function MembersCard({
  members, selfEmail, onChanged,
}: {
  members: AdminTeamMember[]; selfEmail: string; onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const changeRole = (member: AdminTeamMember, next: string) => {
    if (next === member.role) return;
    setBusyId(member.id);
    startTransition(async () => {
      const r = await setAdminRole(member.id, next);
      setBusyId(null);
      if (r.ok) { toast.success("Role updated."); onChanged(); } else toast.error(r.error);
    });
  };

  const remove = (member: AdminTeamMember) => {
    if (!confirm(`Remove ${member.email} from the dashboard?`)) return;
    setBusyId(member.id);
    startTransition(async () => {
      const r = await removeAdminUser(member.id);
      setBusyId(null);
      if (r.ok) { toast.success("Admin removed."); onChanged(); } else toast.error(r.error);
    });
  };

  return (
    <Card className="border-cream-300">
      <CardHeader>
        <CardTitle>Members</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-cream-300">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-300 bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Added by</th>
                <th className="px-4 py-2.5 font-medium">Added</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const busy = isPending && busyId === member.id;
                const locked = member.permanent || member.email === selfEmail;
                const lockedTitle = member.permanent
                  ? "Managed via server config"
                  : "You can't change or remove yourself";
                return (
                  <tr key={member.id} className="border-b border-cream-200 align-top last:border-b-0 hover:bg-cream-50">
                    <td className="px-4 py-3 font-mono text-xs text-ink">{member.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={member.role} />
                        {member.permanent && <PermanentBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{member.addedBy ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(member.createdAt.slice(0, 10))}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-2">
                        {locked ? (
                          <span
                            title={lockedTitle}
                            className={cn("text-xs text-ink-soft", member.permanent && "italic")}
                          >
                            {member.permanent ? "Locked" : "This is you"}
                          </span>
                        ) : (
                          <>
                            <Select
                              value={member.role}
                              onValueChange={(next) => changeRole(member, next)}
                            >
                              <SelectTrigger className="h-8 w-36" disabled={busy}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Remove admin"
                              disabled={busy}
                              className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                              onClick={() => remove(member)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-ink-muted">No team members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
