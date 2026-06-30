-- ===========================================================================
-- ADT Field Assessment — initial schema
-- ===========================================================================

-- --- Jobs (assessment + property + follow-up, one row per saved job) -------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  family_name text not null default '',
  assessment_date date,
  status text not null default 'draft',
  assessment jsonb not null default '{}'::jsonb,
  property jsonb not null default '{}'::jsonb,
  followup jsonb not null default '{}'::jsonb,
  photo_path text
);

create index if not exists jobs_user_id_created_at_idx
  on public.jobs (user_id, created_at desc);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- --- Row-Level Security: each tech sees only their own jobs ----------------
alter table public.jobs enable row level security;

drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own" on public.jobs
  for select using (auth.uid() = user_id);

drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs
  for insert with check (auth.uid() = user_id);

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own" on public.jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_delete_own" on public.jobs
  for delete using (auth.uid() = user_id);

-- --- Restrict accounts to the @adt.com domain (DB-level defense) -----------
create or replace function public.enforce_adt_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) not like '%@adt.com' then
    raise exception 'Only @adt.com email addresses may create an account.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_adt_email_trigger on auth.users;
create trigger enforce_adt_email_trigger
  before insert on auth.users
  for each row execute function public.enforce_adt_email();

-- --- Private storage bucket for uploaded paper-form photos -----------------
insert into storage.buckets (id, name, public)
values ('form-photos', 'form-photos', false)
on conflict (id) do nothing;

-- Photos are stored under a per-user folder: "<user_id>/<file>".
drop policy if exists "form_photos_select_own" on storage.objects;
create policy "form_photos_select_own" on storage.objects
  for select using (
    bucket_id = 'form-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "form_photos_insert_own" on storage.objects;
create policy "form_photos_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'form-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "form_photos_delete_own" on storage.objects;
create policy "form_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'form-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
