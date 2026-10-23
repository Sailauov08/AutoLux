-- Customers, CRM pipeline, staff tasks and sales.

create type public.lead_stage as enum ('new', 'contacted', 'qualified', 'negotiation', 'won', 'lost');
create type public.sale_status as enum ('pending', 'completed', 'cancelled');

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  locale text not null default 'kk' check (locale in ('kk', 'ru', 'en')),
  notes text check (char_length(notes) <= 4000),
  privacy_consent_at timestamptz,
  anonymized_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, dealership_id)
);
create unique index customers_email_key on public.customers (dealership_id, lower(email)) where email is not null;
create unique index customers_user_key on public.customers (dealership_id, user_id) where user_id is not null;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  customer_id uuid not null,
  vehicle_id uuid,
  source text not null check (source in ('inquiry', 'test_drive', 'reservation', 'financing', 'trade_in', 'service',
    'manual', 'phone', 'walk_in', 'whatsapp', 'referral')),
  request_kind text,
  request_id uuid,
  stage public.lead_stage not null default 'new',
  assigned_to uuid references auth.users (id) on delete set null,
  follow_up_at timestamptz,
  negotiation_price bigint check (negotiation_price > 0),
  lost_reason text check (char_length(lost_reason) <= 500),
  won_sale_id uuid,
  closed_at timestamptz,
  version integer not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, dealership_id),
  foreign key (customer_id, dealership_id) references public.customers (id, dealership_id) on delete restrict,
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete restrict,
  check (stage <> 'lost' or lost_reason is not null)
);
create index leads_pipeline_idx on public.leads (dealership_id, stage);
create index leads_assigned_idx on public.leads (assigned_to, stage);
create index leads_follow_up_idx on public.leads (dealership_id, follow_up_at) where follow_up_at is not null;
create index leads_customer_idx on public.leads (customer_id);

create table public.lead_activities (
  id bigint generated always as identity primary key,
  dealership_id uuid not null,
  lead_id uuid not null,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('note', 'call', 'email', 'meeting', 'whatsapp', 'stage_change', 'assignment',
    'follow_up', 'sale', 'request', 'system')),
  body text check (char_length(body) <= 4000),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (lead_id, dealership_id) references public.leads (id, dealership_id) on delete cascade
);
create index lead_activities_lead_idx on public.lead_activities (lead_id, created_at desc);
create index lead_activities_recent_idx on public.lead_activities (dealership_id, created_at desc);

create table public.staff_tasks (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  assigned_to uuid not null references auth.users (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  lead_id uuid,
  title text not null check (char_length(title) between 2 and 200),
  notes text check (char_length(notes) <= 2000),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (lead_id, dealership_id) references public.leads (id, dealership_id) on delete cascade
);
create index staff_tasks_open_idx on public.staff_tasks (assigned_to, due_at) where completed_at is null;

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.new_reference(),
  dealership_id uuid not null references public.dealerships (id) on delete restrict,
  vehicle_id uuid not null,
  customer_id uuid not null,
  lead_id uuid,
  salesperson_id uuid references auth.users (id) on delete set null,
  agreed_price bigint not null check (agreed_price between 1 and 100000000000),
  currency text not null default 'KZT' check (currency ~ '^[A-Z]{3}$'),
  status public.sale_status not null default 'pending',
  sale_date date not null default current_date,
  notes text check (char_length(notes) <= 4000),
  cancel_reason text check (char_length(cancel_reason) <= 500),
  cancelled_at timestamptz,
  version integer not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete restrict,
  foreign key (customer_id, dealership_id) references public.customers (id, dealership_id) on delete restrict,
  foreign key (lead_id, dealership_id) references public.leads (id, dealership_id) on delete set null (lead_id)
);
create unique index sales_active_vehicle_key on public.sales (vehicle_id) where status in ('pending', 'completed');
create index sales_date_idx on public.sales (dealership_id, sale_date desc);

