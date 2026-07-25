-- toytuni-store — admin-editable FAQ (CMS phase 2).
-- Moves the support-center FAQ off the hardcoded mock into a table the admin
-- manages at /admin/faqs. Storefront reads active FAQs (public select policy,
-- like blog_posts/categories); admin CRUD goes through the service-role client.
--
-- Seeded from the current mock (dollar-quoted so apostrophes need no escaping),
-- only when the table is empty — so the admin starts with the exact set the
-- storefront already shows, editable. Idempotent seed.
--
-- Run in the Supabase SQL editor after 0025_order_returns.sql. Uses
-- uuid_generate_v4() + set_updated_at() (already present).

create table if not exists faqs (
  id         uuid        primary key default uuid_generate_v4(),
  category   text        not null,
  question   text        not null,
  answer     text        not null,
  link_label text,
  link_href  text,
  sort       int         not null default 0,
  active     boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists faqs_active_sort_idx on faqs (active, sort);

drop trigger if exists faqs_set_updated_at on faqs;
create trigger faqs_set_updated_at before update on faqs
  for each row execute function set_updated_at();

alter table faqs enable row level security;
-- Public read of ACTIVE faqs only (anon/storefront); admin writes/reads-all via
-- the service-role client, which bypasses RLS.
drop policy if exists "read active faqs" on faqs;
create policy "read active faqs" on faqs for select using (active);

insert into faqs (category, question, answer, link_label, link_href, sort)
select * from (values
  ($$Orders$$,      $$How do I place an order?$$,                  $$Browse our collection, add the toys you love to your cart, and check out with your delivery details. You'll receive an order confirmation right away.$$, null::text, null::text, 0),
  ($$Orders$$,      $$How can I track my order?$$,                 $$Once your order ships, we'll send you a notification with a tracking link so you can follow your parcel until it reaches you.$$, $$Shipping & Delivery$$, $$/policy/shipping$$, 1),
  ($$Orders$$,      $$Can I change or cancel my order?$$,          $$If your order hasn't shipped yet, contact us as soon as possible and we'll do our best to update or cancel it for you.$$, null, null, 2),
  ($$Shipping$$,    $$How long does delivery take?$$,              $$We dispatch most orders within 24 hours. Major cities typically receive their order in 6–7 days, and other regions in 7–10 days.$$, $$Shipping & Delivery$$, $$/policy/shipping$$, 3),
  ($$Shipping$$,    $$Which areas do you deliver to?$$,            $$We deliver nationwide through trusted couriers like RedX, Pathao, and Steadfast. We also ship internationally on request.$$, null, null, 4),
  ($$Shipping$$,    $$How much does shipping cost?$$,              $$Shipping is a nominal fee based on your order's total weight, and the exact amount is always shown at checkout before you pay.$$, null, null, 5),
  ($$Shipping$$,    $$Do you ship internationally?$$,              $$Yes! Reach out and we'll find the best international rate for your location. International shipping is charged on actuals.$$, $$Shipping & Delivery$$, $$/policy/shipping$$, 6),
  ($$Returns$$,     $$What is your return & exchange policy?$$,    $$Unused items in their original packaging can be returned or exchanged within 7 days of delivery. Just reach out with your order number to start.$$, $$Returns & Refund Policy$$, $$/policy/returns$$, 7),
  ($$Returns$$,     $$How does the refund process work?$$,         $$Once we receive and inspect your return, approved refunds are processed to your original payment method within 5–7 business days.$$, $$Returns & Refund Policy$$, $$/policy/returns$$, 8),
  ($$Returns$$,     $$My toy arrived damaged — what should I do?$$, $$We're sorry to hear that! Report it within 48 hours with a photo, and we'll arrange a free pickup and a replacement or full refund.$$, null, null, 9),
  ($$Payments$$,    $$What payment methods do you accept?$$,       $$We accept the payment options shown at checkout, including cards, mobile wallets, and Cash on Delivery where available.$$, null, null, 10),
  ($$Payments$$,    $$Do you offer Cash on Delivery?$$,            $$Yes — COD is available for eligible orders, with limits shown at checkout. COD refunds are made via bank transfer or mobile wallet (bKash / Nagad).$$, null, null, 11),
  ($$Payments$$,    $$Is it safe to pay online?$$,                 $$Absolutely. Payments are processed securely by our trusted payment partners, and we never store your full card details.$$, $$Privacy Policy$$, $$/policy/privacy$$, 12),
  ($$Products$$,    $$Are your toys safe for children?$$,          $$Every toy is made from non-toxic, natural neem wood with child-safe finishes, and is carefully checked for quality and safety.$$, null, null, 13),
  ($$Products$$,    $$What age are your toys recommended for?$$,   $$Each product lists its recommended age range on its page. You can also browse by age to quickly find the perfect fit.$$, $$Shop by age$$, $$/collections/by-age$$, 14),
  ($$Products$$,    $$What are the toys made from?$$,              $$Our toys are crafted from sustainably sourced neem wood, finished with natural, non-toxic colours and oils.$$, null, null, 15),
  ($$Products$$,    $$How do I clean and care for the toys?$$,     $$Wipe gently with a slightly damp cloth and dry immediately. Avoid soaking in water to keep the wood beautiful for years of play.$$, null, null, 16),
  ($$Products$$,    $$Do your toys come with a warranty?$$,        $$Yes — every toy is covered against manufacturing defects for 6 months from the date of delivery.$$, $$Warranty Policy$$, $$/policy/warranty$$, 17),
  ($$Bulk Orders$$, $$Do you offer bulk or wholesale orders?$$,    $$Yes! We work with preschools, retailers, and distributors with special pricing and dedicated support. Request a quote any time.$$, $$Bulk / B2B$$, $$/bulk$$, 18)
) as v(category, question, answer, link_label, link_href, sort)
where not exists (select 1 from faqs);
