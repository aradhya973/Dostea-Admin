
-- ============================================================
-- DOSTEA ADMIN — SHARED SUPABASE SETUP
-- Same Supabase project used by https://dostea.vercel.app
-- ============================================================

-- 1) ADMIN MEMBERSHIP
create table if not exists public.admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    role text not null default 'admin'
        check (role in ('admin','manager')),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

grant select, update on public.admins to authenticated;

drop policy if exists "Admin can read own membership" on public.admins;
create policy "Admin can read own membership"
on public.admins
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admin can update own membership" on public.admins;
create policy "Admin can update own membership"
on public.admins
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);


-- 2) CENTRAL ADMIN AUTHORIZATION FUNCTION
create or replace function public.is_dostea_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.admins
        where user_id = (select auth.uid())
          and is_active = true
    );
$$;

revoke all on function public.is_dostea_admin() from public;
grant execute on function public.is_dostea_admin() to authenticated;


-- 3) ADMIN ACCESS TO CURRENT USER-WEB TABLES
alter table public.orders enable row level security;

drop policy if exists "Admins can view all orders" on public.orders;
create policy "Admins can view all orders"
on public.orders
for select
to authenticated
using ((select public.is_dostea_admin()));

drop policy if exists "Admins can update all orders" on public.orders;
create policy "Admins can update all orders"
on public.orders
for update
to authenticated
using ((select public.is_dostea_admin()))
with check ((select public.is_dostea_admin()));

grant select, update on public.orders to authenticated;


alter table public.order_items enable row level security;

drop policy if exists "Admins can view all order items" on public.order_items;
create policy "Admins can view all order items"
on public.order_items
for select
to authenticated
using ((select public.is_dostea_admin()));

grant select on public.order_items to authenticated;


alter table public.reservations enable row level security;

drop policy if exists "Admins can view all reservations" on public.reservations;
create policy "Admins can view all reservations"
on public.reservations
for select
to authenticated
using ((select public.is_dostea_admin()));

drop policy if exists "Admins can update all reservations" on public.reservations;
create policy "Admins can update all reservations"
on public.reservations
for update
to authenticated
using ((select public.is_dostea_admin()))
with check ((select public.is_dostea_admin()));

grant select, update on public.reservations to authenticated;


alter table public.profiles enable row level security;

drop policy if exists "Admins can view customer profiles" on public.profiles;
create policy "Admins can view customer profiles"
on public.profiles
for select
to authenticated
using ((select public.is_dostea_admin()));

grant select on public.profiles to authenticated;


-- 4) MENU MANAGEMENT TABLE
create table if not exists public.menu_items (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category text not null default 'cafe',
    description text,
    price numeric(10,2) not null default 0,
    image_url text,
    is_available boolean not null default true,
    is_featured boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.menu_items enable row level security;

drop policy if exists "Anyone can view available menu items" on public.menu_items;
create policy "Anyone can view available menu items"
on public.menu_items
for select
to anon, authenticated
using (is_available = true or (select public.is_dostea_admin()));

drop policy if exists "Admins can manage menu items" on public.menu_items;
create policy "Admins can manage menu items"
on public.menu_items
for all
to authenticated
using ((select public.is_dostea_admin()))
with check ((select public.is_dostea_admin()));

grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;


-- 5) CONTACT ENQUIRIES TABLE
create table if not exists public.contact_enquiries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    name text not null,
    email text not null,
    phone text,
    subject text,
    message text not null,
    status text not null default 'new'
        check (status in ('new','resolved')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.contact_enquiries enable row level security;

drop policy if exists "Customers can create enquiries" on public.contact_enquiries;
create policy "Customers can create enquiries"
on public.contact_enquiries
for insert
to anon, authenticated
with check (
    user_id is null
    or (select auth.uid()) = user_id
);

drop policy if exists "Admins can view enquiries" on public.contact_enquiries;
create policy "Admins can view enquiries"
on public.contact_enquiries
for select
to authenticated
using ((select public.is_dostea_admin()));

drop policy if exists "Admins can update enquiries" on public.contact_enquiries;
create policy "Admins can update enquiries"
on public.contact_enquiries
for update
to authenticated
using ((select public.is_dostea_admin()))
with check ((select public.is_dostea_admin()));

grant insert on public.contact_enquiries to anon, authenticated;
grant select, update on public.contact_enquiries to authenticated;


-- 6) REALTIME FOR ADMIN DASHBOARD
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname='supabase_realtime'
          and schemaname='public'
          and tablename='orders'
    ) then
        alter publication supabase_realtime add table public.orders;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname='supabase_realtime'
          and schemaname='public'
          and tablename='order_items'
    ) then
        alter publication supabase_realtime add table public.order_items;
    end if;

    if not exists (
        select 1 from pg_publication_tables
        where pubname='supabase_realtime'
          and schemaname='public'
          and tablename='reservations'
    ) then
        alter publication supabase_realtime add table public.reservations;
    end if;
end $$;


-- 7) MAKE YOUR EXISTING AUTH ACCOUNT AN ADMIN
-- IMPORTANT: replace YOUR_ADMIN_EMAIL below before running.
insert into public.admins (user_id, full_name, role, is_active)
select
    id,
    coalesce(
        raw_user_meta_data ->> 'full_name',
        raw_user_meta_data ->> 'name',
        split_part(email,'@',1)
    ),
    'admin',
    true
from auth.users
where email = 'dosteaadmin@gmail.com'
on conflict (user_id) do update
set
    full_name = excluded.full_name,
    role = 'admin',
    is_active = true;

notify pgrst, 'reload schema';
