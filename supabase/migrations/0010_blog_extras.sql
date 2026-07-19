-- Blog 3c: tags + scheduled publish. Reveal a scheduled post via the RLS policy
-- once its time passes (cron-less; also enforced in the app query).
alter table blog_posts add column if not exists tags text[];
alter table blog_posts add column if not exists scheduled_at timestamptz;

drop policy if exists "read published posts" on blog_posts;
create policy "read published posts" on blog_posts
  for select using (published = true or (scheduled_at is not null and scheduled_at <= now()));
