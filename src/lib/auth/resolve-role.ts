export type AdminRole = "super_admin" | "admin";

/** Pure role resolution. Env-bootstrap emails are ALWAYS super admins
 *  (lockout-proof — independent of the DB); otherwise the db row decides. */
export function resolveAdminRole(
  email: string | null | undefined,
  envList: string[],
  dbRole: string | null,
): AdminRole | null {
  const e = (email ?? "").trim().toLowerCase();
  if (e === "") return null;
  if (envList.some((x) => x.trim().toLowerCase() === e)) return "super_admin";
  if (dbRole === "super_admin" || dbRole === "admin") return dbRole;
  return null;
}
