create table if not exists public.portfolio_content (
  id integer primary key check (id = 1),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_content enable row level security;

grant select, insert, update on public.portfolio_content to anon, authenticated;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'licudanchristianmiguel02@gmail.com';
$$;

revoke execute on function public.is_portfolio_admin() from public, anon;
grant execute on function public.is_portfolio_admin() to authenticated;

drop policy if exists "Portfolio is publicly viewable" on public.portfolio_content;
create policy "Portfolio is publicly viewable"
  on public.portfolio_content
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Configured admin can create portfolio content" on public.portfolio_content;
create policy "Configured admin can create portfolio content"
  on public.portfolio_content
  for insert
  to authenticated
  with check (public.is_portfolio_admin());

drop policy if exists "Configured admin can update portfolio content" on public.portfolio_content;
create policy "Configured admin can update portfolio content"
  on public.portfolio_content
  for update
  to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

insert into public.portfolio_content (id, content)
values (
  1,
  '{
    "profile": {
      "name": "Your Name",
      "title": "Designer & Developer",
      "location": "Your City",
      "bio": "I build thoughtful digital experiences that bring ideas to life."
    },
    "projects": []
  }'::jsonb
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-images',
  'portfolio-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "About photos are publicly viewable" on storage.objects;
create policy "About photos are publicly viewable"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'portfolio-images');

drop policy if exists "Configured admin can upload About photos" on storage.objects;
create policy "Configured admin can upload About photos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'portfolio-images' and public.is_portfolio_admin());

drop policy if exists "Configured admin can update About photos" on storage.objects;
create policy "Configured admin can update About photos"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'portfolio-images' and public.is_portfolio_admin())
  with check (bucket_id = 'portfolio-images' and public.is_portfolio_admin());

drop policy if exists "Configured admin can delete About photos" on storage.objects;
create policy "Configured admin can delete About photos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'portfolio-images' and public.is_portfolio_admin());
