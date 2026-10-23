-- Vehicle inventory: catalogue, private stock data, media, equipment, pricing and lifecycle.

create type public.vehicle_status as enum ('draft', 'available', 'reserved', 'sold', 'archived');

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  make text not null check (char_length(make) between 1 and 60),
  model text not null check (char_length(model) between 1 and 80),
  generation text check (char_length(generation) <= 60),
  trim_level text check (char_length(trim_level) <= 80),
  year smallint not null check (year between 1950 and 2100),
  body_type text not null check (body_type in ('Sedan', 'Coupe', 'SUV', 'Convertible', 'GT')),
  fuel text not null check (fuel in ('Gasoline', 'Diesel', 'Electric', 'Hybrid')),
  transmission text not null check (transmission in ('Automatic', 'Manual')),
  drivetrain text not null check (drivetrain in ('AWD', 'RWD', 'FWD', '4WD')),
  engine text not null check (char_length(engine) between 1 and 80),
  horsepower smallint not null check (horsepower between 1 and 3000),
  mileage integer not null default 0 check (mileage between 0 and 2000000),
  price bigint not null check (price between 1 and 100000000000),
  exterior_color text not null check (char_length(exterior_color) between 1 and 60),
  interior_color text check (char_length(interior_color) <= 60),
  condition text not null default 'used' check (condition in ('new', 'used', 'certified')),
  status public.vehicle_status not null default 'draft',
  published boolean not null default false,
  featured boolean not null default false,
  badges text[] not null default '{}' check (badges <@ array['Certified', 'Low Mileage', 'New Arrival', 'Rare']),
  description jsonb not null default '{}'::jsonb check (jsonb_typeof(description) = 'object'),
  published_at timestamptz,
  sold_at timestamptz,
  archived_at timestamptz,
  version integer not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dealership_id, slug),
  unique (id, dealership_id),
  check (not published or status in ('available', 'reserved', 'sold')),
  check (not featured or (published and status in ('available', 'reserved')))
);
create index vehicles_listing_idx on public.vehicles (dealership_id, status, published);
create index vehicles_make_idx on public.vehicles (dealership_id, make);

create table public.vehicle_private (
  vehicle_id uuid primary key,
  dealership_id uuid not null,
  vin text check (vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  stock_number text check (char_length(stock_number) <= 40),
  internal_notes text check (char_length(internal_notes) <= 4000),
  updated_at timestamptz not null default now(),
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete cascade
);
create unique index vehicle_private_vin_key on public.vehicle_private (dealership_id, vin) where vin is not null;

create table public.vehicle_media (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null,
  vehicle_id uuid not null,
  kind text not null default 'exterior' check (kind in ('exterior', 'interior', 'detail')),
  source text not null default 'dealer' check (source in ('dealer', 'representative')),
  url text not null check (url ~ '^https://'),
  storage_path text check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'),
  credit text check (char_length(credit) <= 120),
  position smallint not null default 0 check (position between 0 and 99),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete cascade,
  constraint vehicle_media_position_key unique (vehicle_id, position) deferrable initially deferred
);

create table public.vehicle_equipment (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null,
  vehicle_id uuid not null,
  position smallint not null check (position between 0 and 59),
  label jsonb not null check (jsonb_typeof(label) = 'object' and label ? 'en'),
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete cascade,
  constraint vehicle_equipment_position_key unique (vehicle_id, position) deferrable initially deferred
);

create table public.vehicle_price_history (
  id bigint generated always as identity primary key,
  dealership_id uuid not null,
  vehicle_id uuid not null,
  old_price bigint not null,
  new_price bigint not null,
  reason text check (char_length(reason) <= 500),
  changed_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now(),
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete cascade
);
create index vehicle_price_history_idx on public.vehicle_price_history (vehicle_id, changed_at desc);

create table public.price_change_requests (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null,
  vehicle_id uuid not null,
  current_price bigint not null,
  proposed_price bigint not null check (proposed_price between 1 and 100000000000),
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid not null references auth.users (id) on delete cascade,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete cascade
);
create unique index price_change_requests_pending_key on public.price_change_requests (vehicle_id) where status = 'pending';

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);