create table public.sale_events (
  id bigint generated always as identity primary key,
  dealership_id uuid not null,
  sale_id uuid not null references public.sales (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('created', 'completed', 'corrected', 'cancelled')),
  reason text check (char_length(reason) <= 500),
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index sale_events_sale_idx on public.sale_events (sale_id, created_at desc);

alter table public.leads add constraint leads_won_sale_fk foreign key (won_sale_id) references public.sales (id) on delete set null;

create trigger touch_customers before update on public.customers for each row execute function public.touch_updated_at();
create trigger version_customers before update on public.customers for each row execute function public.bump_version();
create trigger touch_tasks before update on public.staff_tasks for each row execute function public.touch_updated_at();
create trigger touch_sales before update on public.sales for each row execute function public.touch_updated_at();
create trigger version_sales before update on public.sales for each row execute function public.bump_version();
create trigger audit_sales after insert or update on public.sales for each row execute function public.write_audit();

-- Lead integrity and activity log ------------------------------------------------

create function public.guard_lead_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.version := 1;
  else
    if new.dealership_id <> old.dealership_id or new.customer_id <> old.customer_id then
      perform public.raise_app_error('forbidden');
    end if;
    if public.is_direct_write() and new.assigned_to is distinct from old.assigned_to
       and not public.has_perm(new.dealership_id, 'leads.assign') then
      perform public.raise_app_error('forbidden');
    end if;
    if public.is_direct_write() and new.won_sale_id is distinct from old.won_sale_id then
      perform public.raise_app_error('forbidden');
    end if;
    if public.is_direct_write() and not public.has_perm(new.dealership_id, 'leads.update')
       and row(new.stage, new.follow_up_at, new.negotiation_price, new.lost_reason, new.vehicle_id)
           is distinct from row(old.stage, old.follow_up_at, old.negotiation_price, old.lost_reason, old.vehicle_id) then
      perform public.raise_app_error('forbidden');
    end if;
    if public.is_direct_write() and new.stage = 'won' and old.stage <> 'won' then
      perform public.raise_app_error('use_sale');
    end if;
    new.version := old.version + 1;
    new.updated_at := now();
  end if;
  if new.assigned_to is not null and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to)
     and not public.is_active_member(new.dealership_id, new.assigned_to) then
    perform public.raise_app_error('invalid_assignee');
  end if;
  if new.stage in ('won', 'lost') then
    new.closed_at := coalesce(case when tg_op = 'UPDATE' and old.stage = new.stage then old.closed_at end, now());
    new.follow_up_at := null;
  else
    new.closed_at := null;
    new.lost_reason := null;
  end if;
  return new;
end;
$$;

create trigger guard_lead_write before insert or update on public.leads
  for each row execute function public.guard_lead_write();

create function public.log_lead_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.assigned_to is not null then
      perform public.notify_user(new.dealership_id, new.assigned_to, 'lead.assigned', jsonb_build_object('lead_id', new.id));
    end if;
    return new;
  end if;
  if new.stage is distinct from old.stage then
    insert into public.lead_activities (dealership_id, lead_id, actor_id, kind, meta, body)
    values (new.dealership_id, new.id, auth.uid(), 'stage_change', jsonb_build_object('from', old.stage, 'to', new.stage), new.lost_reason);
  end if;
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.lead_activities (dealership_id, lead_id, actor_id, kind, meta)
    values (new.dealership_id, new.id, auth.uid(), 'assignment', jsonb_build_object('from', old.assigned_to, 'to', new.assigned_to));
    perform public.notify_user(new.dealership_id, new.assigned_to, 'lead.assigned', jsonb_build_object('lead_id', new.id));
  end if;
  if new.follow_up_at is distinct from old.follow_up_at and new.follow_up_at is not null then
    insert into public.lead_activities (dealership_id, lead_id, actor_id, kind, meta)
    values (new.dealership_id, new.id, auth.uid(), 'follow_up', jsonb_build_object('at', new.follow_up_at));
  end if;
  return new;
end;
$$;

create trigger log_lead_change after insert or update on public.leads
  for each row execute function public.log_lead_change();

create function public.guard_task_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to)
     and not public.is_active_member(new.dealership_id, new.assigned_to) then
    perform public.raise_app_error('invalid_assignee');
  end if;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    if new.assigned_to <> auth.uid() and not public.has_perm(new.dealership_id, 'tasks.manage') then
      perform public.raise_app_error('forbidden');
    end if;
  elsif new.dealership_id <> old.dealership_id or new.created_by is distinct from old.created_by
     or (new.assigned_to <> old.assigned_to and not public.has_perm(new.dealership_id, 'tasks.manage')) then
    perform public.raise_app_error('forbidden');
  end if;
  return new;
end;
$$;

create trigger guard_task_write before insert or update on public.staff_tasks
  for each row execute function public.guard_task_write();

create function public.notify_task_assigned() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify_user(new.dealership_id, new.assigned_to, 'task.assigned', jsonb_build_object('title', new.title));
  return new;
