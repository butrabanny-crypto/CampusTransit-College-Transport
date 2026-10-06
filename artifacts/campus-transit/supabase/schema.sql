-- CampusTransit database schema for Supabase PostgreSQL.
-- Run this once in the Supabase SQL Editor before policies.sql and seed.sql.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text,
  role text not null default 'student'
    check (role in ('admin', 'driver', 'student')),
  created_at timestamptz not null default now()
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_point text not null,
  end_point text not null,
  distance_km numeric(7, 2) not null default 0 check (distance_km >= 0),
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  stop_name text not null,
  latitude numeric(10, 7) not null check (latitude between -90 and 90),
  longitude numeric(10, 7) not null check (longitude between -180 and 180),
  stop_order integer not null check (stop_order > 0),
  created_at timestamptz not null default now(),
  unique (route_id, stop_order),
  unique (route_id, id)
);

create table if not exists public.buses (
  id uuid primary key default gen_random_uuid(),
  bus_number text not null unique,
  registration_number text not null unique,
  capacity integer not null check (capacity > 0),
  status text not null default 'Available'
    check (status in ('Available', 'On Trip', 'Maintenance', 'Inactive')),
  fuel_level integer not null default 100 check (fuel_level between 0 and 100),
  last_service_date date,
  next_service_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  phone text,
  license_number text not null unique,
  license_expiry date,
  status text not null default 'Active'
    check (status in ('Active', 'On Leave', 'Inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  roll_number text not null unique,
  department text not null,
  year integer not null check (year between 1 and 8),
  phone text,
  route_id uuid references public.routes(id) on delete set null,
  stop_id uuid,
  created_at timestamptz not null default now(),
  constraint students_route_stop_fk
    foreign key (route_id, stop_id)
    references public.route_stops(route_id, id)
    on delete set null (stop_id)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references public.buses(id) on delete restrict,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  route_id uuid not null references public.routes(id) on delete restrict,
  status text not null default 'Scheduled'
    check (status in ('Scheduled', 'Running', 'Completed', 'Cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (completed_at is null or started_at is not null)
);

create unique index if not exists trips_one_running_trip_per_bus
  on public.trips (bus_id) where status = 'Running';
create unique index if not exists trips_one_running_trip_per_driver
  on public.trips (driver_id) where status = 'Running';

create table if not exists public.bus_locations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  latitude numeric(10, 7) not null check (latitude between -90 and 90),
  longitude numeric(10, 7) not null check (longitude between -180 and 180),
  speed numeric(6, 2) not null default 0 check (speed >= 0),
  recorded_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  trip_id uuid not null references public.trips(id) on delete restrict,
  bus_id uuid not null references public.buses(id) on delete restrict,
  attendance_time timestamptz not null default now(),
  status text not null default 'Present'
    check (status in ('Present', 'Late', 'Absent')),
  unique (student_id, trip_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info'
    check (type in ('info', 'trip', 'delay', 'maintenance', 'emergency', 'success')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references public.buses(id) on delete restrict,
  service_type text not null,
  service_date date not null,
  next_service_date date,
  cost numeric(12, 2) not null default 0 check (cost >= 0),
  notes text,
  status text not null default 'Scheduled'
    check (status in ('Scheduled', 'Due', 'Overdue', 'In Progress', 'Completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete restrict,
  bus_id uuid not null references public.buses(id) on delete restrict,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  latitude numeric(10, 7) check (latitude between -90 and 90),
  longitude numeric(10, 7) check (longitude between -180 and 180),
  message text not null,
  status text not null default 'Active'
    check (status in ('Active', 'Acknowledged', 'Resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists route_stops_route_order_idx
  on public.route_stops(route_id, stop_order);
create index if not exists students_route_idx on public.students(route_id);
create index if not exists trips_route_status_idx on public.trips(route_id, status);
create index if not exists trips_driver_status_idx on public.trips(driver_id, status);
create index if not exists trips_bus_status_idx on public.trips(bus_id, status);
create index if not exists bus_locations_trip_recorded_idx
  on public.bus_locations(trip_id, recorded_at desc);
create index if not exists attendance_trip_time_idx
  on public.attendance(trip_id, attendance_time desc);
create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);
create index if not exists maintenance_bus_service_date_idx
  on public.maintenance(bus_id, service_date desc);
create index if not exists emergency_alerts_status_created_idx
  on public.emergency_alerts(status, created_at desc);

-- Role assignment is server-owned. New signups always begin as students,
-- regardless of any role sent in user metadata from the browser.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Security-definer helpers keep RLS predicates concise and avoid policy
-- recursion while limiting every result to the signed-in user's assignments.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.is_driver_for_trip(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    join public.drivers d on d.id = t.driver_id
    where t.id = target_trip_id and d.profile_id = auth.uid()
  )
$$;

create or replace function public.is_student_for_trip(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    join public.students s on s.route_id = t.route_id
    where t.id = target_trip_id and s.profile_id = auth.uid()
  )
$$;

create or replace function public.driver_can_access_route(target_route_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    where t.route_id = target_route_id
      and t.status in ('Scheduled', 'Running')
      and public.is_driver_for_trip(t.id)
  )
$$;

create or replace function public.student_can_access_route(target_route_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.students s
    where s.profile_id = auth.uid() and s.route_id = target_route_id
  )
$$;

create or replace function public.driver_can_access_bus(target_bus_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trips t
    where t.bus_id = target_bus_id and public.is_driver_for_trip(t.id)
  )
$$;

create or replace function public.student_can_access_bus(target_bus_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    join public.students s on s.route_id = t.route_id
    where t.bus_id = target_bus_id
      and t.status in ('Scheduled', 'Running')
      and s.profile_id = auth.uid()
  )
$$;

create or replace function public.trip_accepts_student(target_trip_id uuid, target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    join public.students s on s.route_id = t.route_id
    where t.id = target_trip_id
      and t.status = 'Running'
      and s.id = target_student_id
  )
$$;

create or replace function public.profile_is_admin(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_profile_id and p.role = 'admin'
  )
$$;

create or replace function public.guard_driver_trip_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Running' and exists (
    select 1 from public.buses b
    where b.id = old.bus_id and b.status in ('Maintenance', 'Inactive')
  ) then
    raise exception 'This bus is not available for trips';
  end if;

  if not public.is_admin() then
    if not public.is_driver_for_trip(old.id)
       or new.bus_id is distinct from old.bus_id
       or new.driver_id is distinct from old.driver_id
       or new.route_id is distinct from old.route_id
       or new.created_at is distinct from old.created_at
       or not (
         (
           old.status = 'Scheduled'
           and new.status = 'Running'
           and new.started_at is not null
           and new.completed_at is null
         )
         or (
           old.status = 'Running'
           and new.status = 'Completed'
           and new.started_at is not distinct from old.started_at
           and new.completed_at is not null
         )
       )
    then
      raise exception 'Drivers may only start or complete their assigned trip';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trips_guard_driver_update on public.trips;
create trigger trips_guard_driver_update
  before update on public.trips
  for each row execute function public.guard_driver_trip_update();

create or replace function public.guard_driver_bus_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('Maintenance', 'Inactive') and exists (
    select 1 from public.trips t
    where t.bus_id = old.id and t.status = 'Running'
  ) then
    raise exception 'End the active trip before taking this bus out of service';
  end if;
  if new.status = 'On Trip' and not exists (
    select 1 from public.trips t
    where t.bus_id = old.id
      and t.status = 'Running'
      and (public.is_admin() or public.is_driver_for_trip(t.id))
  ) then
    raise exception 'A bus can only be marked On Trip while an assigned trip is running';
  end if;
  if new.status = 'Available' and exists (
    select 1 from public.trips t
    where t.bus_id = old.id and t.status = 'Running'
  ) then
    raise exception 'Complete the active trip before marking this bus available';
  end if;

  if not public.is_admin() then
    if not public.driver_can_access_bus(old.id)
       or new.id is distinct from old.id
       or new.bus_number is distinct from old.bus_number
       or new.registration_number is distinct from old.registration_number
       or new.capacity is distinct from old.capacity
       or new.fuel_level is distinct from old.fuel_level
       or new.last_service_date is distinct from old.last_service_date
       or new.next_service_date is distinct from old.next_service_date
       or new.created_at is distinct from old.created_at
       or new.status not in ('Available', 'On Trip')
    then
      raise exception 'Drivers may only update the trip status of their assigned bus';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists buses_guard_driver_update on public.buses;
create trigger buses_guard_driver_update
  before update on public.buses
  for each row execute function public.guard_driver_bus_update();

create or replace function public.guard_notification_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and (
    new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.type is distinct from old.type
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Users may only mark their own notifications as read';
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_guard_update on public.notifications;
create trigger notifications_guard_update
  before update on public.notifications
  for each row execute function public.guard_notification_update();

-- Realtime publication for the user-facing live streams. The DO block is
-- idempotent and avoids failing if a table is already in the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bus_locations'
  ) then
    alter publication supabase_realtime add table public.bus_locations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'emergency_alerts'
  ) then
    alter publication supabase_realtime add table public.emergency_alerts;
  end if;
end
$$;
