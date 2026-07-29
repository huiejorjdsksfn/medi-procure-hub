-- Upgrade the default system theme palette to a more distinctive,
-- modern 2026 ERP colour set. The previous defaults (navy #0a2558,
-- burnt-orange accent #C45911, dark muted success/warning #166534 /
-- #92400e) read as dated/desaturated. New palette:
--   primary:  #4F46E5  (indigo-600 — vivid, distinct from every fixed
--                        module ribbon colour already in use)
--   accent:   #EA580C  (orange-600)
--   success:  #16A34A  (green-600)
--   warning:  #D97706  (amber-600)
--   danger:   #DC2626  (unchanged — was already a good, modern red)
-- Neutrals (page/card/border/text) are left as-is; they were already
-- a solid, modern Tailwind-slate-based set.
insert into system_settings (key, value, category) values
  ('primary_color', '#4F46E5', 'theme'),
  ('accent_color',  '#EA580C', 'theme'),
  ('success_color', '#16A34A', 'theme'),
  ('warning_color', '#D97706', 'theme'),
  ('danger_color',  '#DC2626', 'theme')
on conflict (key) do update set value = excluded.value;

NOTIFY pgrst, 'reload schema';