-- Write guards ------------------------------------------------------------------
-- Direct table writes run as anon/authenticated; trusted RPCs run as the function owner.

create function public.is_direct_write() returns boolean
language sql stable set search_path = '' as $$
  select current_user in ('anon', 'authenticated')
$$;

create function public.guard_vehicle_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.version := 1;
    if public.is_direct_write() then
      if new.status <> 'draft' or new.published or new.featured then
        perform public.raise_app_error('invalid_transition');
      end if;
    end if;
    return new;
  end if;

  if new.dealership_id <> old.dealership_id or new.id <> old.id or new.created_by is distinct from old.created_by then
    perform public.raise_app_error('forbidden');
  end if;
  if public.is_direct_write() then
    if new.status is distinct from old.status or new.sold_at is distinct from old.sold_at or new.archived_at is distinct from old.archived_at then
      perform public.raise_app_error('invalid_transition');
    end if;
    if new.price is distinct from old.price then
      perform public.raise_app_error('forbidden');
    end if;
    if (new.published is distinct from old.published or new.featured is distinct from old.featured)
       and not public.has_perm(old.dealership_id, 'inventory.publish') then
      perform public.raise_app_error('forbidden');
    end if;
    if row(new.make, new.model, new.generation, new.trim_level, new.year, new.body_type, new.fuel, new.transmission,
           new.drivetrain, new.engine, new.horsepower, new.mileage, new.exterior_color, new.interior_color,
           new.condition, new.badges, new.description, new.slug)
       is distinct from
       row(old.make, old.model, old.generation, old.trim_level, old.year, old.body_type, old.fuel, old.transmission,
           old.drivetrain, old.engine, old.horsepower, old.mileage, old.exterior_color, old.interior_color,
           old.condition, old.badges, old.description, old.slug)
       and not public.has_perm(old.dealership_id, 'inventory.update') then
      perform public.raise_app_error('forbidden');
    end if;
  end if;
  if new.published and new.published_at is null then
    new.published_at := now();
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger guard_vehicle_write before insert or update on public.vehicles
  for each row execute function public.guard_vehicle_write();

create function public.guard_vehicle_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status <> 'draft' then
    perform public.raise_app_error('archive_instead');
  end if;
  return old;
end;
$$;

create trigger guard_vehicle_delete before delete on public.vehicles
  for each row execute function public.guard_vehicle_delete();

create function public.guard_media_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.vehicle_media where vehicle_id = new.vehicle_id) >= 40 then
    perform public.raise_app_error('media_limit');
  end if;
  new.created_by := auth.uid();
  return new;
end;
$$;

create trigger guard_media_limit before insert on public.vehicle_media
  for each row execute function public.guard_media_limit();

create trigger audit_vehicles after insert or update or delete on public.vehicles
  for each row execute function public.write_audit();
create trigger audit_vehicle_media after insert or delete on public.vehicle_media
  for each row execute function public.write_audit();
create trigger audit_price_requests after insert or update on public.price_change_requests
  for each row execute function public.write_audit();

create function public.audit_vehicle_private() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs (dealership_id, actor_id, action, entity, record_id, changes)
  values (new.dealership_id, auth.uid(), lower(tg_op), 'vehicle_private', new.vehicle_id::text,
          jsonb_build_object('vin_changed', tg_op = 'INSERT' or new.vin is distinct from old.vin));
  new.updated_at := now();
  return new;
end;
$$;

create trigger audit_vehicle_private before insert or update on public.vehicle_private
  for each row execute function public.audit_vehicle_private();

-- Lifecycle and pricing -----------------------------------------------------------

