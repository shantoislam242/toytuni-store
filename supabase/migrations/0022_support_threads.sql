-- toytuni-store — customer ↔ admin support inbox (Phase 6, final phase of the
-- account dashboard). A two-way message thread between a signed-in customer
-- (/account/inbox) and the shop admin (Inbox → Support tab). The public contact
-- form also opens a thread for signed-in senders so the conversation continues
-- in-account instead of a dead-end email.
--
-- Threads are keyed by `customer_email` (to match the order/notification model —
-- no user link on the customer side). Per-side unread flags drive the sidebar
-- badge (customer) and the admin tab count. RLS: zero-policy — all access via
-- the service-role client in server code, scoped to the session email (customer)
-- or admin re-check (admin).
--
-- Additive + safe to apply before the code deploys. Run in the Supabase SQL
-- editor after 0021_notifications.sql. Uses uuid_generate_v4() (already present).

create table if not exists support_threads (
  id              uuid        primary key default uuid_generate_v4(),
  customer_email  text        not null,
  customer_name   text,
  subject         text        not null,
  status          text        not null default 'open' check (status in ('open','closed')),
  customer_unread boolean     not null default false,  -- an admin reply the customer hasn't seen
  admin_unread    boolean     not null default true,   -- a customer message the admin hasn't seen
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Customer's thread list (newest activity first) and the admin's open queue.
create index if not exists support_threads_email_idx
  on support_threads (customer_email, last_message_at desc);
create index if not exists support_threads_admin_idx
  on support_threads (status, last_message_at desc);

create table if not exists support_messages (
  id         uuid        primary key default uuid_generate_v4(),
  thread_id  uuid        not null references support_threads (id) on delete cascade,
  sender     text        not null check (sender in ('customer','admin')),
  body       text        not null,
  created_at timestamptz not null default now()
);

-- Messages of a thread, oldest first.
create index if not exists support_messages_thread_idx
  on support_messages (thread_id, created_at);

alter table support_threads  enable row level security;
alter table support_messages enable row level security;
-- No policies: service-role only; the browser never reads these tables directly.
