# toytuni-store — Admin roles + dashboard team management

**Date:** 2026-07-22
**Status:** Design approved, pending spec review
**Scope:** Two admin roles — **Super Admin** (everything + Team + Settings) and **Admin** (everything EXCEPT Team + Settings) — with a **`/admin/team`** page where Super Admins add/remove admins and change roles from the dashboard (no env edit / redeploy). The env `ADMIN_EMAILS` list becomes a **lockout-proof bootstrap**: those emails are ALWAYS Super Admins even if the DB table is empty/broken.

## Background

Admin today = the `ADMIN_EMAILS` env allowlist (comma-separated, case-insensitive; `src/lib/auth/admin.ts` `isAdmin(email)`), checked in three layers: `src/proxy.ts` (middleware redirects non-admins off `/admin/*`), the admin layout, and `getIsAdmin()` inside every admin server action. Adding an admin means editing env + redeploying. There are no roles. The client-side `useAuth().isAdmin` (env `NEXT_PUBLIC_ADMIN_EMAILS`) powers only the account page's "Dashboard" button. Current admins (all to become Super): `work.databrandix11@gmail.com`, `dbx.project01@gmail.com`, `nabidahamed18@gmail.com`.

**Key constraint discovered:** the middleware (`proxy.ts:76`) checks `isAdmin(user.email)` synchronously from env — a DB-added admin would be redirected away before ever reaching the layout. The proxy must therefore gate `/admin/*` on **signed-in only**, moving the authoritative (DB-aware) admin/role check to the admin layout + per-action checks — defense-in-depth is preserved (layout redirect + every action re-checks), only the gate's location moves.

## Goals

- **Migration 0016:** `admin_users` (email unique+lowercase, role `super_admin`|`admin`, `added_by`, `created_at`), RLS-on zero-policy; **seed** the three current emails as `super_admin` (`on conflict do nothing`).
- **Role resolution (server):** `getAdminRole(): Promise<"super_admin" | "admin" | null>` — session email → (1) ∈ env `ADMIN_EMAILS` → `super_admin` (bootstrap, lockout-proof, fail-open to env even if the DB read fails); (2) else `admin_users` lookup → its role; (3) else null. Wrapped in React `cache()` (one lookup per request). `getIsAdmin()` keeps its signature (`role !== null`) so every existing call site works unchanged; new `getIsSuperAdmin()`.
- **Proxy change:** `/admin/*` redirects only unauthenticated visitors to `/signin?next=`; signed-in non-admins now fall through to the layout, which redirects them to `/` (authoritative, DB-aware).
- **Super-only surfaces:** `/admin/team` (new) and `/admin/settings` (page redirects non-supers to `/admin`; `updateSettings` + all team actions re-check `getIsSuperAdmin()` server-side). The sidebar hides Team + Settings for regular Admins (role threaded `layout → AdminShell → AdminSidebar`, like `inboxUnread`).
- **Team page (`/admin/team`):** list all admins — DB rows + role badges; rows whose email ∈ env render a **"Permanent"** badge (cannot be removed/demoted from the UI — the env bootstrap would keep admitting them anyway, so a UI "remove" would be a lie; truly removing one is an env/ops change). Actions: **Add admin** (email + role select — including `super_admin`: a Super may create other Supers), **change role**, **remove** — Super-gated. **A Super Admin CAN remove or demote another DB-managed Super Admin** (peer management, per decision); the only untouchable rows are the env-bootstrap ones and **yourself** (no self-remove/self-demote — prevents accidental lockout).
- **Account "Dashboard" button fix:** the account page (a Server Component) computes `getIsAdmin()` server-side and passes `showAdminLink` to `AccountView` — replacing the client env check so **DB-added admins see the button too**.

## Non-goals (later)

- No per-section permission matrix (just the two roles). No invite emails (the added admin simply signs in with Google/email — the allowlist admits them; Resend still test-mode). No audit log of team changes beyond `added_by`. No self-serve role requests. No UI to edit the env bootstrap list (that stays env/ops). `NEXT_PUBLIC_ADMIN_EMAILS` stays for any legacy client hints but nothing new depends on it.

## Locked decisions

- Roles: **Super = all + Team + Settings; Admin = all except Team + Settings.** All 3 current emails = Super (env bootstrap + DB seed).
- Team UI = a **dedicated sidebar page** `/admin/team`, visible to Supers only.
- Env `ADMIN_EMAILS` = permanent bootstrap Supers (lockout-proof; "Permanent" badge; unremovable from UI).
- Self-removal/demotion blocked; proxy gates auth-only, layout gates role.

