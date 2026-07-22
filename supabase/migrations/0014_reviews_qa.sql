-- 0014_reviews_qa.sql — product reviews + Q&A (Daraz-style). Apply in the Supabase SQL editor after 0013_customer_profile.sql. NOTE: the final UPDATE zeroes the seeded mock card ratings (honest start).

create table if not exists product_reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  customer_email text not null,
  customer_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, customer_email)
);
create index if not exists product_reviews_product_idx on product_reviews(product_id, created_at desc);
drop trigger if exists product_reviews_set_updated_at on product_reviews;
create trigger product_reviews_set_updated_at before update on product_reviews
  for each row execute function set_updated_at();

create table if not exists product_questions (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  customer_email text not null,
  customer_name text not null,
  question text not null,
  answer text,
  answered_at timestamptz,
  answered_by text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists product_questions_product_idx on product_questions(product_id, created_at desc);

-- RLS: the public may read only visible content; ALL writes go through
-- server actions (service-role) after server-side verification.
alter table product_reviews enable row level security;
create policy "read visible reviews" on product_reviews for select using (not hidden);
alter table product_questions enable row level security;
create policy "read answered questions" on product_questions
  for select using (answer is not null and not hidden);

-- Aggregate rating: products.rating/review_count always reflect non-hidden
-- reviews. Trigger covers submit, admin hide/unhide, and delete — no app path
-- can forget to refresh.
create or replace function refresh_product_rating() returns trigger
language plpgsql as $$
declare v_product uuid;
begin
  v_product := coalesce(new.product_id, old.product_id);
  update products p set
    rating = coalesce((select round(avg(r.rating)::numeric, 1) from product_reviews r
                       where r.product_id = v_product and not r.hidden), 0),
    review_count = (select count(*) from product_reviews r
                    where r.product_id = v_product and not r.hidden)
    where p.id = v_product;
  return null;
end $$;
drop trigger if exists product_reviews_refresh_rating on product_reviews;
create trigger product_reviews_refresh_rating
  after insert or update or delete on product_reviews
  for each row execute function refresh_product_rating();

-- Honest start: the seeded card ratings were mock numbers; real reviews now own them.
update products set rating = 0, review_count = 0;
