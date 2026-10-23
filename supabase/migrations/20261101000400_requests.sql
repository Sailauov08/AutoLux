-- Customer requests (inquiries, test drives, reservations, financing, trade-ins, service) and their workflows.

create type public.request_status as enum ('new', 'in_progress', 'confirmed', 'completed', 'cancelled', 'rejected');

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.new_reference(),
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  customer_id uuid not null,
  user_id uuid references auth.users (id) on delete set null,
  vehicle_id uuid,
  topic text not null check (topic in ('general', 'financing', 'tradeIn', 'availability', 'delivery')),
  message text not null check (char_length(message) between 1 and 4000),
  contact jsonb not null default '{}'::jsonb,
  locale text not null default 'kk' check (locale in ('kk', 'ru', 'en')),
  status public.request_status not null default 'new',
  assigned_to uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, dealership_id) references public.customers (id, dealership_id) on delete restrict,
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete restrict
);

create table public.test_drives (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.new_reference(),
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  customer_id uuid not null,
  user_id uuid references auth.users (id) on delete set null,
  vehicle_id uuid not null,
  starts_at timestamptz not null,
  notes text check (char_length(notes) <= 1000),
  contact jsonb not null default '{}'::jsonb,
  locale text not null default 'kk' check (locale in ('kk', 'ru', 'en')),
  status public.request_status not null default 'new',
  assigned_to uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, dealership_id) references public.customers (id, dealership_id) on delete restrict,
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete restrict
);
create unique index test_drives_confirmed_slot_key on public.test_drives (vehicle_id, starts_at) where status = 'confirmed';
create unique index test_drives_duplicate_key on public.test_drives (vehicle_id, starts_at, customer_id) where status in ('new', 'in_progress', 'confirmed');
create index test_drives_calendar_idx on public.test_drives (dealership_id, starts_at);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.new_reference(),
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  customer_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_id uuid not null,
  message text check (char_length(message) <= 1000),
  contact jsonb not null default '{}'::jsonb,
  locale text not null default 'kk' check (locale in ('kk', 'ru', 'en')),
  status public.request_status not null default 'new',
  hold_until timestamptz,
  assigned_to uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, dealership_id) references public.customers (id, dealership_id) on delete restrict,
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete restrict
);
create unique index reservations_confirmed_key on public.reservations (vehicle_id) where status = 'confirmed';
create unique index reservations_open_key on public.reservations (vehicle_id, customer_id) where status in ('new', 'in_progress', 'confirmed');

create table public.financing_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.new_reference(),
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  customer_id uuid not null,
  user_id uuid references auth.users (id) on delete set null,
  vehicle_id uuid,
  vehicle_price bigint not null check (vehicle_price between 1000000 and 2000000000),
  down_payment bigint not null check (down_payment >= 0),
  term_months smallint not null check (term_months in (12, 24, 36, 48, 60, 72, 84)),
  contact jsonb not null default '{}'::jsonb,
  locale text not null default 'kk' check (locale in ('kk', 'ru', 'en')),
  status public.request_status not null default 'new',
  assigned_to uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (down_payment < vehicle_price),
  foreign key (customer_id, dealership_id) references public.customers (id, dealership_id) on delete restrict,
  foreign key (vehicle_id, dealership_id) references public.vehicles (id, dealership_id) on delete restrict
);

create table public.trade_in_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.new_reference(),
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  customer_id uuid not null,
  user_id uuid references auth.users (id) on delete set null,
  make text not null check (char_length(make) between 2 and 60),
  model text not null check (char_length(model) between 1 and 80),
  year smallint not null check (year between 1980 and 2100),
  mileage integer not null check (mileage between 0 and 2000000),
  condition text not null check (condition in ('excellent', 'good', 'fair')),
  estimate_low bigint not null,
  estimate_high bigint not null,
  contact jsonb not null default '{}'::jsonb,
  locale text not null default 'kk' check (locale in ('kk', 'ru', 'en')),
  status public.request_status not null default 'new',
  assigned_to uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, dealership_id) references public.customers (id, dealership_id) on delete restrict
);

