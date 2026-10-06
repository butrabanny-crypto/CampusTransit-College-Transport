# CampusTransit

CampusTransit is a college transportation operations app for administrators, drivers, and students. It brings vehicle and route management, trip tracking, QR attendance, emergency response, maintenance, and transport analytics into one Supabase-backed workspace.

## Run in Replit

The project is a pnpm workspace artifact. In Replit, the supplied Supabase URL and publishable key are configured as shared environment variables. From the workspace root:

```bash
pnpm install
pnpm --filter @workspace/campus-transit run dev
```

The Vite app reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the environment. `.env.example` documents the two values for local development; any local `.env` should remain ignored by Git. The publishable key is designed for browser use. Never add a Supabase secret or service-role key to this project.

For a separate development checkout, copy `.env.example` to `.env` and enter the project's URL and publishable key. Configure the same two non-secret `VITE_` values in the deployment environment before publishing.

## Supabase setup

CampusTransit uses the supplied Supabase project directly through `@supabase/supabase-js`. It does not use the Replit database or a custom authentication backend.

1. In the Supabase SQL Editor, run `supabase/schema.sql`.
2. Run `supabase/policies.sql`.
3. Run `supabase/seed.sql` to add fictional buses, routes, roster entries, trips, attendance, maintenance, notifications, and a resolved safety drill.
4. In Supabase Auth, enable email/password sign-in. The database creates a `profiles` row on signup and always gives self-registered accounts the `student` role.
5. Create a user through CampusTransit registration or Supabase Auth, then use the SQL Editor to grant a role and connect that Auth profile to a seeded roster record. Do not create or share passwords in source files.

### Demo account and roster linking

The SQL seed contains directory fixtures, not login accounts. No passwords or Auth users are inserted. Create three Auth users through the app or Supabase Dashboard, choosing your own passwords. The signup trigger makes each new account a student first.

After creating `admin@college.com`, promote it in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@college.com';
```

Sign out and back in after changing a role so the app reloads the profile. The admin account can then add roster records or use the existing fictional demo records.

To connect a driver login to Ramesh's seeded assignment:

```sql
update public.profiles
set role = 'driver'
where email = 'driver@college.com';

update public.drivers
set profile_id = (
  select id from public.profiles where email = 'driver@college.com'
)
where license_number = 'AP-DL-2018-00421';
```

To connect a student login to the seeded Banny record on Route A:

```sql
update public.students
set profile_id = (
  select id from public.profiles where email = 'student@college.com'
)
where roll_number = 'CT-2024-001';
```

If you use different email addresses, replace the values in these examples. To assign a different seeded vehicle/route, update the driver's existing trip in `public.trips` as an administrator.

### Schema and security notes

- Auth sessions come from Supabase Auth. The client loads role and roster data from `profiles`.
- Signup metadata cannot choose an elevated role. Only an administrator can manage roles through the app; initial admin promotion is performed in the Supabase SQL Editor.
- Row Level Security is enabled on all 12 application tables. Students are limited to their own profile, assigned route, trip, attendance, and notifications. Drivers are limited to their assignments. Admin policies manage all transport records.
- `attendance` has a unique `(student_id, trip_id)` constraint to prevent duplicate check-ins.
- Supabase Realtime is enabled for bus locations, notifications, and emergency alerts. The app labels movement as “Demo GPS Simulation”; no hardware GPS is implied.
- The seeded profiles are fictional roster fixtures and are not linked to Supabase Auth users until you explicitly connect a real Auth profile as shown above.

## Application architecture

```text
React + Vite (CampusTransit)
  ├─ Supabase Auth session and profile-role routing
  ├─ Supabase JS client → PostgreSQL tables guarded by RLS
  ├─ Supabase Realtime → locations, notifications, emergencies
  ├─ Leaflet + OpenStreetMap → stops, routes, vehicle positions
  └─ QR generator/scanner → student pass and active-trip attendance
```

All persistent operations use Supabase. The browser never receives a service-role credential. Maps use OpenStreetMap tiles; GPS movement is a clearly labeled simulation that writes to `bus_locations`.

## Features

- Admin dashboard and role-aware navigation
- Bus, driver, student, route, trip, maintenance, and emergency management
- Live bus maps, route stops, location freshness, and ETA estimates
- Driver trip start/end, simulated GPS updates, issue reporting, SOS, and QR scan
- Student route/bus tracking, attendance, personal QR pass, and notifications
- Realtime bus location, notification, and emergency updates
- Responsive analytics and rule-based route utilization recommendations
- Loading, empty, and user-friendly error states

## Five-minute hackathon demo

1. **Admin sign-in:** Open the dashboard and review the seeded fleet, routes, students, maintenance, and attendance counts.
2. **Live tracking:** Open the live map, select BUS-01, and point out the route, current simulated location, last update, and ETA.
3. **Driver workflow:** Sign in with the driver account linked to Ramesh. Start the scheduled trip; the bus moves along Route A and writes location rows. Scan a student QR pass to record attendance.
4. **Student workflow:** Sign in with the student account linked to the Route A roster record. Show assigned bus, next stop, ETA, attendance, and the personal QR pass.
5. **Safety response:** From the driver portal, confirm SOS. Return to the admin portal to acknowledge and resolve the realtime alert.
6. **Operations:** Finish on analytics and Smart Insights, then show the overdue BUS-05 maintenance record and service restriction.

## Verification checklist

- [ ] Supabase URL/key load from environment and Auth sign-in/sign-out work.
- [ ] Student signup creates a student-role profile; protected routes redirect by role.
- [ ] RLS limits student and driver reads/writes to their own assignments.
- [ ] Admin can add, edit, search, filter, and delete supported transport records.
- [ ] Maintenance and inactive buses cannot start trips.
- [ ] Driver trip start/end, simulated GPS persistence, and Realtime map updates work.
- [ ] Student view refreshes bus location and ETA without a page reload.
- [ ] QR attendance validates the active trip and route, and duplicate scans are rejected.
- [ ] Notifications and emergency alerts persist and update in realtime.
- [ ] Analytics and route recommendations derive from queried records.
- [ ] Desktop and mobile layouts render with loading, empty, and failure states.

## Presentation story

**Problem:** College transport is split across manual fleet lists, uncertain arrival times, paper attendance, and disconnected safety procedures.

**Solution:** CampusTransit gives campus teams, drivers, and students one role-secured transport workspace for live trip visibility, attendance, maintenance, alerts, and route utilization.

**Outcome:** Staff can make assignment and service decisions from the same operational data students and drivers use during a trip.

## Future improvements

- Use authenticated driver-device geolocation instead of simulated movement.
- Add timetable windows and historical delay measurements.
- Add push/SMS delivery through a campus-approved provider.
- Add import/export for institutional student and fleet records.
- Add geofence-based stop arrival detection and route-change audit history.
- Add tenant-level campus configuration and a formal invitation workflow.