## Schema (migration 0016 — `0016_admin_roles.sql`)

```sql
create table if not exists admin_users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  role text not null default 'admin' check (role in ('super_admin','admin')),
  added_by text,
  created_at timestamptz not null default now()
);
alter table admin_users enable row level security;  -- zero policies: service-role only

insert into admin_users (email, role, added_by) values
  ('work.databrandix11@gmail.com', 'super_admin', 'seed'),
  ('dbx.project01@gmail.com', 'super_admin', 'seed'),
  ('nabidahamed18@gmail.com', 'super_admin', 'seed')
on conflict (email) do nothing;
```

Manual step: **apply 0016 before merge** (release gate). Pre-migration the DB lookup fails soft → env bootstrap still admits the three current admins (nothing breaks); DB-added admins simply don't exist yet.

## Architecture

- **`src/lib/auth/roles.ts`** (server-only): `type AdminRole = "super_admin" | "admin"`; `getAdminRole = cache(async () => ...)` per the resolution above (env check via the existing `isAdmin()` parser; DB lookup lowercased, try/catch → null-from-DB but env still honored). `getIsSuperAdmin()`. `src/lib/auth/session.ts`'s `getIsAdmin()` re-implemented on top (`(await getAdminRole()) !== null`) — same signature, all ~40 call sites untouched.
- **`src/proxy.ts`:** drop the `isAdmin(email)` branch — keep the signed-in redirect; add a comment pointing at the layout as the authoritative role gate.
- **Admin layout:** `const role = await getAdminRole(); if (!role) redirect("/");` → pass `role` to `AdminShell` → `AdminSidebar` (hide Team + Settings when `role !== "super_admin"`).
- **Settings gate:** `/admin/settings/page.tsx` → `if (!(await getIsSuperAdmin())) redirect("/admin");` `updateSettings` action → super re-check.
- **Team data/actions:** `getAdminTeam()` (queries.ts — DB rows + a `permanent: boolean` computed against the env list); actions `addAdminUser(email, role)` (validated email, lowercased, role enum incl. `super_admin`, 23505 → "already an admin"), `setAdminRole(id, role)` (block ONLY if the row's email ∈ env or is the caller's own — another Super's row IS changeable), `removeAdminUser(id)` (block ONLY env rows + self — another Super IS removable) — ALL `getIsSuperAdmin()`-gated + service-role + `revalidatePath("/admin/team")`.
- **Team UI:** `src/app/admin/team/page.tsx` (super-gated like Settings) + `src/components/admin/team-manager.tsx` (list with role/Permanent badges + added-by/date; Add-admin form; role select; remove with confirm). Sidebar adds `{ label: "Team", href: "/admin/team", icon: ShieldCheck }` (rendered only for supers).
- **Account button:** account page passes `showAdminLink={await getIsAdmin()}`; `AccountView` uses the prop (drops `useAuth().isAdmin` there).

## Security / correctness

- **Lockout-proof:** env bootstrap is checked FIRST and independently of the DB — a broken/emptied `admin_users` can never lock the owners out; UI cannot remove env emails.
- **Defense-in-depth preserved:** layout role-gate + every action's `getIsAdmin()`/`getIsSuperAdmin()` re-check (server, session-verified email); moving the admin check out of the proxy removes no protection (proxy never protected actions anyway).
- Escalation guards: only Supers reach team actions; DB constraint restricts roles; super-on-super add/remove/demote is ALLOWED (peer management, by decision) but self-demote/remove and env-row changes are blocked server-side; add is lowercased + email-validated; RLS zero-policy keeps the table unreadable/unwritable publicly.
- `getAdminRole` is React-`cache()`d per request (no per-action DB pile-up); fail-soft DB path never blocks env supers.
- A demoted/removed admin loses access on their next request (no long-lived grant to revoke).

## Testing

- **Pure (TDD):** a `resolveAdminRole(email, envList, dbRow)` pure helper (env wins as super; db role passthrough; null otherwise; case-insensitivity) — the server fn wraps it; team-action guard helpers if extracted.
- **Integration (after 0016):** DB-add a test admin (role admin) → they can sign in and reach `/admin` but NOT `/admin/team`//settings (sidebar hides + direct URL redirects + `updateSettings` rejects); promote → they can; remove → next request bounced; env emails show Permanent and can't be removed; self-remove blocked; pre-migration → the three env supers still fully work.

## Resolved decisions

All three current admins = Super; Team+Settings super-only; dedicated `/admin/team`; env = permanent bootstrap.
