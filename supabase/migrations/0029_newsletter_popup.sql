-- Timed newsletter pop-up support.
-- 1) Allow 'popup' as a subscriber source (the old CHECK only permitted
--    footer/blog/journal, so pop-up sign-ups were being rejected).
-- 2) Capture an optional first name alongside the email.

alter table newsletter_subscribers
  drop constraint if exists newsletter_subscribers_source_check;

alter table newsletter_subscribers
  add constraint newsletter_subscribers_source_check
  check (source in ('footer', 'blog', 'journal', 'popup'));

alter table newsletter_subscribers
  add column if not exists name text;
