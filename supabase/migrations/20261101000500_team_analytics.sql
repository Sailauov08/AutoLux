-- Staff management, settings access, analytics and function privileges.

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  dealership_id uuid not null references public.dealerships (id) on delete cascade,
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  role public.staff_role not null check (role <> 'owner'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index staff_invitations_pending_key on public.staff_invitations (dealership_id, lower(email))
  where accepted_at is null and revoked_at is null;

create trigger audit_invitations after insert or update on public.staff_invitations
  for each row execute function public.write_audit();

create function public.role_rank_of(p_role public.staff_role) returns smallint
language sql stable set search_path = '' as $$
  select rank from public.role_rank where role = p_role
$$;

create function public.can_manage_role(p_dealership uuid, p_role public.staff_role) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare mine public.staff_role := public.member_role(p_dealership);
begin
  if mine is null or not public.has_perm(p_dealership, 'team.manage') then
    return false;
  end if;
  if mine = 'owner' then
    return true;
  end if;
  return p_role <> 'owner' and public.role_rank_of(p_role) > public.role_rank_of(mine);
end;
$$;

create function public.hash_token(p_token text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
$$;

create function public.create_invitation(p_dealership uuid, p_email text, p_role public.staff_role) returns text
language plpgsql security definer set search_path = '' as $$
declare
  clean text := lower(trim(p_email));
  token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  perform public.require_perm(p_dealership, 'team.manage');
  if p_role = 'owner' or not public.can_manage_role(p_dealership, p_role) then
    perform public.raise_app_error('forbidden');
  end if;
  if clean !~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    perform public.raise_app_error('invalid');
  end if;
  perform public.enforce_rate_limit('invite:' || auth.uid()::text, 20, interval '1 hour');
  if exists (
    select 1 from public.memberships m join auth.users u on u.id = m.user_id
     where m.dealership_id = p_dealership and lower(u.email) = clean) then
    perform public.raise_app_error('already_member');
  end if;
  update public.staff_invitations set revoked_at = now()
   where dealership_id = p_dealership and lower(email) = clean and accepted_at is null and revoked_at is null;
  insert into public.staff_invitations (dealership_id, email, role, token_hash, invited_by, expires_at)
  values (p_dealership, clean, p_role, public.hash_token(token), auth.uid(), now() + interval '7 days');
  return token;
end;
$$;

create function public.revoke_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare inv public.staff_invitations;
begin
  select * into inv from public.staff_invitations where id = p_invitation for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  if not public.can_manage_role(inv.dealership_id, inv.role) then
    perform public.raise_app_error('forbidden');
  end if;
  update public.staff_invitations set revoked_at = now() where id = inv.id and accepted_at is null and revoked_at is null;
end;
$$;

create function public.invitation_preview(p_token text)
returns table (dealership_name text, role public.staff_role, email text, status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    perform public.raise_app_error('auth_required');
  end if;
  return query
    select d.name, i.role, i.email,
           case when i.revoked_at is not null then 'revoked'
                when i.accepted_at is not null then 'accepted'
                when i.expires_at < now() then 'expired'
                else 'pending' end
      from public.staff_invitations i join public.dealerships d on d.id = i.dealership_id
     where i.token_hash = public.hash_token(p_token);
end;
$$;

create function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  inv public.staff_invitations;
  account record;
  existing public.memberships;
begin
  if auth.uid() is null then
    perform public.raise_app_error('auth_required');
  end if;
  perform public.enforce_rate_limit('accept:' || auth.uid()::text, 10, interval '1 hour');
  select * into inv from public.staff_invitations where token_hash = public.hash_token(p_token) for update;
  if not found or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at < now() then
    perform public.raise_app_error('invitation_invalid');
  end if;
  select email, email_confirmed_at into account from auth.users where id = auth.uid();
  if lower(account.email) <> lower(inv.email) then
    perform public.raise_app_error('invitation_email');
  end if;
  if account.email_confirmed_at is null then
    perform public.raise_app_error('email_not_confirmed');
  end if;
  select * into existing from public.memberships where dealership_id = inv.dealership_id and user_id = auth.uid();
  if found then
    perform public.raise_app_error(case when existing.status = 'suspended' then 'suspended' else 'already_member' end);
  end if;
  insert into public.memberships (dealership_id, user_id, role, invited_by)
  values (inv.dealership_id, auth.uid(), inv.role, inv.invited_by);
  update public.staff_invitations set accepted_at = now(), accepted_by = auth.uid() where id = inv.id;
  return inv.dealership_id;
end;
$$;

create function public.set_member_role(p_dealership uuid, p_user uuid, p_role public.staff_role) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.memberships;
begin
  perform public.require_perm(p_dealership, 'team.manage');
  if p_user = auth.uid() then
    perform public.raise_app_error('forbidden');
  end if;
  select * into target from public.memberships where dealership_id = p_dealership and user_id = p_user for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  if not public.can_manage_role(p_dealership, target.role) or not public.can_manage_role(p_dealership, p_role) then
    perform public.raise_app_error('forbidden');
  end if;
  update public.memberships set role = p_role where dealership_id = p_dealership and user_id = p_user;
end;
$$;

create function public.set_member_status(p_dealership uuid, p_user uuid, p_status public.member_status) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.memberships;
begin
  perform public.require_perm(p_dealership, 'team.manage');
  if p_user = auth.uid() then
    perform public.raise_app_error('forbidden');
  end if;
  select * into target from public.memberships where dealership_id = p_dealership and user_id = p_user for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  if not public.can_manage_role(p_dealership, target.role) then
    perform public.raise_app_error('forbidden');
  end if;
  update public.memberships set status = p_status where dealership_id = p_dealership and user_id = p_user;
  if p_status = 'suspended' then
    update public.leads set assigned_to = null where dealership_id = p_dealership and assigned_to = p_user and stage not in ('won', 'lost');
  end if;
end;
$$;

create function public.remove_member(p_dealership uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.memberships;
begin
  perform public.require_perm(p_dealership, 'team.manage');
  if p_user = auth.uid() then
    perform public.raise_app_error('forbidden');
  end if;
  select * into target from public.memberships where dealership_id = p_dealership and user_id = p_user for update;
  if not found then
    perform public.raise_app_error('not_found');
  end if;
  if not public.can_manage_role(p_dealership, target.role) then
    perform public.raise_app_error('forbidden');
  end if;
  update public.leads set assigned_to = null where dealership_id = p_dealership and assigned_to = p_user and stage not in ('won', 'lost');
  delete from public.staff_tasks where dealership_id = p_dealership and assigned_to = p_user and completed_at is null;
  delete from public.memberships where dealership_id = p_dealership and user_id = p_user;
end;
$$;

create function public.update_role_permissions(p_dealership uuid, p_role public.staff_role, p_permissions text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.member_role(p_dealership) is distinct from 'owner' then
    perform public.raise_app_error('forbidden');
  end if;
  if p_role = 'owner' then
    perform public.raise_app_error('forbidden');
  end if;
  if exists (select 1 from unnest(p_permissions) p where p not in (select key from public.permissions)) then
    perform public.raise_app_error('invalid');
  end if;
  delete from public.role_permissions
   where dealership_id = p_dealership and role = p_role and not (permission = any (p_permissions));
  insert into public.role_permissions (dealership_id, role, permission)
  select p_dealership, p_role, p from unnest(p_permissions) p
  on conflict do nothing;
end;
$$;

create function public.list_members(p_dealership uuid)
returns table (user_id uuid, email text, full_name text, role public.staff_role, status public.member_status, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_perm(p_dealership, 'team.read');
  return query
    select m.user_id, u.email::text, p.full_name, m.role, m.status, m.created_at
      from public.memberships m
      join auth.users u on u.id = m.user_id
      left join public.profiles p on p.id = m.user_id
     where m.dealership_id = p_dealership
     order by public.role_rank_of(m.role), m.created_at;
end;
$$;

create function public.staff_directory(p_dealership uuid)
returns table (user_id uuid, full_name text, role public.staff_role)
language sql stable security definer set search_path = '' as $$
  select m.user_id, coalesce(p.full_name, 'Staff'), m.role
    from public.memberships m left join public.profiles p on p.id = m.user_id
   where m.dealership_id = p_dealership and m.status = 'active' and public.is_member(p_dealership)
   order by p.full_name
$$;

create function public.list_invitations(p_dealership uuid)
returns table (id uuid, email text, role public.staff_role, expires_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_perm(p_dealership, 'team.manage');
  return query
    select i.id, i.email, i.role, i.expires_at, i.created_at
      from public.staff_invitations i
     where i.dealership_id = p_dealership and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
     order by i.created_at desc;
end;
$$;

-- Run once from the Supabase SQL editor (service role) after the owner has signed up and confirmed their email.
create function public.bootstrap_owner(p_dealership_slug text, p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  dealer uuid;
  account record;
begin
  select id into dealer from public.dealerships where slug = p_dealership_slug;
  if dealer is null then
    perform public.raise_app_error('not_found');
  end if;
  if exists (select 1 from public.memberships where dealership_id = dealer and role = 'owner' and status = 'active') then
    perform public.raise_app_error('owner_exists');
  end if;
  select id, email_confirmed_at into account from auth.users where lower(email) = lower(trim(p_email));
  if account.id is null then
    perform public.raise_app_error('not_found');
  end if;
  if account.email_confirmed_at is null then
    perform public.raise_app_error('email_not_confirmed');
  end if;
  insert into public.memberships (dealership_id, user_id, role) values (dealer, account.id, 'owner')
  on conflict (dealership_id, user_id) do update set role = 'owner', status = 'active';
end;
$$;

create function public.dealership_admin_settings(p_dealership uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_member(p_dealership) then
    perform public.raise_app_error('forbidden');
  end if;
  return (select to_jsonb(d) - 'logo_path' from public.dealerships d where d.id = p_dealership);
end;
$$;

create function public.log_security_event(p_dealership uuid, p_action text, p_detail text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.dealerships where id = p_dealership) then
    return;
  end if;
  perform public.enforce_rate_limit('security:' || auth.uid()::text, 30, interval '10 minutes');
  insert into public.audit_logs (dealership_id, actor_id, action, entity, record_id, changes)
  values (p_dealership, auth.uid(), 'denied', left(coalesce(p_action, 'unknown'), 80), null,
          jsonb_build_object('detail', left(coalesce(p_detail, ''), 200)));
exception when others then
  return;
end;
$$;

-- Analytics --------------------------------------------------------------------

create function public.dealership_overview(p_dealership uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb := '{}'::jsonb;
begin
  if not public.is_member(p_dealership) then
    perform public.raise_app_error('forbidden');
  end if;
  perform public.release_expired_reservations(p_dealership);

  if public.has_perm(p_dealership, 'inventory.read') then
    result := result || jsonb_build_object('inventory', (
      select jsonb_build_object(
        'total', count(*) filter (where status <> 'archived'),
        'draft', count(*) filter (where status = 'draft'),
        'available', count(*) filter (where status = 'available'),
        'reserved', count(*) filter (where status = 'reserved'),
        'sold', count(*) filter (where status = 'sold'),
        'published', count(*) filter (where published),
        'unpublishedAvailable', count(*) filter (where status = 'available' and not published))
      from public.vehicles where dealership_id = p_dealership));
  end if;
  if public.has_perm(p_dealership, 'inventory.price_approve') then
    result := result || jsonb_build_object('pendingPrices',
      (select count(*) from public.price_change_requests where dealership_id = p_dealership and status = 'pending'));
  end if;
  result := result || jsonb_build_object('requests', jsonb_strip_nulls(jsonb_build_object(
    'inquiry', case when public.has_perm(p_dealership, 'inquiries.read') then
      (select count(*) from public.inquiries where dealership_id = p_dealership and status = 'new') end,
    'test_drive', case when public.has_perm(p_dealership, 'bookings.read') then
      (select count(*) from public.test_drives where dealership_id = p_dealership and status = 'new') end,
    'service', case when public.has_perm(p_dealership, 'bookings.read') then
      (select count(*) from public.service_appointments where dealership_id = p_dealership and status = 'new') end,
    'reservation', case when public.has_perm(p_dealership, 'reservations.read') then
      (select count(*) from public.reservations where dealership_id = p_dealership and status = 'new') end,
    'financing', case when public.has_perm(p_dealership, 'finance.read') then
      (select count(*) from public.financing_requests where dealership_id = p_dealership and status = 'new') end,
    'trade_in', case when public.has_perm(p_dealership, 'tradein.read') then
      (select count(*) from public.trade_in_requests where dealership_id = p_dealership and status = 'new') end)));
  if public.has_perm(p_dealership, 'bookings.read') then
    result := result || jsonb_build_object('upcomingTestDrives',
      (select count(*) from public.test_drives where dealership_id = p_dealership and status in ('new', 'confirmed')
          and starts_at between now() and now() + interval '7 days'));
  end if;
  if public.has_perm(p_dealership, 'leads.read_all') or public.has_perm(p_dealership, 'leads.read_own') then
    result := result || jsonb_build_object('pipeline', (
      select coalesce(jsonb_object_agg(stage::text, n), '{}'::jsonb) from (
        select stage, count(*) n from public.leads
         where dealership_id = p_dealership and stage not in ('won', 'lost')
           and (public.has_perm(p_dealership, 'leads.read_all') or assigned_to = auth.uid())
         group by stage) s),
      'overdueFollowUps', (
        select count(*) from public.leads
         where dealership_id = p_dealership and follow_up_at < now() and stage not in ('won', 'lost')
           and (public.has_perm(p_dealership, 'leads.read_all') or assigned_to = auth.uid())),
      'unassignedLeads', case when public.has_perm(p_dealership, 'leads.read_all') then (
        select count(*) from public.leads where dealership_id = p_dealership and assigned_to is null and stage not in ('won', 'lost')) end);
  end if;
  if public.has_perm(p_dealership, 'sales.read') then
    result := result || jsonb_build_object('salesThisMonth', (
      select jsonb_build_object(
        'count', count(*) filter (where status = 'completed'),
        'pending', count(*) filter (where status = 'pending'),
        'value', case when public.has_perm(p_dealership, 'analytics.financial')
                      then coalesce(sum(agreed_price) filter (where status = 'completed'), 0) end)
      from public.sales where dealership_id = p_dealership and sale_date >= date_trunc('month', current_date)));
  end if;
  result := result || jsonb_build_object('myTasks', (
    select jsonb_build_object('open', count(*), 'overdue', count(*) filter (where due_at < now()))
      from public.staff_tasks where dealership_id = p_dealership and assigned_to = auth.uid() and completed_at is null));
  return result;
end;
$$;

create function public.dealership_metrics(p_dealership uuid, p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  financial boolean;
  result jsonb;
begin
  perform public.require_perm(p_dealership, 'analytics.read');
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > interval '3 years' then
    perform public.raise_app_error('invalid');
  end if;
  financial := public.has_perm(p_dealership, 'analytics.financial');

  select jsonb_build_object(
    'financial', financial,
    'inventory', (select jsonb_build_object(
        'active', count(*) filter (where status in ('available', 'reserved')),
        'draft', count(*) filter (where status = 'draft'),
        'sold', count(*) filter (where status = 'sold'),
        'archived', count(*) filter (where status = 'archived'),
        'value', case when financial then coalesce(sum(price) filter (where status in ('available', 'reserved')), 0) end,
        'aging', jsonb_build_object(
          'd0_30', count(*) filter (where status in ('available', 'reserved') and now() - coalesce(published_at, created_at) <= interval '30 days'),
          'd31_60', count(*) filter (where status in ('available', 'reserved') and now() - coalesce(published_at, created_at) > interval '30 days' and now() - coalesce(published_at, created_at) <= interval '60 days'),
          'd61_90', count(*) filter (where status in ('available', 'reserved') and now() - coalesce(published_at, created_at) > interval '60 days' and now() - coalesce(published_at, created_at) <= interval '90 days'),
          'd90_plus', count(*) filter (where status in ('available', 'reserved') and now() - coalesce(published_at, created_at) > interval '90 days')))
      from public.vehicles where dealership_id = p_dealership),
    'turnoverDays', (select round(avg(extract(epoch from (v.sold_at - v.published_at)) / 86400)::numeric, 1)
      from public.vehicles v where v.dealership_id = p_dealership and v.sold_at between p_from and p_to and v.published_at is not null),
    'leads', (select jsonb_build_object(
        'total', count(*),
        'won', count(*) filter (where stage = 'won'),
        'lost', count(*) filter (where stage = 'lost'),
        'open', count(*) filter (where stage not in ('won', 'lost')),
        'byStage', (select coalesce(jsonb_object_agg(stage::text, n), '{}'::jsonb) from (
           select stage, count(*) n from public.leads where dealership_id = p_dealership and created_at between p_from and p_to group by stage) s),
        'bySource', (select coalesce(jsonb_object_agg(source, n), '{}'::jsonb) from (
           select source, count(*) n from public.leads where dealership_id = p_dealership and created_at between p_from and p_to group by source) s))
      from public.leads where dealership_id = p_dealership and created_at between p_from and p_to),
    'appointments', jsonb_build_object(
      'testDrives', (select coalesce(jsonb_object_agg(status::text, n), '{}'::jsonb) from (
         select status, count(*) n from public.test_drives where dealership_id = p_dealership and starts_at between p_from and p_to group by status) s),
      'service', (select coalesce(jsonb_object_agg(status::text, n), '{}'::jsonb) from (
         select status, count(*) n from public.service_appointments where dealership_id = p_dealership and starts_at between p_from and p_to group by status) s)),
    'reservations', (select coalesce(jsonb_object_agg(status::text, n), '{}'::jsonb) from (
       select status, count(*) n from public.reservations where dealership_id = p_dealership and created_at between p_from and p_to group by status) s),
    'requests', jsonb_build_object(
      'inquiry', (select count(*) from public.inquiries where dealership_id = p_dealership and created_at between p_from and p_to),
      'financing', (select count(*) from public.financing_requests where dealership_id = p_dealership and created_at between p_from and p_to),
      'trade_in', (select count(*) from public.trade_in_requests where dealership_id = p_dealership and created_at between p_from and p_to)),
    'sales', (select jsonb_build_object(
        'completed', count(*) filter (where status = 'completed'),
        'pending', count(*) filter (where status = 'pending'),
        'cancelled', count(*) filter (where status = 'cancelled'),
        'value', case when financial then coalesce(sum(agreed_price) filter (where status = 'completed'), 0) end,
        'average', case when financial then round(avg(agreed_price) filter (where status = 'completed')) end)
      from public.sales where dealership_id = p_dealership and sale_date between p_from::date and p_to::date),
    'team', (select coalesce(jsonb_agg(row_data order by (row_data ->> 'won')::int desc, row_data ->> 'name'), '[]'::jsonb) from (
       select jsonb_build_object(
         'userId', m.user_id,
         'name', coalesce(p.full_name, 'Staff'),
         'role', m.role,
         'leads', (select count(*) from public.leads l where l.dealership_id = p_dealership and l.assigned_to = m.user_id and l.created_at between p_from and p_to),
         'won', (select count(*) from public.leads l where l.dealership_id = p_dealership and l.assigned_to = m.user_id and l.stage = 'won' and l.closed_at between p_from and p_to),
         'sales', (select count(*) from public.sales s where s.dealership_id = p_dealership and s.salesperson_id = m.user_id and s.status = 'completed' and s.sale_date between p_from::date and p_to::date),
         'value', case when financial then (select coalesce(sum(agreed_price), 0) from public.sales s where s.dealership_id = p_dealership and s.salesperson_id = m.user_id and s.status = 'completed' and s.sale_date between p_from::date and p_to::date) end
       ) row_data
       from public.memberships m left join public.profiles p on p.id = m.user_id
      where m.dealership_id = p_dealership and m.role in ('owner', 'general_manager', 'sales_manager', 'sales_rep')) t),
    'popularVehicles', (select coalesce(jsonb_agg(row_data order by (row_data ->> 'interest')::int desc), '[]'::jsonb) from (
       select jsonb_build_object('id', v.id, 'slug', v.slug, 'name', v.make || ' ' || v.model, 'year', v.year,
         'interest', (select count(*) from public.leads l where l.vehicle_id = v.id and l.created_at between p_from and p_to)
                   + (select count(*) from public.test_drives t where t.vehicle_id = v.id and t.created_at between p_from and p_to)) row_data
         from public.vehicles v where v.dealership_id = p_dealership and v.status <> 'archived') t
       where (row_data ->> 'interest')::int > 0
       limit 8)
  ) into result;
  return result;
end;
$$;

-- Function privileges ----------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.raise_app_error(text), public.new_reference(), public.has_perm(uuid, text), public.is_member(uuid),
  public.member_role(uuid), public.require_perm(uuid, text),
  public.is_direct_write(), public.request_permission(text, text), public.request_table(text),
  public.trade_in_estimate(integer, integer, text)
  to anon, authenticated;

grant execute on function public.is_active_member(uuid, uuid) to authenticated;

grant execute on function
  public.submit_inquiry(text, text, text, text, text, text, uuid, text, text, boolean),
  public.submit_test_drive(text, uuid, date, text, text, text, text, text, text, text, boolean),
  public.submit_financing(text, uuid, bigint, bigint, smallint, text, text, text, text, text, boolean),
  public.submit_trade_in(text, text, text, smallint, integer, text, text, text, text, text, text, boolean),
  public.submit_service(text, text, text, date, text, text, text, text, text, text, text, boolean)
  to anon, authenticated;

grant execute on function
  public.my_permissions(uuid),
  public.request_reservation(text, uuid, text, text, text, boolean),
  public.cancel_my_request(text, uuid),
  public.transition_vehicle(uuid, public.vehicle_status, integer),
  public.change_vehicle_price(uuid, bigint, text, integer),
  public.decide_price_request(uuid, boolean),
  public.reorder_vehicle_media(uuid, uuid[]),
  public.replace_vehicle_equipment(uuid, jsonb),
  public.anonymize_customer(uuid),
  public.create_manual_lead(uuid, text, text, text, uuid, text, uuid, text),
  public.record_sale(uuid, uuid, uuid, uuid, bigint, date, public.sale_status, text),
  public.complete_sale(uuid, integer),
  public.cancel_sale(uuid, integer, text),
  public.correct_sale(uuid, integer, bigint, date, uuid, text, text),
  public.set_request_status(text, uuid, public.request_status, integer, text),
  public.assign_request(text, uuid, uuid),
  public.add_request_note(text, uuid, text),
  public.reschedule_appointment(text, uuid, date, text, integer),
  public.release_expired_reservations(uuid),
  public.create_invitation(uuid, text, public.staff_role),
  public.revoke_invitation(uuid),
  public.invitation_preview(text),
  public.accept_invitation(text),
  public.set_member_role(uuid, uuid, public.staff_role),
  public.set_member_status(uuid, uuid, public.member_status),
  public.remove_member(uuid, uuid),
  public.update_role_permissions(uuid, public.staff_role, text[]),
  public.list_members(uuid),
  public.staff_directory(uuid),
  public.list_invitations(uuid),
  public.dealership_admin_settings(uuid),
  public.log_security_event(uuid, text, text),
  public.dealership_overview(uuid),
  public.dealership_metrics(uuid, timestamptz, timestamptz)
  to authenticated;

revoke update on public.dealerships from anon, authenticated;
grant update (
  name, legal_name, logo_url, logo_path, phone, email, whatsapp, address, maps_url, hours, socials, services, currency,
  timezone, show_sold_vehicles, price_approval_required, booking_slots, booking_window_days, reservation_hold_hours,
  service_capacity, service_enabled, test_drive_enabled, notify_new_leads, notification_email, retention_months
) on public.dealerships to authenticated;
revoke insert, delete on public.dealerships, public.memberships, public.role_permissions, public.permissions,
  public.role_rank, public.default_role_permissions, public.audit_logs, public.rate_limits, public.staff_invitations,
  public.request_events, public.sale_events, public.vehicle_price_history, public.price_change_requests,
  public.notifications from anon, authenticated;
revoke all on public.rate_limits, public.staff_invitations from anon, authenticated;
