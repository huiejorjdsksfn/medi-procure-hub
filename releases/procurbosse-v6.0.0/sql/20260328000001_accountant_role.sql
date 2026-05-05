-- ═══════════════════════════════════════════════════════════════════════════
-- ACCOUNTANT ROLE — Financial oversight, invoice matching, ERP sync bridge
-- EL5 MediProcure · Embu Level 5 Hospital
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Drop & recreate user_roles check constraint to include accountant
do $$ begin
  alter table public.user_roles drop constraint if exists user_roles_role_check;
exception when others then null;
end $$;

-- 2. Add accountant-specific columns to profiles
alter table public.profiles
  add column if not exists can_approve_invoices   boolean default false,
  add column if not exists can_export_payments    boolean default false,
  add column if not exists can_trigger_erp_sync   boolean default false,
  add column if not exists can_view_gl_accounts   boolean default false,
  add column if not exists can_approve_budgets    boolean default false,
  add column if not exists erp_sync_access        boolean default false;

-- 3. Create invoice_matching table for 3-way PO/GRN/Invoice matching
create table if not exists public.invoice_matching (
  id               uuid primary key default gen_random_uuid(),
  supplier_id      uuid references public.suppliers(id) on delete set null,
  supplier_name    text,
  invoice_number   text not null,
  invoice_date     date,
  invoice_amount   numeric(15,2) default 0,
  po_id            uuid,
  po_number        text,
  po_amount        numeric(15,2) default 0,
  grn_id           uuid,
  grn_number       text,
  grn_amount       numeric(15,2) default 0,
  variance         numeric(15,2) generated always as (invoice_amount - po_amount) stored,
  match_status     text default 'unmatched' check (match_status in ('matched','partial','unmatched','disputed','approved','rejected')),
  gl_code          text default '6100-PROCUREMENT',
  currency         text default 'KES',
  due_date         date,
  notes            text,
  approved_by      uuid references public.profiles(id),
  approved_at      timestamptz,
  rejected_by      uuid references public.profiles(id),
  rejected_at      timestamptz,
  rejection_reason text,
  erp_posted       boolean default false,
  erp_reference    text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.invoice_matching enable row level security;

create policy "Accountants and admins can manage invoice matching"
  on public.invoice_matching for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin','accountant','procurement_manager')
    )
  );

-- 4. Create payment_proposals table
create table if not exists public.payment_proposals (
  id               uuid primary key default gen_random_uuid(),
  proposal_number  text unique default 'PP-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,4),
  supplier_id      uuid references public.suppliers(id) on delete set null,
  supplier_name    text not null,
  total_amount     numeric(15,2) default 0,
  invoice_count    int default 0,
  bank_account     text,
  payment_method   text default 'EFT' check (payment_method in ('EFT','RTGS','Cheque','Cash','Mobile')),
  due_date         date,
  status           text default 'draft' check (status in ('draft','pending','approved','exported','paid','cancelled')),
  approved_by      uuid references public.profiles(id),
  approved_at      timestamptz,
  exported_at      timestamptz,
  export_reference text,
  notes            text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.payment_proposals enable row level security;

create policy "Accountants and admins can manage payment proposals"
  on public.payment_proposals for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin','accountant','procurement_manager')
    )
  );

-- 5. Create erp_sync_queue table for ERP integration audit trail
create table if not exists public.erp_sync_queue (
  id              uuid primary key default gen_random_uuid(),
  direction       text not null check (direction in ('push','pull')),
  entity_type     text not null,  -- purchase_orders | payment_vouchers | grn | vendor_master | gl_accounts
  entity_id       uuid,
  entity_ref      text,
  payload         jsonb default '{}',
  status          text default 'queued' check (status in ('queued','running','done','failed','skipped')),
  priority        int default 5,
  retry_count     int default 0,
  max_retries     int default 3,
  erp_system      text default 'Dynamics365',
  erp_endpoint    text,
  erp_response    jsonb,
  error_message   text,
  initiated_by    uuid references public.profiles(id),
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz default now()
);

alter table public.erp_sync_queue enable row level security;

create policy "Accountants and admins can manage ERP sync queue"
  on public.erp_sync_queue for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin','accountant','procurement_manager','database_admin')
    )
  );