end;
$$;

create trigger notify_task_assigned after insert on public.staff_tasks
  for each row execute function public.notify_task_assigned();

-- Customers --------------------------------------------------------------------

create function public.upsert_customer(p_dealership uuid, p_name text, p_email text, p_phone text, p_locale text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
  account_email text;
  clean_email text := nullif(lower(trim(p_email)), '');
  clean_phone text := nullif(trim(p_phone), '');
begin
  if auth.uid() is not null then
    select lower(email) into account_email from auth.users where id = auth.uid();
  end if;
  if clean_email is not null then
    select id into cid from public.customers where dealership_id = p_dealership and lower(email) = clean_email;
  end if;
  if cid is null then
    insert into public.customers (dealership_id, user_id, full_name, email, phone, locale, privacy_consent_at)
    values (p_dealership, case when account_email = clean_email then auth.uid() end, left(trim(p_name), 120),
            clean_email, clean_phone, coalesce(p_locale, 'kk'), now())
    returning id into cid;
  else
    update public.customers
       set phone = coalesce(phone, clean_phone),
           user_id = coalesce(user_id, case when account_email = clean_email then auth.uid() end),
           privacy_consent_at = now()
     where id = cid and anonymized_at is null;
  end if;
  return cid;
end;
$$;

create function public.anonymize_customer(p_customer uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.customers;
begin
  select * into c from public.customers where id = p_customer for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(c.dealership_id, 'customers.delete');
  update public.customers
     set full_name = 'Anonymised', email = null, phone = null, notes = null, user_id = null, anonymized_at = now()
   where id = c.id;
  update public.inquiries set contact = '{}'::jsonb, message = '[removed]' where customer_id = c.id;
  update public.test_drives set contact = '{}'::jsonb, notes = null where customer_id = c.id;
  update public.reservations set contact = '{}'::jsonb, message = null where customer_id = c.id;
  update public.financing_requests set contact = '{}'::jsonb where customer_id = c.id;
  update public.trade_in_requests set contact = '{}'::jsonb where customer_id = c.id;
  update public.service_appointments set contact = '{}'::jsonb, notes = null where customer_id = c.id;
  update public.lead_activities set body = null where lead_id in (select id from public.leads where customer_id = c.id) and kind in ('note', 'call', 'email', 'meeting', 'whatsapp');
  insert into public.audit_logs (dealership_id, actor_id, action, entity, record_id)
  values (c.dealership_id, auth.uid(), 'anonymize', 'customers', c.id::text);
end;
$$;

create function public.create_manual_lead(
  p_dealership uuid, p_name text, p_email text, p_phone text, p_vehicle uuid, p_source text, p_assignee uuid, p_note text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
  lid uuid;
  assignee uuid := p_assignee;
begin
  perform public.require_perm(p_dealership, 'leads.create');
  if p_vehicle is not null and not exists (select 1 from public.vehicles where id = p_vehicle and dealership_id = p_dealership) then
    perform public.raise_app_error('not_found');
  end if;
  if char_length(coalesce(trim(p_name), '')) < 2 or (nullif(trim(p_email), '') is null and nullif(trim(p_phone), '') is null) then
    perform public.raise_app_error('invalid');
  end if;
  if p_source not in ('manual', 'phone', 'walk_in', 'whatsapp', 'referral') then
    perform public.raise_app_error('invalid');
  end if;
  if not public.has_perm(p_dealership, 'leads.assign') then
    assignee := auth.uid();
  end if;
  cid := public.upsert_customer(p_dealership, p_name, p_email, p_phone, 'kk');
  insert into public.leads (dealership_id, customer_id, vehicle_id, source, assigned_to)
  values (p_dealership, cid, p_vehicle, p_source, assignee)
  returning id into lid;
  if nullif(trim(p_note), '') is not null then
    insert into public.lead_activities (dealership_id, lead_id, actor_id, kind, body)
    values (p_dealership, lid, auth.uid(), 'note', left(trim(p_note), 4000));
  end if;
  return lid;
end;
$$;

-- Sales --------------------------------------------------------------------------

create function public.record_sale(
  p_vehicle uuid, p_customer uuid, p_lead uuid, p_salesperson uuid, p_price bigint, p_sale_date date,
  p_status public.sale_status, p_notes text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v public.vehicles;
  sale_id uuid;
  seller uuid := coalesce(p_salesperson, auth.uid());
begin
  select * into v from public.vehicles where id = p_vehicle for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(v.dealership_id, 'sales.create');
  if p_status not in ('pending', 'completed') or p_price is null or p_price < 1 then
    perform public.raise_app_error('invalid');
  end if;
  if p_sale_date is null or p_sale_date > current_date + 1 then
    perform public.raise_app_error('invalid_date');
  end if;
  if not exists (select 1 from public.customers where id = p_customer and dealership_id = v.dealership_id and anonymized_at is null) then
    perform public.raise_app_error('not_found');
  end if;
  if p_lead is not null and not exists (
    select 1 from public.leads where id = p_lead and dealership_id = v.dealership_id and customer_id = p_customer) then
    perform public.raise_app_error('not_found');
  end if;
  if not public.is_active_member(v.dealership_id, seller) then
    perform public.raise_app_error('invalid_assignee');
  end if;
  if v.status not in ('available', 'reserved') then
    perform public.raise_app_error('vehicle_unavailable');
  end if;
  if exists (select 1 from public.reservations where vehicle_id = v.id and status = 'confirmed' and customer_id <> p_customer) then
    perform public.raise_app_error('vehicle_reserved');
  end if;

  insert into public.sales (dealership_id, vehicle_id, customer_id, lead_id, salesperson_id, agreed_price, currency,
                            status, sale_date, notes, created_by)
  values (v.dealership_id, v.id, p_customer, p_lead, seller, p_price,
          (select currency from public.dealerships where id = v.dealership_id), p_status, p_sale_date,
          nullif(trim(p_notes), ''), auth.uid())
  returning id into sale_id;

  insert into public.sale_events (dealership_id, sale_id, actor_id, kind, changes)
  values (v.dealership_id, sale_id, auth.uid(), 'created', jsonb_build_object('price', p_price, 'status', p_status));

  update public.vehicles
     set status = case when p_status = 'completed' then 'sold'::public.vehicle_status else 'reserved'::public.vehicle_status end,
         sold_at = case when p_status = 'completed' then now() end,
         featured = false
   where id = v.id;

  update public.reservations set status = 'completed'
   where vehicle_id = v.id and customer_id = p_customer and status in ('new', 'in_progress', 'confirmed');

  if p_lead is not null then
    update public.leads set stage = 'won', won_sale_id = sale_id, vehicle_id = v.id, negotiation_price = p_price
     where id = p_lead;
    insert into public.lead_activities (dealership_id, lead_id, actor_id, kind, meta)
    values (v.dealership_id, p_lead, auth.uid(), 'sale', jsonb_build_object('sale_id', sale_id, 'price', p_price));
  end if;
  return sale_id;
end;
$$;

create function public.complete_sale(p_sale uuid, p_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.sales;
begin
  select * into s from public.sales where id = p_sale for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(s.dealership_id, 'sales.update');
  if s.version <> p_version then
    perform public.raise_app_error('conflict');
  end if;
  if s.status <> 'pending' then
    perform public.raise_app_error('invalid_transition');
  end if;
  update public.sales set status = 'completed' where id = s.id;
  update public.vehicles set status = 'sold', sold_at = now(), featured = false where id = s.vehicle_id;
  insert into public.sale_events (dealership_id, sale_id, actor_id, kind) values (s.dealership_id, s.id, auth.uid(), 'completed');
end;
$$;

create function public.cancel_sale(p_sale uuid, p_version integer, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.sales;
begin
  select * into s from public.sales where id = p_sale for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(s.dealership_id, 'sales.cancel');
  if s.version <> p_version then
    perform public.raise_app_error('conflict');
  end if;
  if s.status = 'cancelled' then
    perform public.raise_app_error('invalid_transition');
  end if;
  if char_length(coalesce(trim(p_reason), '')) < 3 then
    perform public.raise_app_error('reason_required');
  end if;
  perform 1 from public.vehicles where id = s.vehicle_id for update;
  update public.sales set status = 'cancelled', cancel_reason = trim(p_reason), cancelled_at = now() where id = s.id;
  update public.vehicles set status = 'available', sold_at = null
   where id = s.vehicle_id and status in ('reserved', 'sold');
  update public.leads set stage = 'negotiation', won_sale_id = null where won_sale_id = s.id;
  insert into public.sale_events (dealership_id, sale_id, actor_id, kind, reason)
  values (s.dealership_id, s.id, auth.uid(), 'cancelled', trim(p_reason));
end;
$$;

create function public.correct_sale(
  p_sale uuid, p_version integer, p_price bigint, p_sale_date date, p_salesperson uuid, p_notes text, p_reason text
) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.sales;
begin
  select * into s from public.sales where id = p_sale for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(s.dealership_id, 'sales.update');
  if s.version <> p_version then
    perform public.raise_app_error('conflict');
  end if;
  if s.status = 'cancelled' then
    perform public.raise_app_error('invalid_transition');
  end if;
  if char_length(coalesce(trim(p_reason), '')) < 3 then
    perform public.raise_app_error('reason_required');
  end if;
  if p_price is null or p_price < 1 or p_sale_date is null or p_sale_date > current_date + 1 then
    perform public.raise_app_error('invalid');
  end if;
  if p_salesperson is not null and not public.is_active_member(s.dealership_id, p_salesperson) then
    perform public.raise_app_error('invalid_assignee');
  end if;
  update public.sales
     set agreed_price = p_price, sale_date = p_sale_date, salesperson_id = coalesce(p_salesperson, salesperson_id),
         notes = nullif(trim(p_notes), '')
   where id = s.id;
  insert into public.sale_events (dealership_id, sale_id, actor_id, kind, reason, changes)
  values (s.dealership_id, s.id, auth.uid(), 'corrected', trim(p_reason), jsonb_build_object(
    'price', jsonb_build_object('from', s.agreed_price, 'to', p_price),
    'sale_date', jsonb_build_object('from', s.sale_date, 'to', p_sale_date),
    'salesperson', jsonb_build_object('from', s.salesperson_id, 'to', coalesce(p_salesperson, s.salesperson_id))));
end;
$$;

-- Row level security ------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.staff_tasks enable row level security;
alter table public.sales enable row level security;
alter table public.sale_events enable row level security;

create policy customers_read on public.customers for select using (
  user_id = auth.uid()
  or public.has_perm(dealership_id, 'customers.read')
  or (public.has_perm(dealership_id, 'leads.read_own') and exists (
    select 1 from public.leads l where l.customer_id = customers.id and l.assigned_to = auth.uid()))
);
create policy customers_update on public.customers for update
  using (public.has_perm(dealership_id, 'customers.update'))
  with check (public.has_perm(dealership_id, 'customers.update') and anonymized_at is null);

create policy leads_read on public.leads for select using (
  public.has_perm(dealership_id, 'leads.read_all')
  or (assigned_to = auth.uid() and public.has_perm(dealership_id, 'leads.read_own'))
);
create policy leads_update on public.leads for update
  using (public.has_perm(dealership_id, 'leads.update') and (
    public.has_perm(dealership_id, 'leads.read_all') or assigned_to = auth.uid()))
  with check (public.has_perm(dealership_id, 'leads.update') or public.has_perm(dealership_id, 'leads.assign'));
create policy leads_assign on public.leads for update
  using (public.has_perm(dealership_id, 'leads.assign') and public.has_perm(dealership_id, 'leads.read_all'))
  with check (public.has_perm(dealership_id, 'leads.assign'));

create policy lead_activities_read on public.lead_activities for select
  using (exists (select 1 from public.leads l where l.id = lead_id));
create policy lead_activities_insert on public.lead_activities for insert with check (
  actor_id = auth.uid()
  and kind in ('note', 'call', 'email', 'meeting', 'whatsapp')
  and public.has_perm(dealership_id, 'leads.update')
  and exists (select 1 from public.leads l where l.id = lead_id)
);

create policy tasks_read on public.staff_tasks for select using (
  public.is_member(dealership_id) and (
    assigned_to = auth.uid() or created_by = auth.uid() or public.has_perm(dealership_id, 'tasks.read_all'))
);
create policy tasks_insert on public.staff_tasks for insert with check (public.is_member(dealership_id));
create policy tasks_update on public.staff_tasks for update
  using (public.is_member(dealership_id) and (assigned_to = auth.uid() or public.has_perm(dealership_id, 'tasks.manage')))
  with check (public.is_member(dealership_id));
create policy tasks_delete on public.staff_tasks for delete
  using (public.is_member(dealership_id) and (created_by = auth.uid() or public.has_perm(dealership_id, 'tasks.manage')));

create policy sales_read on public.sales for select using (
  public.has_perm(dealership_id, 'sales.read') or (salesperson_id = auth.uid() and public.is_member(dealership_id))
);
create policy sale_events_read on public.sale_events for select
  using (exists (select 1 from public.sales s where s.id = sale_id));
