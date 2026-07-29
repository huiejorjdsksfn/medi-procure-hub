-- CEO/CFO: new restricted, view-only executive tier (stats/trends
-- only — enforced app-side via ExecutiveGuard + AppLayout nav
-- filtering, not by DB grants, since these roles still need to SELECT
-- from the same reporting tables everyone else reads).
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ceo';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'cfo';
