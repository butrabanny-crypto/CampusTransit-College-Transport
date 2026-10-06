-- Row Level Security and grants for CampusTransit.
-- Run after schema.sql. These policies assume authenticated users only.

alter table public.profiles enable row level security;
alter table public.buses enable row level security;
alter table public.drivers enable row level security;
alter table public.students enable row level security;
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.trips enable row level security;
alter table public.bus_locations enable row level security;
alter table public.attendance enable row level security;
alter table public.notifications enable row level security;
alter table public.maintenance enable row level security;
alter table public.emergency_alerts enable row level security;

-- The app has no anonymous data access. Grants on these named tables do not
-- change permissions on any other tables that may exist in the Supabase project.
revoke all on table
  public.profiles, public.buses, public.drivers, public.students, public.routes,
  public.route_stops, public.trips, public.bus_locations, public.attendance,
  public.notifications, public.maintenance, public.emergency_alerts
from anon;

grant select, insert, update, delete on table
  public.profiles, public.buses, public.drivers, public.students, public.routes,
  public.route_stops, public.trips, public.bus_locations, public.attendance,
  public.notifications, public.maintenance, public.emergency_alerts
to authenticated;

-- Policy helpers are callable by signed-in clients so that RLS can evaluate
-- assignment checks. Trigger-only functions are not exposed for RPC use.
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_driver_for_trip(uuid) from public, anon;
revoke all on function public.is_student_for_trip(uuid) from public, anon;
revoke all on function public.driver_can_access_route(uuid) from public, anon;
revoke all on function public.student_can_access_route(uuid) from public, anon;
revoke all on function public.driver_can_access_bus(uuid) from public, anon;
revoke all on function public.student_can_access_bus(uuid) from public, anon;
revoke all on function public.trip_accepts_student(uuid, uuid) from public, anon;
revoke all on function public.profile_is_admin(uuid) from public, anon;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_driver_for_trip(uuid) to authenticated;
grant execute on function public.is_student_for_trip(uuid) to authenticated;
grant execute on function public.driver_can_access_route(uuid) to authenticated;
grant execute on function public.student_can_access_route(uuid) to authenticated;
grant execute on function public.driver_can_access_bus(uuid) to authenticated;
grant execute on function public.student_can_access_bus(uuid) to authenticated;
grant execute on function public.trip_accepts_student(uuid, uuid) to authenticated;
grant execute on function public.profile_is_admin(uuid) to authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.guard_driver_trip_update() from public, anon, authenticated;
revoke all on function public.guard_driver_bus_update() from public, anon, authenticated;
revoke all on function public.guard_notification_update() from public, anon, authenticated;

-- Profiles: users can read only themselves; admins manage all. A driver can
-- see students on currently assigned routes and a student can see the driver
-- assigned to a scheduled or active trip on their own route.
drop policy if exists profiles_read_self_or_assigned on public.profiles;
create policy profiles_read_self_or_assigned
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.students s
      where s.profile_id = profiles.id
        and public.driver_can_access_route(s.route_id)
    )
    or exists (
      select 1
      from public.drivers d
      join public.trips t on t.driver_id = d.id
      where d.profile_id = profiles.id
        and t.status in ('Scheduled', 'Running')
        and public.student_can_access_route(t.route_id)
    )
  );

drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists profiles_self_student_insert on public.profiles;
create policy profiles_self_student_insert
  on public.profiles for insert to authenticated
  with check (id = auth.uid() and role = 'student');

-- Buses
drop policy if exists buses_read_assigned on public.buses;
create policy buses_read_assigned
  on public.buses for select to authenticated
  using (
    public.is_admin()
    or public.driver_can_access_bus(id)
    or public.student_can_access_bus(id)
  );

drop policy if exists buses_admin_manage on public.buses;
create policy buses_admin_manage
  on public.buses for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists buses_driver_status_update on public.buses;
create policy buses_driver_status_update
  on public.buses for update to authenticated
  using (public.current_app_role() = 'driver' and public.driver_can_access_bus(id))
  with check (public.current_app_role() = 'driver' and public.driver_can_access_bus(id));

-- Drivers
drop policy if exists drivers_read_self_or_assigned on public.drivers;
create policy drivers_read_self_or_assigned
  on public.drivers for select to authenticated
  using (
    public.is_admin()
    or profile_id = auth.uid()
    or exists (
      select 1
      from public.trips t
      where t.driver_id = drivers.id
        and t.status in ('Scheduled', 'Running')
        and public.is_student_for_trip(t.id)
    )
  );

drop policy if exists drivers_admin_manage on public.drivers;
create policy drivers_admin_manage
  on public.drivers for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Students
drop policy if exists students_read_self_route_or_admin on public.students;
create policy students_read_self_route_or_admin
  on public.students for select to authenticated
  using (
    public.is_admin()
    or profile_id = auth.uid()
    or public.driver_can_access_route(route_id)
  );

drop policy if exists students_admin_manage on public.students;
create policy students_admin_manage
  on public.students for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Routes and stops
