-- toytuni-store — saved delivery addresses (Phase 3 of the customer account
-- dashboard). Signed-in customers keep an address book they manage from
-- /account/addresses and pick from at checkout (the address modal). Guests are
-- unaffected — they still type an address per order.
--
-- One row per saved address. Fields mirror the app's `Address` type / the
-- checkout `AddressDraft`. `is_default` marks the address pre-selected at
-- checkout; the single-default-per-user invariant is maintained by the server
-- actions (service-role only), not a DB constraint, to avoid write-ordering
-- failures. RLS: zero-policy — every read/write goes through the service-role
-- client scoped to the session user id (same pattern as coupons / wishlist).
--
-- Additive + safe to apply before the code deploys. Run in the Supabase SQL
-- editor after 0019_wishlist.sql. Uses uuid_generate_v4() + set_updated_at(),
-- both already present (migrations 0011 / earlier).

create table if not exists customer_addresses (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  full_name    text        not null,
  phone        text        not null,
  alt_phone    text,
  email        text,
  division     text        not null,
  district     text        not null,
  area         text        not null,
  address_line text        not null,
  landmark     text,
  is_default   boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- List a user's book default-first, then newest, without a full scan.
create index if not exists customer_addresses_user_idx
  on customer_addresses (user_id, is_default desc, created_at desc);

drop trigger if exists customer_addresses_set_updated_at on customer_addresses;
create trigger customer_addresses_set_updated_at before update on customer_addresses
  for each row execute function set_updated_at();

alter table customer_addresses enable row level security;
-- No policies: service-role only (bypasses RLS); the browser never reads the
-- table directly.
