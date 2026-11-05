-- Closet Swap database setup for Supabase.
-- Paste this whole file into Supabase → SQL Editor → New query, then click Run.
-- It's safe to run again: it only creates what's missing and refreshes the rules.

-- ---------- Tables ----------

-- One row per person, created automatically when they sign up.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  sizes      jsonb not null default '{}'::jsonb,   -- height and sizes from the Profile page
  created_at timestamptz not null default now()
);

-- Every piece of clothing in anyone's closet.
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null,
  description text not null default '',
  category    text not null default 'Tops',
  color       text not null default '',
  color_hex   text not null default '',
  size        text not null default '',
  img_url     text not null default '',
  available   boolean not null default true,   -- open to borrow
  removed     boolean not null default false,  -- removed from the closet
  created_at  timestamptz not null default now()
);
create index if not exists items_owner_idx on public.items (owner);

-- Borrow requests and swaps. status: requested → active → returned (or declined / cancelled).
create table if not exists public.requests (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.items (id) on delete cascade,
  owner      uuid not null references public.profiles (id) on delete cascade,
  borrower   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  start_date date not null default current_date,
  note       text not null default '',
  status     text not null default 'requested'
             check (status in ('requested', 'active', 'declined', 'returned', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists requests_owner_idx on public.requests (owner);
create index if not exists requests_borrower_idx on public.requests (borrower);

-- Hearted pieces.
create table if not exists public.wishlist (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item_id    uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- ---------- New sign-ups get a profile ----------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Security rules (row level security) ----------
-- Signed-in people can see everyone's closet; you can only change your own things.

alter table public.profiles enable row level security;
alter table public.items    enable row level security;
alter table public.requests enable row level security;
alter table public.wishlist enable row level security;

drop policy if exists "Profiles are visible to signed-in people" on public.profiles;
create policy "Profiles are visible to signed-in people" on public.profiles
  for select to authenticated using (true);
drop policy if exists "You can edit your own profile" on public.profiles;
create policy "You can edit your own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Closets are visible to signed-in people" on public.items;
create policy "Closets are visible to signed-in people" on public.items
  for select to authenticated using (true);
drop policy if exists "You can add to your own closet" on public.items;
create policy "You can add to your own closet" on public.items
  for insert to authenticated with check (owner = auth.uid());
drop policy if exists "You can edit your own pieces" on public.items;
create policy "You can edit your own pieces" on public.items
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "You can delete your own pieces" on public.items;
create policy "You can delete your own pieces" on public.items
  for delete to authenticated using (owner = auth.uid());

drop policy if exists "You see swaps you're part of" on public.requests;
create policy "You see swaps you're part of" on public.requests
  for select to authenticated using (auth.uid() in (owner, borrower));
drop policy if exists "You can ask to borrow a friend's piece" on public.requests;
create policy "You can ask to borrow a friend's piece" on public.requests
  for insert to authenticated with check (
    borrower = auth.uid()
    and owner <> auth.uid()
    and exists (select 1 from public.items i
                where i.id = item_id and i.owner = requests.owner and i.available and not i.removed)
  );
drop policy if exists "Either side can update a swap" on public.requests;
create policy "Either side can update a swap" on public.requests
  for update to authenticated using (auth.uid() in (owner, borrower)) with check (auth.uid() in (owner, borrower));

drop policy if exists "Your wishlist is yours" on public.wishlist;
create policy "Your wishlist is yours" on public.wishlist
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Photo storage ----------

insert into storage.buckets (id, name, public)
values ('closet-photos', 'closet-photos', true)
on conflict (id) do nothing;

drop policy if exists "Closet photos are public" on storage.objects;
create policy "Closet photos are public" on storage.objects
  for select using (bucket_id = 'closet-photos');
drop policy if exists "You can upload to your own folder" on storage.objects;
create policy "You can upload to your own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'closet-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "You can delete your own photos" on storage.objects;
create policy "You can delete your own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'closet-photos' and owner = auth.uid());