-- 6. Create budget_control table
create table if not exists public.budget_control (
  id              uuid primary key default gen_random_uuid(),
  department      text not null,
  budget_line     text not null,
  fiscal_year     text default to_char(now(),'YYYY'),
  fiscal_period   text,
  allocated       numeric(15,2) default 0,
  consumed        numeric(15,2) default 0,
  reserved        numeric(15,2) default 0,
  available       numeric(15,2) generated always as (allocated - consumed - reserved) stored,
  percentage_used numeric(5,2)  generated always as (
    case when allocated > 0 then round((consumed / allocated) * 100, 2) else 0 end
  ) stored,
  alert_threshold numeric(5,2) default 80.00,
  gl_account      text,
  cost_centre     text,
  approved_by     uuid references public.profiles(id),
  status          text default 'active' check (status in ('active','frozen','closed')),
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(department, budget_line, fiscal_year)
);

alter table public.budget_control enable row level security;

create policy "Accountants, admins, and procurement managers can manage budgets"
  on public.budget_control for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin','accountant','procurement_manager')
    )
  );

-- 7. Create gl_postings table (journal entries from ERP)
create table if not exists public.gl_postings (
  id              uuid primary key default gen_random_uuid(),
  posting_date    date default current_date,
  gl_account      text not null,
  cost_centre     text,
  description     text,
  debit_amount    numeric(15,2) default 0,
  credit_amount   numeric(15,2) default 0,
  currency        text default 'KES',
  reference_type  text,  -- purchase_order | payment_voucher | grn | journal
  reference_id    uuid,
  reference_number text,
  erp_batch_id    text,
  erp_document_no text,
  posted_to_erp   boolean default false,
  posted_at       timestamptz,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now()
);

alter table public.gl_postings enable row level security;

create policy "Accountants and admins can manage GL postings"
  on public.gl_postings for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role in ('admin','accountant','procurement_manager')
    )
  );

-- 8. Seed accountant role permissions into existing roles tables (if they exist)
insert into public.roles (name, description, permissions) values (
  'accountant',
  'Financial accountant with invoice matching, payment management, budget control and ERP sync access',
  '["view_requisitions","view_purchase_orders","view_goods_received","view_suppliers",
    "manage_payment_vouchers","manage_receipt_vouchers","manage_journal_vouchers","manage_purchase_vouchers",
    "view_vouchers","approve_invoices","export_payments","manage_invoice_matching",
    "manage_payment_proposals","manage_budget_control","trigger_erp_sync","view_gl_accounts",
    "view_financials","manage_chart_of_accounts","manage_budgets","view_fixed_assets",
    "view_audit_log","view_reports","view_documents","manage_gl_postings","manage_erp_sync_queue"]'::jsonb
) on conflict (name) do update set
  description = excluded.description,
  permissions = excluded.permissions;

-- 9. RLS for accountant on existing tables
-- Allow accountants to view purchase orders
do $$ begin
  create policy "Accountants can view purchase_orders"
    on public.purchase_orders for select
    using (
      exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'accountant')
    );
exception when duplicate_object then null;
end $$;

-- Allow accountants to view goods_received
do $$ begin
  create policy "Accountants can view goods_received"
    on public.goods_received for select
    using (
      exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'accountant')
    );
exception when duplicate_object then null;
end $$;

-- Allow accountants to manage payment_vouchers
do $$ begin
  create policy "Accountants can manage payment_vouchers"
    on public.payment_vouchers for all
    using (
      exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'accountant')
    );
exception when duplicate_object then null;
end $$;

-- Allow accountants to view requisitions
do $$ begin
  create policy "Accountants can view requisitions"
    on public.requisitions for select
    using (
      exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'accountant')
    );
exception when duplicate_object then null;
end $$;

-- 10. Add indexes for performance
create index if not exists idx_invoice_matching_status    on public.invoice_matching(match_status);
create index if not exists idx_invoice_matching_supplier  on public.invoice_matching(supplier_name);
create index if not exists idx_payment_proposals_status   on public.payment_proposals(status);
create index if not exists idx_erp_sync_queue_status      on public.erp_sync_queue(status, direction);
create index if not exists idx_budget_control_dept        on public.budget_control(department, fiscal_year);
create index if not exists idx_gl_postings_account        on public.gl_postings(gl_account, posting_date);

-- 11. Enable realtime for new tables
alter publication supabase_realtime add table public.invoice_matching;
alter publication supabase_realtime add table public.payment_proposals;
alter publication supabase_realtime add table public.erp_sync_queue;
alter publication supabase_realtime add table public.budget_control;
alter publication supabase_realtime add table public.gl_postings;
