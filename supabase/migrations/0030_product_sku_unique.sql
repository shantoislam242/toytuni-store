-- Product SKUs must be unique. First disambiguate any existing duplicates
-- (keep the earliest row's SKU, suffix the rest with -1, -2, …) so the unique
-- index can be created without failing, then add the index.

with ranked as (
  select id, sku, row_number() over (partition by sku order by id) as rn
  from products
)
update products p
set sku = p.sku || '-' || (r.rn - 1)
from ranked r
where p.id = r.id and r.rn > 1;

create unique index if not exists products_sku_unique on products (sku);