create table public.service_appointments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.new_reference(),
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  customer_id uuid not null,
  user_id uuid references auth.users (id) on delete set null,
  vehicle_description text not null check (char_length(vehicle_description) between 2 and 160),
  service_type text not null check (service_type in ('maintenance', 'inspection', 'detailing', 'tyres', 'repair')),
  starts_at timestamptz not null,
  notes text check (char_length(notes) <= 1000),
  contact jsonb not null default '{}'::jsonb,
  locale text not null default 'kk' check (locale in ('kk', 'ru', 'en')),
  status public.request_status not null default 'new',
  assigned_to uuid references auth.users (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, dealership_id) references public.customers (id, dealership_id) on delete restrict
);
create unique index service_duplicate_key on public.service_appointments (dealership_id, starts_at, customer_id) where status in ('new', 'in_progress', 'confirmed');
create index service_calendar_idx on public.service_appointments (dealership_id, starts_at);

create table public.request_events (
  id bigint generated always as identity primary key,
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  request_kind text not null check (request_kind in ('inquiry', 'test_drive', 'reservation', 'financing', 'trade_in', 'service')),
  request_id uuid not null,
  actor_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('created', 'status', 'assignment', 'note', 'reschedule')),
  from_status public.request_status,
  to_status public.request_status,
  body text check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index request_events_request_idx on public.request_events (request_kind, request_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['inquiries', 'test_drives', 'reservations', 'financing_requests', 'trade_in_requests', 'service_appointments']
  loop
    execute format('create index %I on public.%I (dealership_id, status, created_at desc)', t || '_queue_idx', t);
    execute format('create index %I on public.%I (user_id) where user_id is not null', t || '_user_idx', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', 'touch_' || t, t);
    execute format('create trigger %I before update on public.%I for each row execute function public.bump_version()', 'version_' || t, t);
  end loop;
end;
$$;

create trigger audit_reservations after insert or update on public.reservations for each row execute function public.write_audit();

-- Request metadata ------------------------------------------------------------

create function public.request_table(p_kind text) returns text
language sql immutable set search_path = '' as $$
  select case p_kind
    when 'inquiry' then 'inquiries'
    when 'test_drive' then 'test_drives'
    when 'reservation' then 'reservations'
    when 'financing' then 'financing_requests'
    when 'trade_in' then 'trade_in_requests'
    when 'service' then 'service_appointments'
  end
$$;

create function public.request_permission(p_kind text, p_action text) returns text
language sql immutable set search_path = '' as $$
  select case p_kind
    when 'inquiry' then 'inquiries.'
    when 'test_drive' then 'bookings.'
    when 'service' then 'bookings.'
    when 'reservation' then 'reservations.'
    when 'financing' then 'finance.'
    when 'trade_in' then 'tradein.'
  end || p_action
$$;

create function public.slot_start(p_dealership uuid, p_date date, p_slot text) returns timestamptz
language plpgsql stable set search_path = '' as $$
declare
  d public.dealerships;
  starts timestamptz;
begin
  select * into d from public.dealerships where id = p_dealership;
  if p_date is null or p_slot is null or not (p_slot = any (d.booking_slots)) then
    perform public.raise_app_error('invalid_date');
  end if;
  starts := (p_date + p_slot::time) at time zone d.timezone;
  if starts <= now() or p_date > (now() at time zone d.timezone)::date + d.booking_window_days then
    perform public.raise_app_error('invalid_date');
  end if;
  return starts;
end;
$$;

create function public.dealership_by_slug(p_slug text) returns public.dealerships
language plpgsql stable security definer set search_path = '' as $$
declare d public.dealerships;
begin
  select * into d from public.dealerships where slug = p_slug;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  return d;
end;
$$;

create function public.attach_lead(
  p_dealership uuid, p_customer uuid, p_vehicle uuid, p_kind text, p_request uuid, p_reference text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare lid uuid;
begin
  select id into lid from public.leads
   where customer_id = p_customer and stage not in ('won', 'lost')
     and (vehicle_id is not distinct from p_vehicle or p_vehicle is null or vehicle_id is null)
   order by created_at desc limit 1;
  if lid is null then
    insert into public.leads (dealership_id, customer_id, vehicle_id, source, request_kind, request_id)
    values (p_dealership, p_customer, p_vehicle, p_kind, p_kind, p_request)
    returning id into lid;
    perform public.notify_members(p_dealership, 'leads.assign', 'lead.new',
      jsonb_build_object('lead_id', lid, 'source', p_kind, 'reference', p_reference));
  else
    update public.leads set vehicle_id = coalesce(vehicle_id, p_vehicle) where id = lid;
  end if;
  insert into public.lead_activities (dealership_id, lead_id, kind, meta)
  values (p_dealership, lid, 'request', jsonb_build_object('kind', p_kind, 'request_id', p_request, 'reference', p_reference));
  insert into public.request_events (dealership_id, request_kind, request_id, actor_id, kind, to_status)
  values (p_dealership, p_kind, p_request, auth.uid(), 'created', 'new');
  perform public.notify_members(p_dealership, public.request_permission(p_kind, 'read'), 'request.new',
    jsonb_build_object('kind', p_kind, 'request_id', p_request, 'reference', p_reference));
  return lid;
end;
$$;

create function public.submission_guard(p_kind text, p_key text, p_consent boolean, p_max integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(p_consent, false) then
    perform public.raise_app_error('consent_required');
  end if;
  perform public.enforce_rate_limit(p_kind || ':' || coalesce(nullif(p_key, ''), 'anonymous'), p_max, interval '10 minutes');
end;
$$;

-- Public submissions -------------------------------------------------------------

create function public.submit_inquiry(
  p_dealership text, p_name text, p_email text, p_phone text, p_topic text, p_message text,
  p_vehicle uuid, p_locale text, p_fingerprint text, p_consent boolean
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.dealerships := public.dealership_by_slug(p_dealership);
  cid uuid;
  rec public.inquiries;
begin
  perform public.submission_guard('inquiry', coalesce(p_fingerprint, lower(p_email)), p_consent, 5);
  perform public.enforce_rate_limit('inquiry-email:' || lower(trim(p_email)), 3, interval '10 minutes');
  if p_vehicle is not null and not exists (select 1 from public.vehicles where id = p_vehicle and dealership_id = d.id and published) then
    perform public.raise_app_error('vehicle_unavailable');
  end if;
  cid := public.upsert_customer(d.id, p_name, p_email, p_phone, p_locale);
  insert into public.inquiries (dealership_id, customer_id, user_id, vehicle_id, topic, message, contact, locale)
  values (d.id, cid, auth.uid(), p_vehicle, p_topic, trim(p_message),
          jsonb_build_object('name', trim(p_name), 'email', lower(trim(p_email)), 'phone', nullif(trim(p_phone), '')), p_locale)
  returning * into rec;
  perform public.attach_lead(d.id, cid, p_vehicle, 'inquiry', rec.id, rec.reference);
  return rec.reference;
end;
$$;

create function public.submit_test_drive(
  p_dealership text, p_vehicle uuid, p_date date, p_slot text, p_name text, p_email text, p_phone text,
  p_notes text, p_locale text, p_fingerprint text, p_consent boolean
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.dealerships := public.dealership_by_slug(p_dealership);
  cid uuid;
  rec public.test_drives;
begin
  perform public.submission_guard('test_drive', coalesce(p_fingerprint, lower(p_email)), p_consent, 5);
  if not d.test_drive_enabled then
    perform public.raise_app_error('service_disabled');
  end if;
  if not exists (select 1 from public.vehicles where id = p_vehicle and dealership_id = d.id and published and status in ('available', 'reserved')) then
    perform public.raise_app_error('vehicle_unavailable');
  end if;
  cid := public.upsert_customer(d.id, p_name, p_email, p_phone, p_locale);
  insert into public.test_drives (dealership_id, customer_id, user_id, vehicle_id, starts_at, notes, contact, locale)
  values (d.id, cid, auth.uid(), p_vehicle, public.slot_start(d.id, p_date, p_slot), nullif(trim(p_notes), ''),
          jsonb_build_object('name', trim(p_name), 'email', lower(trim(p_email)), 'phone', trim(p_phone)), p_locale)
  returning * into rec;
  perform public.attach_lead(d.id, cid, p_vehicle, 'test_drive', rec.id, rec.reference);
  return rec.reference;
end;
$$;

create function public.request_reservation(p_dealership text, p_vehicle uuid, p_phone text, p_message text, p_locale text, p_consent boolean)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.dealerships := public.dealership_by_slug(p_dealership);
  uid uuid := auth.uid();
  account_email text;
  account_name text;
  cid uuid;
  rec public.reservations;
begin
  if uid is null then
    perform public.raise_app_error('auth_required');
  end if;
  perform public.submission_guard('reservation', uid::text, p_consent, 5);
  if not exists (select 1 from public.vehicles where id = p_vehicle and dealership_id = d.id and published and status = 'available') then
    perform public.raise_app_error('vehicle_unavailable');
  end if;
  select u.email, coalesce(p.full_name, split_part(u.email, '@', 1)) into account_email, account_name
    from auth.users u left join public.profiles p on p.id = u.id where u.id = uid;
  cid := public.upsert_customer(d.id, account_name, account_email, p_phone, p_locale);
  insert into public.reservations (dealership_id, customer_id, user_id, vehicle_id, message, contact, locale)
  values (d.id, cid, uid, p_vehicle, nullif(trim(p_message), ''),
          jsonb_build_object('name', account_name, 'email', lower(account_email), 'phone', nullif(trim(p_phone), '')), p_locale)
  returning * into rec;
  perform public.attach_lead(d.id, cid, p_vehicle, 'reservation', rec.id, rec.reference);
  return rec.reference;
end;
$$;

create function public.submit_financing(
  p_dealership text, p_vehicle uuid, p_price bigint, p_down bigint, p_term smallint,
  p_name text, p_email text, p_phone text, p_locale text, p_fingerprint text, p_consent boolean
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.dealerships := public.dealership_by_slug(p_dealership);
  cid uuid;
  rec public.financing_requests;
begin
  perform public.submission_guard('financing', coalesce(p_fingerprint, lower(p_email)), p_consent, 3);
  if p_vehicle is not null and not exists (select 1 from public.vehicles where id = p_vehicle and dealership_id = d.id and published) then
    perform public.raise_app_error('vehicle_unavailable');
  end if;
  cid := public.upsert_customer(d.id, p_name, p_email, p_phone, p_locale);
  insert into public.financing_requests (dealership_id, customer_id, user_id, vehicle_id, vehicle_price, down_payment, term_months, contact, locale)
  values (d.id, cid, auth.uid(), p_vehicle, p_price, p_down, p_term,
          jsonb_build_object('name', trim(p_name), 'email', lower(trim(p_email)), 'phone', trim(p_phone)), p_locale)
  returning * into rec;
  perform public.attach_lead(d.id, cid, p_vehicle, 'financing', rec.id, rec.reference);
  return rec.reference;
end;
$$;

create function public.trade_in_estimate(p_year integer, p_mileage integer, p_condition text)
returns table (low bigint, high bigint)
language sql stable set search_path = '' as $$
  with base as (
    select greatest(40000000 * power(0.88, greatest(extract(year from current_date)::int - p_year, 0)) - p_mileage * 180, 2000000)
           * case p_condition when 'excellent' then 1.0 when 'good' then 0.9 else 0.78 end as value
  )
  select (round(value * 0.95 / 100000) * 100000)::bigint, (round(value * 1.05 / 100000) * 100000)::bigint from base
$$;

create function public.submit_trade_in(
  p_dealership text, p_make text, p_model text, p_year smallint, p_mileage integer, p_condition text,
  p_name text, p_email text, p_phone text, p_locale text, p_fingerprint text, p_consent boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  d public.dealerships := public.dealership_by_slug(p_dealership);
  cid uuid;
  est record;
  rec public.trade_in_requests;
begin
  perform public.submission_guard('trade_in', coalesce(p_fingerprint, lower(p_email)), p_consent, 5);
  if p_year > extract(year from current_date)::int + 1 then
    perform public.raise_app_error('invalid');
  end if;
  select * into est from public.trade_in_estimate(p_year, p_mileage, p_condition);
  cid := public.upsert_customer(d.id, p_name, p_email, p_phone, p_locale);
  insert into public.trade_in_requests (dealership_id, customer_id, user_id, make, model, year, mileage, condition,
                                        estimate_low, estimate_high, contact, locale)
  values (d.id, cid, auth.uid(), trim(p_make), trim(p_model), p_year, p_mileage, p_condition, est.low, est.high,
          jsonb_build_object('name', trim(p_name), 'email', lower(trim(p_email)), 'phone', trim(p_phone)), p_locale)
  returning * into rec;
  perform public.attach_lead(d.id, cid, null, 'trade_in', rec.id, rec.reference);
  return jsonb_build_object('reference', rec.reference, 'low', rec.estimate_low, 'high', rec.estimate_high);
end;
$$;

create function public.submit_service(
  p_dealership text, p_vehicle_description text, p_service_type text, p_date date, p_slot text,
  p_name text, p_email text, p_phone text, p_notes text, p_locale text, p_fingerprint text, p_consent boolean
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  d public.dealerships := public.dealership_by_slug(p_dealership);
  cid uuid;
  rec public.service_appointments;
begin
  perform public.submission_guard('service', coalesce(p_fingerprint, lower(p_email)), p_consent, 5);
  if not d.service_enabled or not (p_service_type = any (d.services)) then
    perform public.raise_app_error('service_disabled');
  end if;
  cid := public.upsert_customer(d.id, p_name, p_email, p_phone, p_locale);
  insert into public.service_appointments (dealership_id, customer_id, user_id, vehicle_description, service_type, starts_at, notes, contact, locale)
  values (d.id, cid, auth.uid(), trim(p_vehicle_description), p_service_type, public.slot_start(d.id, p_date, p_slot),
          nullif(trim(p_notes), ''),
          jsonb_build_object('name', trim(p_name), 'email', lower(trim(p_email)), 'phone', trim(p_phone)), p_locale)
  returning * into rec;
  perform public.attach_lead(d.id, cid, null, 'service', rec.id, rec.reference);
  return rec.reference;
end;
$$;

-- Staff workflow -----------------------------------------------------------------

create function public.release_vehicle_hold(p_vehicle uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.vehicles set status = 'available'
   where id = p_vehicle and status = 'reserved'
     and not exists (select 1 from public.reservations where vehicle_id = p_vehicle and status = 'confirmed')
     and not exists (select 1 from public.sales where vehicle_id = p_vehicle and status = 'pending');
end;
$$;

create function public.set_request_status(
  p_kind text, p_id uuid, p_status public.request_status, p_version integer, p_note text
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  tbl text := public.request_table(p_kind);
  rec record;
  v public.vehicles;
  hold integer;
  next_version integer;
begin
  if tbl is null then
    perform public.raise_app_error('invalid');
  end if;
  execute format('select id, dealership_id, status, version, assigned_to from public.%I where id = $1 for update', tbl)
    into rec using p_id;
  if rec.id is null then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(rec.dealership_id, public.request_permission(p_kind, 'update'));
  if rec.version <> p_version then
    perform public.raise_app_error('conflict');
  end if;
  if not (
    (rec.status = 'new' and p_status in ('in_progress', 'confirmed', 'rejected', 'cancelled'))
    or (rec.status = 'in_progress' and p_status in ('confirmed', 'completed', 'rejected', 'cancelled'))
    or (rec.status = 'confirmed' and p_status in ('completed', 'cancelled'))
  ) or (p_kind = 'reservation' and p_status = 'completed') then
    perform public.raise_app_error('invalid_transition');
  end if;

  if p_kind = 'test_drive' and p_status = 'confirmed' then
    if exists (select 1 from public.test_drives t join public.vehicles veh on veh.id = t.vehicle_id
                where t.id = p_id and (veh.status in ('sold', 'archived') or t.starts_at <= now())) then
      perform public.raise_app_error('vehicle_unavailable');
    end if;
  end if;
  if p_kind = 'service' and p_status = 'confirmed' then
    perform pg_advisory_xact_lock(hashtext('service:' || rec.dealership_id::text));
    if (select count(*) from public.service_appointments s
         where s.dealership_id = rec.dealership_id and s.status = 'confirmed'
           and s.starts_at = (select starts_at from public.service_appointments where id = p_id))
       >= (select service_capacity from public.dealerships where id = rec.dealership_id) then
      perform public.raise_app_error('slot_taken');
    end if;
  end if;
  if p_kind = 'reservation' and p_status = 'confirmed' then
    select veh.* into v from public.vehicles veh join public.reservations r on r.vehicle_id = veh.id where r.id = p_id for update of veh;
    if v.status <> 'available' then
      perform public.raise_app_error('vehicle_unavailable');
    end if;
    select reservation_hold_hours into hold from public.dealerships where id = rec.dealership_id;
    update public.reservations set hold_until = now() + make_interval(hours => hold) where id = p_id;
    update public.vehicles set status = 'reserved', featured = false where id = v.id;
  end if;

  execute format('update public.%I set status = $1 where id = $2 returning version', tbl) into next_version using p_status, p_id;

  if p_kind = 'reservation' and rec.status = 'confirmed' then
    perform public.release_vehicle_hold((select vehicle_id from public.reservations where id = p_id));
  end if;

  insert into public.request_events (dealership_id, request_kind, request_id, actor_id, kind, from_status, to_status, body)
  values (rec.dealership_id, p_kind, p_id, auth.uid(), 'status', rec.status, p_status, nullif(left(trim(p_note), 2000), ''));
  return next_version;
end;
$$;

create function public.assign_request(p_kind text, p_id uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  tbl text := public.request_table(p_kind);
  rec record;
  allowed boolean;
begin
  if tbl is null then
    perform public.raise_app_error('invalid');
  end if;
  execute format('select id, dealership_id, assigned_to, reference from public.%I where id = $1 for update', tbl) into rec using p_id;
  if rec.id is null then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(rec.dealership_id, public.request_permission(p_kind, 'update'));
  if p_user is not null then
    select exists (
      select 1 from public.memberships m
        join public.role_permissions rp on rp.dealership_id = m.dealership_id and rp.role = m.role
       where m.dealership_id = rec.dealership_id and m.user_id = p_user and m.status = 'active'
         and rp.permission = public.request_permission(p_kind, 'read')
    ) into allowed;
    if not allowed then
      perform public.raise_app_error('invalid_assignee');
    end if;
  end if;
  execute format('update public.%I set assigned_to = $1 where id = $2', tbl) using p_user, p_id;
  insert into public.request_events (dealership_id, request_kind, request_id, actor_id, kind, body)
  values (rec.dealership_id, p_kind, p_id, auth.uid(), 'assignment', p_user::text);
  perform public.notify_user(rec.dealership_id, p_user, 'request.assigned',
    jsonb_build_object('kind', p_kind, 'request_id', p_id, 'reference', rec.reference));
end;
$$;

create function public.add_request_note(p_kind text, p_id uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  tbl text := public.request_table(p_kind);
  dealer uuid;
begin
  if tbl is null or char_length(coalesce(trim(p_body), '')) = 0 then
    perform public.raise_app_error('invalid');
  end if;
  execute format('select dealership_id from public.%I where id = $1', tbl) into dealer using p_id;
  if dealer is null then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(dealer, public.request_permission(p_kind, 'update'));
  insert into public.request_events (dealership_id, request_kind, request_id, actor_id, kind, body)
  values (dealer, p_kind, p_id, auth.uid(), 'note', left(trim(p_body), 2000));
end;
$$;

create function public.reschedule_appointment(p_kind text, p_id uuid, p_date date, p_slot text, p_version integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  tbl text := public.request_table(p_kind);
  rec record;
  starts timestamptz;
  next_version integer;
begin
  if p_kind not in ('test_drive', 'service') then
    perform public.raise_app_error('invalid');
  end if;
  execute format('select id, dealership_id, status, version, starts_at from public.%I where id = $1 for update', tbl) into rec using p_id;
  if rec.id is null then
    perform public.raise_app_error('not_found');
  end if;
  perform public.require_perm(rec.dealership_id, 'bookings.update');
  if rec.version <> p_version then
    perform public.raise_app_error('conflict');
  end if;
  if rec.status not in ('new', 'in_progress', 'confirmed') then
    perform public.raise_app_error('invalid_transition');
  end if;
  starts := public.slot_start(rec.dealership_id, p_date, p_slot);
  if p_kind = 'service' and rec.status = 'confirmed' then
    perform pg_advisory_xact_lock(hashtext('service:' || rec.dealership_id::text));
    if (select count(*) from public.service_appointments where dealership_id = rec.dealership_id
         and status = 'confirmed' and starts_at = starts and id <> p_id)
       >= (select service_capacity from public.dealerships where id = rec.dealership_id) then
      perform public.raise_app_error('slot_taken');
    end if;
  end if;
  execute format('update public.%I set starts_at = $1 where id = $2 returning version', tbl) into next_version using starts, p_id;
  insert into public.request_events (dealership_id, request_kind, request_id, actor_id, kind, body)
  values (rec.dealership_id, p_kind, p_id, auth.uid(), 'reschedule', rec.starts_at::text || ' -> ' || starts::text);
  return next_version;
end;
$$;

create function public.release_expired_reservations(p_dealership uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  released integer := 0;
begin
  if not public.is_member(p_dealership) then
    return 0;
  end if;
  for r in
    select id, vehicle_id, status from public.reservations
     where dealership_id = p_dealership and status = 'confirmed' and hold_until < now()
     for update skip locked
  loop
    update public.reservations set status = 'cancelled' where id = r.id;
    insert into public.request_events (dealership_id, request_kind, request_id, kind, from_status, to_status, body)
    values (p_dealership, 'reservation', r.id, 'status', 'confirmed', 'cancelled', 'hold_expired');
    perform public.release_vehicle_hold(r.vehicle_id);
    released := released + 1;
  end loop;
  return released;
end;
$$;

create function public.cancel_my_request(p_kind text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  tbl text := public.request_table(p_kind);
  rec record;
begin
  if auth.uid() is null then
    perform public.raise_app_error('auth_required');
  end if;
  if p_kind not in ('test_drive', 'reservation', 'service') then
    perform public.raise_app_error('invalid');
  end if;
  execute format('select id, dealership_id, status, user_id from public.%I where id = $1 for update', tbl) into rec using p_id;
  if rec.id is null or rec.user_id is distinct from auth.uid() or rec.status not in ('new', 'in_progress', 'confirmed') then
    perform public.raise_app_error('not_found');
  end if;
  execute format('update public.%I set status = $1 where id = $2', tbl) using 'cancelled'::public.request_status, p_id;
  if p_kind = 'reservation' and rec.status = 'confirmed' then
    perform public.release_vehicle_hold((select vehicle_id from public.reservations where id = p_id));
  end if;
  insert into public.request_events (dealership_id, request_kind, request_id, actor_id, kind, from_status, to_status, body)
  values (rec.dealership_id, p_kind, p_id, auth.uid(), 'status', rec.status, 'cancelled', 'customer');
end;
$$;

-- Row level security ------------------------------------------------------------

alter table public.inquiries enable row level security;
alter table public.test_drives enable row level security;
alter table public.reservations enable row level security;
alter table public.financing_requests enable row level security;
alter table public.trade_in_requests enable row level security;
alter table public.service_appointments enable row level security;
alter table public.request_events enable row level security;

create policy inquiries_read on public.inquiries for select
  using (user_id = auth.uid() or public.has_perm(dealership_id, 'inquiries.read'));
create policy test_drives_read on public.test_drives for select
  using (user_id = auth.uid() or public.has_perm(dealership_id, 'bookings.read'));
create policy reservations_read on public.reservations for select
  using (user_id = auth.uid() or public.has_perm(dealership_id, 'reservations.read'));
create policy financing_read on public.financing_requests for select
  using (user_id = auth.uid() or public.has_perm(dealership_id, 'finance.read'));
create policy trade_ins_read on public.trade_in_requests for select
  using (user_id = auth.uid() or public.has_perm(dealership_id, 'tradein.read'));
create policy service_read on public.service_appointments for select
  using (user_id = auth.uid() or public.has_perm(dealership_id, 'bookings.read'));

create policy request_events_read on public.request_events for select
  using (public.has_perm(dealership_id, public.request_permission(request_kind, 'read')));
