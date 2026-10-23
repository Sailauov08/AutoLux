-- Storage buckets. Paths: vehicle-media/{dealership_id}/{vehicle_id}/{uuid}.{ext}, dealership-assets/{dealership_id}/{uuid}.{ext}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-media', 'vehicle-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('dealership-assets', 'dealership-assets', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create function public.storage_path_uuid(p_name text, p_index integer) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return (string_to_array(p_name, '/'))[p_index]::uuid;
exception when others then
  return null;
end;
$$;

create function public.can_write_vehicle_media(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'
     and public.has_perm(public.storage_path_uuid(p_name, 1), 'media.update')
     and exists (
       select 1 from public.vehicles
        where id = public.storage_path_uuid(p_name, 2) and dealership_id = public.storage_path_uuid(p_name, 1))
$$;

create function public.can_write_dealership_asset(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
     and public.has_perm(public.storage_path_uuid(p_name, 1), 'settings.update')
$$;

revoke execute on function public.storage_path_uuid(text, integer), public.can_write_vehicle_media(text),
  public.can_write_dealership_asset(text) from public, anon;
grant execute on function public.storage_path_uuid(text, integer), public.can_write_vehicle_media(text),
  public.can_write_dealership_asset(text) to authenticated;

create policy vehicle_media_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'vehicle-media' and public.can_write_vehicle_media(name));
create policy vehicle_media_objects_update on storage.objects for update to authenticated
  using (bucket_id = 'vehicle-media' and public.can_write_vehicle_media(name))
  with check (bucket_id = 'vehicle-media' and public.can_write_vehicle_media(name));
create policy vehicle_media_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vehicle-media' and public.can_write_vehicle_media(name));

create policy dealership_assets_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'dealership-assets' and public.can_write_dealership_asset(name));
create policy dealership_assets_update on storage.objects for update to authenticated
  using (bucket_id = 'dealership-assets' and public.can_write_dealership_asset(name))
  with check (bucket_id = 'dealership-assets' and public.can_write_dealership_asset(name));
create policy dealership_assets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'dealership-assets' and public.can_write_dealership_asset(name));
