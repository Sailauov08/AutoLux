-- Dealership tenancy, staff membership, permission matrix, profiles, audit and notifications.

create type public.staff_role as enum (
  'owner', 'general_manager', 'sales_manager', 'sales_rep', 'inventory_manager', 'finance_manager', 'receptionist'
);
create type public.member_status as enum ('active', 'suspended');

create table public.dealerships (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  name text not null check (char_length(name) between 2 and 120),
  legal_name text check (char_length(legal_name) <= 160),
  logo_url text check (logo_url ~ '^https://'),
  logo_path text,
  phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  whatsapp text check (whatsapp ~ '^\+?[0-9]{7,15}$'),
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  maps_url text check (maps_url ~ '^https://'),
  hours jsonb not null default '{}'::jsonb check (jsonb_typeof(hours) = 'object'),
  socials jsonb not null default '[]'::jsonb check (jsonb_typeof(socials) = 'array'),
  services text[] not null default array['maintenance', 'inspection', 'detailing', 'tyres', 'repair']
    check (services <@ array['maintenance', 'inspection', 'detailing', 'tyres', 'repair']),
  currency text not null default 'KZT' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'Asia/Almaty' check (char_length(timezone) between 3 and 64),
  show_sold_vehicles boolean not null default true,
  price_approval_required boolean not null default true,
  booking_slots text[] not null default array['10:00', '11:30', '13:00', '14:30', '16:00', '17:30']
    check (array_length(booking_slots, 1) between 1 and 24),
  booking_window_days smallint not null default 90 check (booking_window_days between 1 and 365),
  reservation_hold_hours smallint not null default 48 check (reservation_hold_hours between 1 and 720),
  service_capacity smallint not null default 2 check (service_capacity between 1 and 50),
  service_enabled boolean not null default true,
  test_drive_enabled boolean not null default true,
  notify_new_leads boolean not null default true,
  notification_email text check (notification_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  retention_months smallint not null default 36 check (retention_months between 6 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  description text not null
);

insert into public.permissions (key, description) values
  ('inventory.read', 'View all vehicles including drafts and archived stock'),
  ('inventory.create', 'Add vehicles'),
  ('inventory.update', 'Edit vehicle details and lifecycle'),
  ('inventory.delete', 'Archive vehicles and delete unused drafts'),
  ('inventory.publish', 'Publish, unpublish and feature vehicles'),
  ('inventory.price', 'Change prices (subject to approval settings)'),
  ('inventory.price_request', 'Submit price change requests'),
  ('inventory.price_approve', 'Approve price changes and change prices directly'),
  ('inventory.private', 'View and edit VIN, stock number and internal notes'),
  ('media.update', 'Upload, reorder and delete vehicle photos'),
  ('customers.read', 'View all customer profiles'),
  ('customers.update', 'Edit customer profiles'),
  ('customers.delete', 'Anonymise customer personal data'),
  ('leads.read_all', 'View every lead'),
  ('leads.read_own', 'View leads assigned to me'),
  ('leads.create', 'Create leads'),
  ('leads.update', 'Update leads I can see'),
  ('leads.assign', 'Assign and reassign leads'),
  ('tasks.read_all', 'View every staff task'),
  ('tasks.manage', 'Create tasks for other employees'),
  ('sales.read', 'View sales records'),
  ('sales.create', 'Record sales'),
  ('sales.update', 'Complete and correct sales'),
  ('sales.cancel', 'Cancel sales'),
  ('bookings.read', 'View test drives and service appointments'),
  ('bookings.update', 'Confirm, reschedule and close appointments'),
  ('reservations.read', 'View vehicle reservations'),
  ('reservations.update', 'Confirm and release vehicle reservations'),
  ('inquiries.read', 'View contact inquiries'),
  ('inquiries.update', 'Handle contact inquiries'),
  ('finance.read', 'View financing applications'),
  ('finance.update', 'Handle financing applications'),
  ('tradein.read', 'View trade-in submissions'),
  ('tradein.update', 'Handle trade-in submissions'),
  ('team.read', 'View employees'),
  ('team.manage', 'Invite, suspend and change employee roles'),
  ('settings.update', 'Edit dealership settings'),
  ('analytics.read', 'View operational analytics'),
  ('analytics.financial', 'View sales values and financial metrics'),
  ('audit.read', 'View the audit log');

create table public.role_rank (
  role public.staff_role primary key,
  rank smallint not null
);
insert into public.role_rank values
  ('owner', 0), ('general_manager', 1), ('sales_manager', 2), ('inventory_manager', 2),
  ('finance_manager', 2), ('receptionist', 3), ('sales_rep', 3);

create table public.default_role_permissions (
  role public.staff_role not null,
  permission text not null references public.permissions (key) on delete cascade,
  primary key (role, permission)
);

insert into public.default_role_permissions (role, permission)
select 'owner', key from public.permissions;

insert into public.default_role_permissions (role, permission)
select 'general_manager', key from public.permissions where key <> 'settings.update';

insert into public.default_role_permissions (role, permission) values
  ('sales_manager', 'inventory.read'), ('sales_manager', 'inventory.price_request'),
  ('sales_manager', 'customers.read'), ('sales_manager', 'customers.update'),
  ('sales_manager', 'leads.read_all'), ('sales_manager', 'leads.read_own'), ('sales_manager', 'leads.create'),
  ('sales_manager', 'leads.update'), ('sales_manager', 'leads.assign'),
  ('sales_manager', 'tasks.read_all'), ('sales_manager', 'tasks.manage'),
  ('sales_manager', 'sales.read'), ('sales_manager', 'sales.create'), ('sales_manager', 'sales.update'),
  ('sales_manager', 'bookings.read'), ('sales_manager', 'bookings.update'),
  ('sales_manager', 'reservations.read'), ('sales_manager', 'reservations.update'),
  ('sales_manager', 'inquiries.read'), ('sales_manager', 'inquiries.update'),
  ('sales_manager', 'finance.read'), ('sales_manager', 'tradein.read'), ('sales_manager', 'tradein.update'),
  ('sales_manager', 'team.read'), ('sales_manager', 'analytics.read'), ('sales_manager', 'analytics.financial'),

  ('sales_rep', 'inventory.read'), ('sales_rep', 'leads.read_own'), ('sales_rep', 'leads.create'),
  ('sales_rep', 'leads.update'), ('sales_rep', 'bookings.read'), ('sales_rep', 'bookings.update'),
  ('sales_rep', 'reservations.read'),

  ('inventory_manager', 'inventory.read'), ('inventory_manager', 'inventory.create'),
  ('inventory_manager', 'inventory.update'), ('inventory_manager', 'inventory.delete'),
  ('inventory_manager', 'inventory.publish'), ('inventory_manager', 'inventory.price'),
  ('inventory_manager', 'inventory.price_request'), ('inventory_manager', 'inventory.private'),
  ('inventory_manager', 'media.update'), ('inventory_manager', 'reservations.read'),
  ('inventory_manager', 'analytics.read'),

  ('finance_manager', 'inventory.read'), ('finance_manager', 'customers.read'),
  ('finance_manager', 'finance.read'), ('finance_manager', 'finance.update'),
  ('finance_manager', 'tradein.read'), ('finance_manager', 'tradein.update'),
  ('finance_manager', 'sales.read'), ('finance_manager', 'analytics.read'), ('finance_manager', 'analytics.financial'),

  ('receptionist', 'inventory.read'), ('receptionist', 'customers.read'),
  ('receptionist', 'leads.read_all'), ('receptionist', 'leads.read_own'), ('receptionist', 'leads.create'),
  ('receptionist', 'leads.assign'), ('receptionist', 'bookings.read'), ('receptionist', 'bookings.update'),
  ('receptionist', 'reservations.read'), ('receptionist', 'inquiries.read'), ('receptionist', 'inquiries.update');

create table public.role_permissions (
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  role public.staff_role not null,
  permission text not null references public.permissions (key) on delete cascade,
  primary key (dealership_id, role, permission)
);

create table public.memberships (
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.staff_role not null,
  status public.member_status not null default 'active',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (dealership_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  locale text not null default 'kk' check (locale in ('kk', 'ru', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  dealership_id uuid references public.dealerships (id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity text not null,
  record_id text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_dealership_idx on public.audit_logs (dealership_id, created_at desc);

create table public.notifications (
  id bigint generated always as identity primary key,
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (char_length(kind) <= 60),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.rate_limits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_limits_key_idx on public.rate_limits (key, created_at desc);

-- Helpers --------------------------------------------------------------------

create function public.raise_app_error(p_code text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception '%', p_code using errcode = 'P0001', hint = p_code;
end;
$$;

create function public.new_reference() returns text
language sql volatile set search_path = '' as $$
  select 'AL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

create function public.member_role(p_dealership uuid) returns public.staff_role
language sql stable security definer set search_path = '' as $$
  select role from public.memberships
   where dealership_id = p_dealership and user_id = auth.uid() and status = 'active'
$$;

create function public.is_member(p_dealership uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
     where dealership_id = p_dealership and user_id = auth.uid() and status = 'active'
  )
$$;

create function public.has_perm(p_dealership uuid, p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.memberships m
      join public.role_permissions rp on rp.dealership_id = m.dealership_id and rp.role = m.role
     where m.dealership_id = p_dealership
       and m.user_id = auth.uid()
       and m.status = 'active'
       and rp.permission = p_permission
  )
$$;

create function public.require_perm(p_dealership uuid, p_permission text) returns void
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then
    perform public.raise_app_error('auth_required');
  end if;
  if not public.has_perm(p_dealership, p_permission) then
    perform public.raise_app_error('forbidden');
  end if;
end;
$$;

create function public.is_active_member(p_dealership uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  -- Only staff of the same dealership may ask, so outsiders cannot probe who works there.
  select public.is_member(p_dealership) and exists (
    select 1 from public.memberships
     where dealership_id = p_dealership and user_id = p_user and status = 'active'
  )
$$;

create function public.my_permissions(p_dealership uuid) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(rp.permission order by rp.permission), '{}')
    from public.memberships m
    join public.role_permissions rp on rp.dealership_id = m.dealership_id and rp.role = m.role
   where m.dealership_id = p_dealership and m.user_id = auth.uid() and m.status = 'active'
$$;

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.bump_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

create function public.enforce_rate_limit(p_key text, p_max integer, p_window interval) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.rate_limits where created_at < now() - interval '1 day';
  if (select count(*) from public.rate_limits where key = p_key and created_at > now() - p_window) >= p_max then
    perform public.raise_app_error('rate_limited');
  end if;
  insert into public.rate_limits (key) values (p_key);
end;
$$;

create function public.write_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
  diff jsonb;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}'::jsonb)
      into diff
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o using (key)
     where n.value is distinct from o.value and n.key not in ('updated_at', 'version');
    if diff = '{}'::jsonb then
      return new;
    end if;
  else
    diff := rec;
  end if;

  insert into public.audit_logs (dealership_id, actor_id, action, entity, record_id, changes)
  values (
    coalesce((rec ->> 'dealership_id')::uuid, case when tg_table_name = 'dealerships' then (rec ->> 'id')::uuid end),
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'user_id', rec ->> 'vehicle_id'),
    diff
  );
  return coalesce(new, old);
end;
$$;

create function public.notify_members(p_dealership uuid, p_permission text, p_kind text, p_payload jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (dealership_id, user_id, kind, payload)
  select distinct m.dealership_id, m.user_id, p_kind, p_payload
    from public.memberships m
    join public.role_permissions rp on rp.dealership_id = m.dealership_id and rp.role = m.role
   where m.dealership_id = p_dealership and m.status = 'active' and rp.permission = p_permission
     and m.user_id is distinct from auth.uid()
$$;

create function public.notify_user(p_dealership uuid, p_user uuid, p_kind text, p_payload jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (dealership_id, user_id, kind, payload)
  select p_dealership, p_user, p_kind, p_payload
   where p_user is not null and p_user is distinct from auth.uid()
$$;

create function public.seed_role_permissions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.role_permissions (dealership_id, role, permission)
  select new.id, role, permission from public.default_role_permissions;
  return new;
end;
$$;

create trigger seed_role_permissions after insert on public.dealerships
  for each row execute function public.seed_role_permissions();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), ''),
    case when new.raw_user_meta_data ->> 'locale' in ('kk', 'ru', 'en') then new.raw_user_meta_data ->> 'locale' else 'kk' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger touch_dealerships before update on public.dealerships for each row execute function public.touch_updated_at();
create trigger touch_memberships before update on public.memberships for each row execute function public.touch_updated_at();
create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();

create trigger audit_dealerships after update on public.dealerships for each row execute function public.write_audit();
create trigger audit_memberships after insert or update or delete on public.memberships for each row execute function public.write_audit();
create trigger audit_role_permissions after insert or delete on public.role_permissions for each row execute function public.write_audit();

-- Membership integrity: never leave a dealership without an active owner.
create function public.guard_last_owner() returns trigger
language plpgsql set search_path = '' as $$
declare target uuid := coalesce(old.dealership_id, new.dealership_id);
begin
  if old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active')
     and not exists (
       select 1 from public.memberships
        where dealership_id = target and role = 'owner' and status = 'active' and user_id <> old.user_id
     ) then
    perform public.raise_app_error('last_owner');
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_last_owner before update or delete on public.memberships
  for each row execute function public.guard_last_owner();

-- Row level security ------------------------------------------------------------

alter table public.dealerships enable row level security;
alter table public.permissions enable row level security;
alter table public.role_rank enable row level security;
alter table public.default_role_permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.rate_limits enable row level security;

create policy dealerships_read on public.dealerships for select using (true);
create policy dealerships_update on public.dealerships for update
  using (public.has_perm(id, 'settings.update')) with check (public.has_perm(id, 'settings.update'));

create policy permissions_read on public.permissions for select using (true);
create policy role_rank_read on public.role_rank for select using (true);
create policy default_role_permissions_read on public.default_role_permissions for select using (auth.uid() is not null);
create policy role_permissions_read on public.role_permissions for select using (public.is_member(dealership_id));

create policy memberships_read on public.memberships for select
  using (user_id = auth.uid() or public.has_perm(dealership_id, 'team.read'));

create policy profiles_read on public.profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from public.memberships them
     where them.user_id = profiles.id and public.is_member(them.dealership_id)
  )
);
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy audit_read on public.audit_logs for select using (public.has_perm(dealership_id, 'audit.read'));

create policy notifications_read on public.notifications for select using (user_id = auth.uid());
create policy notifications_mark_read on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke select on public.dealerships from anon, authenticated;
grant select (
  id, slug, name, legal_name, logo_url, phone, email, whatsapp, address, maps_url, hours, socials, services,
  currency, timezone, show_sold_vehicles, booking_slots, booking_window_days, service_enabled, test_drive_enabled
) on public.dealerships to anon, authenticated;