drop policy if exists routes_read_assigned on public.routes;
create policy routes_read_assigned
  on public.routes for select to authenticated
  using (
    public.is_admin()
    or public.driver_can_access_route(id)
    or public.student_can_access_route(id)
  );

drop policy if exists routes_admin_manage on public.routes;
create policy routes_admin_manage
  on public.routes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists route_stops_read_assigned on public.route_stops;
create policy route_stops_read_assigned
  on public.route_stops for select to authenticated
  using (
    public.is_admin()
    or public.driver_can_access_route(route_id)
    or public.student_can_access_route(route_id)
  );

drop policy if exists route_stops_admin_manage on public.route_stops;
create policy route_stops_admin_manage
  on public.route_stops for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Trips
drop policy if exists trips_read_assigned on public.trips;
create policy trips_read_assigned
  on public.trips for select to authenticated
  using (
    public.is_admin()
    or public.is_driver_for_trip(id)
    or public.is_student_for_trip(id)
  );

drop policy if exists trips_admin_manage on public.trips;
create policy trips_admin_manage
  on public.trips for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists trips_driver_update_assigned on public.trips;
create policy trips_driver_update_assigned
  on public.trips for update to authenticated
  using (
    public.current_app_role() = 'driver'
    and public.is_driver_for_trip(id)
  )
  with check (
    public.current_app_role() = 'driver'
    and public.is_driver_for_trip(id)
    and status in ('Running', 'Completed')
  );

-- GPS locations: only admins and assigned trip participants may read. Drivers
-- can append locations only for their own running trip.
drop policy if exists bus_locations_read_assigned on public.bus_locations;
create policy bus_locations_read_assigned
  on public.bus_locations for select to authenticated
  using (
    public.is_admin()
    or public.is_driver_for_trip(trip_id)
    or public.is_student_for_trip(trip_id)
  );

drop policy if exists bus_locations_insert_assigned on public.bus_locations;
create policy bus_locations_insert_assigned
  on public.bus_locations for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.is_driver_for_trip(trip_id)
      and exists (
        select 1 from public.trips t
        where t.id = trip_id and t.status = 'Running'
      )
    )
  );

-- Attendance: students see only their own rows. Drivers can see and add
-- attendance only on an active trip for students enrolled on its route.
drop policy if exists attendance_read_assigned on public.attendance;
create policy attendance_read_assigned
  on public.attendance for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.students s
      where s.id = attendance.student_id and s.profile_id = auth.uid()
    )
    or public.is_driver_for_trip(trip_id)
  );

drop policy if exists attendance_insert_route_trip on public.attendance;
create policy attendance_insert_route_trip
  on public.attendance for insert to authenticated
  with check (
    public.is_admin()
    or (
      public.is_driver_for_trip(trip_id)
      and public.trip_accepts_student(trip_id, student_id)
      and exists (
        select 1 from public.trips t
        where t.id = trip_id and t.bus_id = attendance.bus_id and t.status = 'Running'
      )
    )
  );

drop policy if exists attendance_admin_manage on public.attendance;
create policy attendance_admin_manage
  on public.attendance for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Notifications are private to their recipient. Drivers may send a transport
-- alert only to an admin. Each user can update their own read flag.
drop policy if exists notifications_read_recipient on public.notifications;
create policy notifications_read_recipient
  on public.notifications for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

drop policy if exists notifications_admin_manage on public.notifications;
create policy notifications_admin_manage
  on public.notifications for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists notifications_driver_to_admin on public.notifications;
create policy notifications_driver_to_admin
  on public.notifications for insert to authenticated
  with check (
    public.current_app_role() = 'driver'
    and public.profile_is_admin(user_id)
  );

drop policy if exists notifications_recipient_read_update on public.notifications;
create policy notifications_recipient_read_update
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Maintenance is strictly an admin function.
drop policy if exists maintenance_admin_manage on public.maintenance;
create policy maintenance_admin_manage
  on public.maintenance for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Drivers can create and view their own emergency alerts; only admins may
-- acknowledge or resolve alerts.
drop policy if exists emergency_alerts_read_assigned on public.emergency_alerts;
create policy emergency_alerts_read_assigned
  on public.emergency_alerts for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.drivers d
      where d.id = emergency_alerts.driver_id and d.profile_id = auth.uid()
    )
  );

drop policy if exists emergency_alerts_admin_manage on public.emergency_alerts;
create policy emergency_alerts_admin_manage
  on public.emergency_alerts for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists emergency_alerts_driver_create on public.emergency_alerts;
create policy emergency_alerts_driver_create
  on public.emergency_alerts for insert to authenticated
  with check (
    public.current_app_role() = 'driver'
    and status = 'Active'
    and exists (
      select 1
      from public.trips t
      join public.drivers d on d.id = t.driver_id
      where t.id = emergency_alerts.trip_id
        and t.status = 'Running'
        and t.bus_id = emergency_alerts.bus_id
        and t.driver_id = emergency_alerts.driver_id
        and d.profile_id = auth.uid()
    )
  );
