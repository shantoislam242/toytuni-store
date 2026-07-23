/** Would removing OR demoting a super admin leave the store with zero super
 *  admins? Effective supers = env-bootstrap emails (permanent, always present)
 *  ∪ DB rows currently `super_admin`. `targetEmail` is the row about to be
 *  removed/demoted. Returns true when NO super admin would remain afterward —
 *  the caller blocks the operation ("at least one super admin must remain").
 *
 *  All emails are compared case-insensitively and trimmed. The caller is
 *  expected to pass a NON-env target (env rows are permanent and blocked one
 *  guard earlier); the predicate still deletes the target defensively so the
 *  count reflects the post-operation state. */
export function wouldOrphanSupers(
  envEmails: string[],
  dbSuperEmails: string[],
  targetEmail: string | null | undefined,
): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  const supers = new Set<string>();
  for (const e of envEmails) supers.add(norm(e));
  for (const e of dbSuperEmails) supers.add(norm(e));
  supers.delete(norm(targetEmail ?? ""));
  return supers.size === 0;
}
