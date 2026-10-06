import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabase = createClient(
  supabaseUrl || 'https://not-configured.supabase.co',
  supabasePublishableKey || 'not-configured',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);

export const tableLabels: Record<string, string> = {
  buses: 'Buses', drivers: 'Drivers', students: 'Students', routes: 'Routes',
  route_stops: 'Route stops', trips: 'Trips', attendance: 'Attendance',
  maintenance: 'Maintenance', emergency_alerts: 'Emergency alerts',
  notifications: 'Notifications', bus_locations: 'Bus locations', profiles: 'Profiles',
};

export const tableFields: Record<string, { name: string; type?: string; options?: string[] }[]> = {
  buses: [
    { name: 'bus_number' }, { name: 'registration_number' }, { name: 'capacity', type: 'number' },
    { name: 'status', options: ['Available', 'On Trip', 'Maintenance', 'Inactive'] },
    { name: 'fuel_level', type: 'number' }, { name: 'last_service_date', type: 'date' }, { name: 'next_service_date', type: 'date' },
  ],
  drivers: [{ name: 'profile_id' }, { name: 'phone' }, { name: 'license_number' }, { name: 'license_expiry', type: 'date' }, { name: 'status' }],
  students: [{ name: 'profile_id' }, { name: 'roll_number' }, { name: 'department' }, { name: 'year', type: 'number' }, { name: 'phone' }, { name: 'route_id' }, { name: 'stop_id' }],
  routes: [{ name: 'name' }, { name: 'start_point' }, { name: 'end_point' }, { name: 'distance_km', type: 'number' }, { name: 'estimated_minutes', type: 'number' }],
  route_stops: [{ name: 'route_id' }, { name: 'stop_name' }, { name: 'latitude', type: 'number' }, { name: 'longitude', type: 'number' }, { name: 'stop_order', type: 'number' }],
  trips: [{ name: 'bus_id' }, { name: 'driver_id' }, { name: 'route_id' }, { name: 'status', options: ['Scheduled', 'Running', 'Completed', 'Cancelled'] }, { name: 'started_at', type: 'datetime-local' }, { name: 'completed_at', type: 'datetime-local' }],
  maintenance: [{ name: 'bus_id' }, { name: 'service_type' }, { name: 'service_date', type: 'date' }, { name: 'next_service_date', type: 'date' }, { name: 'cost', type: 'number' }, { name: 'notes' }, { name: 'status' }],
  profiles: [{ name: 'full_name' }, { name: 'phone' }, { name: 'role', options: ['admin', 'driver', 'student'] }],
};
