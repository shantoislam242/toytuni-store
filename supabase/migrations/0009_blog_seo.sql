-- Blog 3b: per-post SEO fields (focus keyword drives the editor's live score;
-- seo_title/meta_description/og_image override the storefront metadata).
alter table blog_posts add column if not exists focus_keyword text;
alter table blog_posts add column if not exists seo_title text;
alter table blog_posts add column if not exists meta_description text;
alter table blog_posts add column if not exists og_image text;