create function public.transition_vehicle(p_vehicle uuid, p_status public.vehicle_status, p_version integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v public.vehicles;
  next_version integer;
begin
  select * into v from public.vehicles where id = p_vehicle for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(v.dealership_id, case when p_status = 'archived' then 'inventory.delete' else 'inventory.update' end);
  if v.version <> p_version then
    perform public.raise_app_error('conflict');
  end if;
  if not (
    (v.status = 'draft' and p_status in ('available', 'archived'))
    or (v.status = 'available' and p_status in ('draft', 'archived'))
    or (v.status = 'reserved' and p_status = 'available')
    or (v.status = 'sold' and p_status = 'archived')
    or (v.status = 'archived' and p_status = 'draft')
  ) then
    perform public.raise_app_error('invalid_transition');
  end if;
  if v.status = 'reserved' and (
    exists (select 1 from public.reservations where vehicle_id = v.id and status = 'confirmed')
    or exists (select 1 from public.sales where vehicle_id = v.id and status = 'pending')
  ) then
    perform public.raise_app_error('vehicle_reserved');
  end if;

  update public.vehicles
     set status = p_status,
         published = case when p_status in ('draft', 'archived') then false else published end,
         featured = case when p_status = 'available' then featured else false end,
         archived_at = case when p_status = 'archived' then now() else null end
   where id = v.id
   returning version into next_version;
  return next_version;
end;
$$;

create function public.set_vehicle_price(p_vehicle uuid, p_price bigint, p_reason text, p_approved_by uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v public.vehicles;
begin
  select * into v from public.vehicles where id = p_vehicle for update;
  if v.price = p_price then
    return;
  end if;
  update public.vehicles set price = p_price where id = p_vehicle;
  insert into public.vehicle_price_history (dealership_id, vehicle_id, old_price, new_price, reason, changed_by, approved_by)
  values (v.dealership_id, v.id, v.price, p_price, nullif(trim(p_reason), ''), auth.uid(), p_approved_by);
end;
$$;

create function public.change_vehicle_price(p_vehicle uuid, p_price bigint, p_reason text, p_version integer)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v public.vehicles;
  approval boolean;
begin
  select * into v from public.vehicles where id = p_vehicle for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  if auth.uid() is null then
    perform public.raise_app_error('auth_required');
  end if;
  if v.version <> p_version then
    perform public.raise_app_error('conflict');
  end if;
  if p_price is null or p_price < 1 or p_price > 100000000000 then
    perform public.raise_app_error('invalid');
  end if;
  if v.status in ('sold', 'archived') then
    perform public.raise_app_error('invalid_transition');
  end if;
  select price_approval_required into approval from public.dealerships where id = v.dealership_id;

  if public.has_perm(v.dealership_id, 'inventory.price_approve')
     or (not approval and public.has_perm(v.dealership_id, 'inventory.price')) then
    perform public.set_vehicle_price(v.id, p_price, p_reason, auth.uid());
    update public.price_change_requests set status = 'cancelled', decided_by = auth.uid(), decided_at = now()
     where vehicle_id = v.id and status = 'pending';
    return 'applied';
  end if;

  if not (public.has_perm(v.dealership_id, 'inventory.price') or public.has_perm(v.dealership_id, 'inventory.price_request')) then
    perform public.raise_app_error('forbidden');
  end if;
  if char_length(coalesce(trim(p_reason), '')) < 3 then
    perform public.raise_app_error('reason_required');
  end if;
  insert into public.price_change_requests (dealership_id, vehicle_id, current_price, proposed_price, reason, requested_by)
  values (v.dealership_id, v.id, v.price, p_price, trim(p_reason), auth.uid());
  perform public.notify_members(v.dealership_id, 'inventory.price_approve', 'price.requested',
    jsonb_build_object('vehicle_id', v.id, 'vehicle', v.make || ' ' || v.model, 'price', p_price));
  return 'requested';
end;
$$;

create function public.decide_price_request(p_request uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.price_change_requests;
begin
  select * into r from public.price_change_requests where id = p_request for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(r.dealership_id, 'inventory.price_approve');
  if r.status <> 'pending' then
    perform public.raise_app_error('conflict');
  end if;
  if r.requested_by = auth.uid() and public.member_role(r.dealership_id) <> 'owner' then
    perform public.raise_app_error('self_approval');
  end if;
  if p_approve then
    if (select status from public.vehicles where id = r.vehicle_id) in ('sold', 'archived') then
      perform public.raise_app_error('invalid_transition');
    end if;
    perform public.set_vehicle_price(r.vehicle_id, r.proposed_price, r.reason, auth.uid());
  end if;
  update public.price_change_requests
     set status = case when p_approve then 'approved' else 'rejected' end, decided_by = auth.uid(), decided_at = now()
   where id = r.id;
  perform public.notify_user(r.dealership_id, r.requested_by, 'price.decided',
    jsonb_build_object('vehicle_id', r.vehicle_id, 'approved', p_approve, 'price', r.proposed_price));
end;
$$;

create function public.reorder_vehicle_media(p_vehicle uuid, p_media uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.vehicles;
begin
  select * into v from public.vehicles where id = p_vehicle;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(v.dealership_id, 'media.update');
  if (select count(*) from public.vehicle_media where vehicle_id = p_vehicle) <> coalesce(array_length(p_media, 1), 0)
     or exists (select 1 from unnest(p_media) m where m not in (select id from public.vehicle_media where vehicle_id = p_vehicle)) then
    perform public.raise_app_error('invalid');
  end if;
  update public.vehicle_media vm
     set position = (item.ord - 1)::smallint
    from unnest(p_media) with ordinality as item (id, ord)
   where vm.id = item.id and vm.vehicle_id = p_vehicle;
end;
$$;

create function public.replace_vehicle_equipment(p_vehicle uuid, p_labels jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.vehicles;
begin
  select * into v from public.vehicles where id = p_vehicle;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(v.dealership_id, 'inventory.update');
  if jsonb_typeof(p_labels) <> 'array' or jsonb_array_length(p_labels) > 60 then
    perform public.raise_app_error('invalid');
  end if;
  delete from public.vehicle_equipment where vehicle_id = v.id;
  insert into public.vehicle_equipment (dealership_id, vehicle_id, position, label)
  select v.dealership_id, v.id, (item.ord - 1)::smallint, item.value
    from jsonb_array_elements(p_labels) with ordinality as item (value, ord);
end;
$$;

-- Row level security ------------------------------------------------------------

alter table public.vehicles enable row level security;
alter table public.vehicle_private enable row level security;
alter table public.vehicle_media enable row level security;
alter table public.vehicle_equipment enable row level security;
alter table public.vehicle_price_history enable row level security;
alter table public.price_change_requests enable row level security;
alter table public.favorites enable row level security;

create policy vehicles_read on public.vehicles for select using (
  (published and status in ('available', 'reserved'))
  or (published and status = 'sold' and exists (
    select 1 from public.dealerships d where d.id = dealership_id and d.show_sold_vehicles))
  or public.has_perm(dealership_id, 'inventory.read')
);
create policy vehicles_insert on public.vehicles for insert
  with check (public.has_perm(dealership_id, 'inventory.create'));
create policy vehicles_update on public.vehicles for update
  using (public.has_perm(dealership_id, 'inventory.update') or public.has_perm(dealership_id, 'inventory.publish'))
  with check (public.has_perm(dealership_id, 'inventory.update') or public.has_perm(dealership_id, 'inventory.publish'));
create policy vehicles_delete on public.vehicles for delete
  using (public.has_perm(dealership_id, 'inventory.delete'));

create policy vehicle_private_read on public.vehicle_private for select
  using (public.has_perm(dealership_id, 'inventory.private'));
create policy vehicle_private_write on public.vehicle_private for all
  using (public.has_perm(dealership_id, 'inventory.private'))
  with check (public.has_perm(dealership_id, 'inventory.private'));

create policy vehicle_media_read on public.vehicle_media for select
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id));
create policy vehicle_media_insert on public.vehicle_media for insert
  with check (public.has_perm(dealership_id, 'media.update'));
create policy vehicle_media_update on public.vehicle_media for update
  using (public.has_perm(dealership_id, 'media.update')) with check (public.has_perm(dealership_id, 'media.update'));
create policy vehicle_media_delete on public.vehicle_media for delete
  using (public.has_perm(dealership_id, 'media.update'));

create policy vehicle_equipment_read on public.vehicle_equipment for select
  using (exists (select 1 from public.vehicles v where v.id = vehicle_id));

create policy price_history_read on public.vehicle_price_history for select
  using (public.has_perm(dealership_id, 'inventory.read'));

create policy price_requests_read on public.price_change_requests for select
  using (requested_by = auth.uid() or public.has_perm(dealership_id, 'inventory.price_approve'));

create policy favorites_own on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
