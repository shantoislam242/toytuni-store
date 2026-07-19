-- toytuni-store — Blog 3a: repurpose the existing (empty) blog_posts.body jsonb to
-- markdown text, add cover tone/label, and add a blog_categories lookup.
-- blog_posts already exists (0001) with RLS + a public `published = true` read policy.
-- Run in the Supabase SQL editor after 0007_pdp_content.sql, then re-seed.

alter table blog_posts alter column body drop default;
alter table blog_posts alter column body type text using '';
alter table blog_posts alter column body set default '';
alter table blog_posts alter column body set not null;

alter table blog_posts add column if not exists cover_tone text;
alter table blog_posts add column if not exists cover_label text;

create table if not exists blog_categories (
  slug text primary key,
  name text not null,
  sort int not null default 0
);
alter table blog_categories enable row level security;

do $$ begin
  create policy "read blog_categories" on blog_categories for select using (true);
exception when duplicate_object then null;
end $$;
