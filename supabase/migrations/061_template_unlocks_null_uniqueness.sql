-- Keep all-layout template grants unique too. The table-level unique
-- constraint allows duplicate NULL layout_id values in Postgres, so this
-- expression index closes that gap without changing the entitlement model.

delete from public.template_unlocks newer
using public.template_unlocks older
where newer.ctid > older.ctid
  and newer.business_id = older.business_id
  and coalesce(newer.layout_id, '__all_layouts__') = coalesce(older.layout_id, '__all_layouts__')
  and newer.theme_id = older.theme_id;

create unique index if not exists template_unlocks_business_layout_theme_uidx
  on public.template_unlocks (business_id, coalesce(layout_id, '__all_layouts__'), theme_id);
