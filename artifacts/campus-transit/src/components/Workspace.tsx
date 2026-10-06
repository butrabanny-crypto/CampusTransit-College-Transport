import { useEffect, useMemo, useState, useRef, type FormEvent, type ReactNode, type ElementType } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertCircle, AlertTriangle, ArrowRight, Bus, CalendarDays, Check, CheckCircle2, Clock3, Compass, Gauge, LayoutDashboard, LogOut, MapPin, Menu, Navigation, Plus, QrCode, RefreshCw, Search, ShieldCheck, Siren, Users, Wrench, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured, supabase, tableFields, tableLabels } from '@/lib/supabase';
import { TransitMap } from '@/components/TransitMap';

const nav = [
  ['Overview', '/admin', LayoutDashboard], ['Buses', '/admin/buses', Bus], ['Drivers', '/admin/drivers', Users], ['Students', '/admin/students', Users],
  ['Routes', '/admin/routes', Compass], ['Trips', '/admin/trips', CalendarDays], ['Live operations', '/admin/live', Navigation],
  ['Attendance', '/admin/attendance', CheckCircle2], ['Maintenance', '/admin/maintenance', Wrench], ['Emergency', '/admin/emergency', Siren],
  ['Profiles', '/admin/profiles', Users], ['Analytics', '/admin/analytics', Activity], ['Insights', '/admin/insights', Gauge], ['Notifications', '/admin/notifications', AlertCircle],
] as const;
const tables: Record<string, string> = { buses: 'buses', drivers: 'drivers', students: 'students', routes: 'routes', trips: 'trips', live: 'bus_locations', attendance: 'attendance', maintenance: 'maintenance', emergency: 'emergency_alerts', notifications: 'notifications', profiles: 'profiles' };
const labels: Record<string, string> = { buses: 'Bus fleet', drivers: 'Driver roster', students: 'Student directory', routes: 'Routes & stops', trips: 'Trip schedule', live: 'Live operations', attendance: 'Attendance', maintenance: 'Maintenance', emergency: 'Emergency desk', analytics: 'Operations analytics', insights: 'Route insights', notifications: 'Notifications', profiles: 'User profiles' };
const editable = ['buses', 'drivers', 'students', 'routes', 'trips', 'maintenance', 'profiles', 'route_stops'];
const title = (v: string) => v.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const messageOf = (e: unknown) => e instanceof Error ? e.message : 'Request failed. Check your connection and access policies.';
async function rows(table: string) { const { data, error } = await supabase.from(table).select('*').order('id', { ascending: false }).limit(300); if (error) throw error; return data || []; }

export function SetupPage() {
  return <main className="setup-screen"><section className="setup-card"><span className="brand-mark"><Bus /></span><span className="eyebrow">CAMPUS TRANSIT SETUP</span><h1>Connect your campus operations.</h1><p>Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, then configure the profiles and transport tables with the expected row-level security policies.</p><div className="setup-check"><AlertTriangle size={18} /> No local or sample records are shown.</div></section></main>;
}
export function LoginPage({ register = false }: { register?: boolean }) {
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    try {
      if (!isSupabaseConfigured) throw new Error('Supabase is not configured. Add your project URL and anon key.');
      if (register) {
        const { error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (authError) throw authError;
        setSuccess('Student account created. Your student profile is being set up securely. Verify your email if requested, then sign in.');
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password }); if (authError) throw authError;
        const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('Could not confirm your signed-in session.');
        const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profileError) throw profileError; if (!profile?.role) throw new Error('Your campus profile is missing. Contact transport administration.');
        setLocation(`/${profile.role}`);
      }
    } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  return <div className="auth-layout"><aside className="auth-aside"><div className="brand-lockup"><span className="brand-mark"><Bus size={22} /></span><span>Campus<span>Transit</span></span></div><div className="auth-message"><span className="eyebrow">CAMPUS MOBILITY, IN SYNC</span><h1>Every route.<br />One clear view.</h1><p>Reliable transport operations for the people who keep campus moving.</p></div><div className="auth-aside-foot"><ShieldCheck size={17} /> Secure access for campus community</div></aside><main className="auth-main"><form className="auth-form" onSubmit={submit}><span className="eyebrow">{register ? 'STUDENT ACCESS' : 'WELCOME BACK'}</span><h2>{register ? 'Create your account' : 'Sign in to CampusTransit'}</h2><p className="muted">{register ? 'Self-registration is available to students.' : 'Use your campus credentials to continue.'}</p>
    {register && <label>Full name<input required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" /></label>}
    <label>Campus email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label><label>Password<input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} /></label>
    {error && <div className="inline-error" role="alert"><AlertCircle size={17} />{error}</div>}{success && <div className="inline-success" role="status"><CheckCircle2 size={17} />{success}</div>}
    <button className="button primary full" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create student account' : 'Sign in'}<ArrowRight size={17} /></button><p className="switch-auth">{register ? 'Already registered?' : 'New student?'} <Link href={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>
  </form></main></div>;
}
function Pill({ value }: { value: unknown }) { const s = String(value || 'Recorded'); const c = /running|available|resolved|completed|present|active/i.test(s) ? 'good' : /maintenance|cancel|inactive|absent/i.test(s) ? 'warn' : /scheduled|acknowledged|unread/i.test(s) ? 'info' : ''; return <span className={`status-pill ${c}`}><i />{s}</span>; }
function maintenanceStatus(record: any) {
  const stored = String(record?.status || 'Scheduled');
  if (/complete|closed|cancel/i.test(stored) || !record?.next_service_date) return stored;
  const today = new Date().toISOString().slice(0, 10);
  const next = String(record.next_service_date).slice(0, 10);
  if (next < today) return 'Overdue';
  const days = (new Date(`${next}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000;
  return days <= 30 ? 'Due soon' : stored;
}
function Heading({ name, subtitle, action }: { name: string; subtitle: string; action?: ReactNode }) { return <div className="page-heading"><div><span className="eyebrow">CAMPUS TRANSPORT</span><h1>{name}</h1><p>{subtitle}</p></div>{action}</div>; }
function StateError({ error, retry }: { error: unknown; retry: () => void }) { return <div className="state-card error-state"><span className="state-icon"><AlertCircle /></span><div><strong>We couldn’t load these records</strong><p>{messageOf(error)} Verify that the table exists and your account has permission.</p><button className="button subtle" onClick={retry}><RefreshCw size={15} /> Try again</button></div></div>; }
function Empty({ noun }: { noun: string }) { return <div className="empty-state"><span className="empty-icon"><Compass /></span><h3>No {noun.toLowerCase()} yet</h3><p>Records will appear here after they are added to your campus workspace.</p></div>; }
function GridTable({ table, data, after, readOnly = false, update, edit }: { table: string; data: any[]; after: () => void; readOnly?: boolean; update?: (r: any) => void; edit?: (r: any) => void }) {
  const defaults: Record<string, string[]> = { attendance: ['student_id', 'trip_id', 'bus_id', 'attendance_time'], notifications: ['message', 'type', 'created_at'], emergency_alerts: ['trip_id', 'bus_id', 'driver_id', 'created_at'], bus_locations: ['trip_id', 'latitude', 'longitude', 'speed', 'recorded_at'], profiles: ['email', 'phone', 'role'] };
  const cols = (tableFields[table]?.length ? tableFields[table].map((f) => f.name) : defaults[table] || []).slice(0, 5);
  const del = async (r: any) => { if (table === 'profiles') return; if (!window.confirm(`Delete this ${tableLabels[table]?.toLowerCase() || 'record'}?`)) return; const { error } = await supabase.from(table).delete().eq('id', r.id); if (error) window.alert(error.message); else after(); };
  return <div className="table-wrap"><table><thead><tr><th>Record</th>{cols.map((c) => <th key={c}>{title(c)}</th>)}<th>Status</th>{!readOnly && <th>Action</th>}</tr></thead><tbody>{data.map((r: any) => <tr key={r.id}><td><div className="row-primary"><span className="row-avatar">{String(r.bus_number || r.name || r.roll_number || r.stop_name || r.id || '?').slice(0, 1).toUpperCase()}</span><span><strong>{String(r.bus_number || r.name || r.roll_number || r.stop_name || r.full_name || r.title || String(r.id).slice(0, 8))}</strong><small>{String(r.registration_number || r.email || r.service_type || r.start_point || r.id || '').slice(0, 34)}</small></span></div></td>{cols.map((c) => <td key={c}>{/status/i.test(c) ? <Pill value={r[c]} /> : String(r[c] ?? '—')}</td>)}<td><Pill value={table === 'maintenance' ? maintenanceStatus(r) : r.status || r.role || (r.is_read ? 'Read' : 'Recorded')} /></td>{!readOnly && <td className="row-actions">{edit && <button className="text-action" onClick={() => edit(r)}>Edit</button>}{update && r.status !== 'Resolved' && (table !== 'trips' || ['Scheduled', 'Running'].includes(r.status)) && <button className="text-action" onClick={() => update(r)}>Update status</button>}{editable.includes(table) && table !== 'profiles' && <button className="text-action danger-text" onClick={() => del(r)}>Delete</button>}</td>}</tr>)}</tbody></table></div>;
}
function AddDialog({ table, close, saved, record }: { table: string; close: () => void; saved: () => void; record?: Record<string, any> }) {
  const fields = tableFields[table] || []; const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => { const raw = record?.[f.name]; const value = raw == null ? '' : String(raw); return [f.name, f.type === 'date' ? value.slice(0, 10) : f.type === 'datetime-local' ? new Date(value).toISOString().slice(0, 16) : value]; }))); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const refs: Record<string, string> = { profile_id: 'profiles', bus_id: 'buses', driver_id: 'drivers', route_id: 'routes', stop_id: 'route_stops' };
  const needs = (name: string) => fields.some((f) => f.name === name);
  const profiles = useQuery({ queryKey: ['picker-profiles'], queryFn: () => rows('profiles'), enabled: needs('profile_id') });
  const buses = useQuery({ queryKey: ['picker-buses'], queryFn: () => rows('buses'), enabled: needs('bus_id') });
  const drivers = useQuery({ queryKey: ['picker-drivers'], queryFn: () => rows('drivers'), enabled: needs('driver_id') });
  const routes = useQuery({ queryKey: ['picker-routes'], queryFn: () => rows('routes'), enabled: needs('route_id') });
  const stops = useQuery({ queryKey: ['picker-stops'], queryFn: () => rows('route_stops'), enabled: needs('stop_id') });
  const options: Record<string, any[]> = { profiles: profiles.data || [], buses: buses.data || [], drivers: drivers.data || [], routes: routes.data || [], route_stops: stops.data || [] };
  const pickerQueries = [profiles, buses, drivers, routes, stops].filter((query) => query.isEnabled);
  const pickerError = pickerQueries.find((query) => query.error);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setErr(''); const payload: Record<string, unknown> = {}; fields.forEach((f) => { if (values[f.name] !== '') payload[f.name] = f.type === 'number' ? Number(values[f.name]) : f.type === 'datetime-local' ? new Date(values[f.name]).toISOString() : values[f.name]; }); if (table === 'trips' && !record) payload.status = 'Scheduled'; const result = record ? await supabase.from(table).update(payload).eq('id', record.id) : await supabase.from(table).insert(payload); setBusy(false); if (result.error) setErr(result.error.message); else { saved(); close(); } };
  const optionLabel = (source: string, item: any) => source === 'profiles' ? `${item.full_name || item.email || item.id} · ${item.role || 'profile'}` : source === 'buses' ? `${item.bus_number || 'Bus'} · ${item.registration_number || item.id}` : source === 'drivers' ? `${item.license_number || 'Driver'} · ${item.id.slice(0, 8)}` : source === 'routes' ? `${item.name || 'Route'} · ${item.start_point || ''} → ${item.end_point || ''}` : `${item.stop_name || 'Stop'}${item.stop_order == null ? '' : ` · stop ${item.stop_order}`}`;
  const profileMatches = (p: any) => table === 'drivers' ? p.role === 'driver' : table === 'students' ? p.role === 'student' : true;
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="record-dialog-title"><div className="dialog-header"><div><span className="eyebrow">{record ? 'EDIT RECORD' : 'NEW RECORD'}</span><h2 id="record-dialog-title">{record ? 'Edit' : 'Add'} {tableLabels[table]?.replace(/s$/, '')}</h2></div><button className="icon-button" onClick={close} aria-label="Close"><X /></button></div><form onSubmit={submit}><div className="form-grid">{fields.map((f) => {
    const source = refs[f.name];
    if (source) {
      let list = options[source];
      if (source === 'profiles') list = list.filter(profileMatches);
      if (source === 'route_stops' && values.route_id) list = list.filter((item) => item.route_id === values.route_id);
      return <label key={f.name}>{title(f.name)}<select required={f.name !== 'stop_id'} value={values[f.name] || ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}><option value="">{pickerQueries.some((query) => query.isLoading) ? 'Loading options…' : `Choose ${title(f.name)}`}</option>{list.map((item) => <option key={item.id} value={item.id}>{optionLabel(source, item)}</option>)}</select></label>;
    }
    if (table === 'trips' && !record && f.name === 'status') return <label key={f.name}>Status<input value="Scheduled" readOnly aria-readonly="true" /></label>;
    return <label key={f.name}>{title(f.name)}{f.options ? <select required value={values[f.name] || ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}><option value="">Choose status</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select> : <input required={['bus_number', 'registration_number', 'name', 'roll_number', 'license_number'].includes(f.name)} type={f.type || 'text'} value={values[f.name] || ''} onChange={(e) => setValues({ ...values, [f.name]: e.target.value })} />}</label>;
  })}</div>{pickerError && <div className="inline-error" role="alert">Could not load relationship options: {messageOf(pickerError.error)} Check access to profiles, buses, drivers, routes and stops.</div>}{err && <div className="inline-error" role="alert">{err}</div>}<div className="dialog-actions"><button type="button" className="button subtle" onClick={close}>Cancel</button><button className="button primary" disabled={busy || Boolean(pickerError)}>{busy ? 'Saving…' : record ? 'Save changes' : 'Save record'}</button></div></form></section></div>;
}
function Admin({ section }: { section: string }) {
  const [stopsMode, setStopsMode] = useState(false); const [record, setRecord] = useState<Record<string, any> | undefined>(); const [search, setSearch] = useState(''); const [filter, setFilter] = useState('');
  const table = section === 'routes' && stopsMode ? 'route_stops' : tables[section] || 'buses'; const qc = useQueryClient(); const q = useQuery({ queryKey: ['admin', table], queryFn: () => rows(table) });
  const [dialog, setDialog] = useState(false);
  const filtered = useMemo(() => (q.data || []).filter((r: any) => Object.values(r).join(' ').toLowerCase().includes(search.toLowerCase()) && (!filter || r.status === filter)), [q.data, search, filter]);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', table] });
  const setStatus = async (r: any) => {
    if (table === 'trips' && !['Scheduled', 'Running'].includes(r.status)) return;
    const action = table === 'trips' ? `Change trip status from ${r.status}?` : `Advance this emergency alert from ${r.status}?`;
    if (!window.confirm(action)) return;
    const next = table === 'trips' ? (r.status === 'Scheduled' ? 'Running' : r.status === 'Running' ? 'Completed' : 'Scheduled') : r.status === 'Active' ? 'Acknowledged' : 'Resolved';
    const now = new Date().toISOString();
    if (table === 'trips') {
      if (next === 'Running') {
        const { data: bus, error: lookupError } = await supabase.from('buses').select('id,status').eq('id', r.bus_id).maybeSingle();
        if (lookupError) { window.alert(`Could not check assigned bus: ${lookupError.message}`); return; }
        if (!bus || bus.status !== 'Available') { window.alert('This trip cannot start because its assigned bus is not Available.'); return; }
        const { data: changedBus, error: busError } = await supabase.from('buses').update({ status: 'On Trip' }).eq('id', r.bus_id).eq('status', 'Available').select('id').maybeSingle();
        if (busError || !changedBus) { window.alert(busError?.message || 'The assigned bus is no longer Available. Refresh and try again.'); return; }
        const { error } = await supabase.from('trips').update({ status: 'Running', started_at: now }).eq('id', r.id).eq('status', 'Scheduled');
        if (error) { await supabase.from('buses').update({ status: 'Available' }).eq('id', r.bus_id).eq('status', 'On Trip'); window.alert(error.message); return; }
      } else {
        const { error } = await supabase.from('trips').update({ status: 'Completed', completed_at: now }).eq('id', r.id).eq('status', 'Running');
        if (error) { window.alert(error.message); return; }
        const { error: busError } = await supabase.from('buses').update({ status: 'Available' }).eq('id', r.bus_id).eq('status', 'On Trip');
        if (busError) window.alert(`Trip completed, but the bus status could not be updated: ${busError.message}`);
      }
      refresh(); qc.invalidateQueries({ queryKey: ['overview-all'] }); return;
    }
    const { error } = await supabase.from(table).update({ status: next, ...(next === 'Resolved' ? { resolved_at: now } : {}) }).eq('id', r.id);
    if (error) window.alert(error.message); else refresh();
  };
  if (section === 'analytics' || section === 'insights') return <Insights section={section} />;
  if (q.isLoading) return <><Heading name={labels[section] || 'Operations'} subtitle="Loading campus records…" /><div className="skeleton-card large" /></>;
  if (q.error) return <><Heading name={labels[section] || 'Operations'} subtitle="Campus records and service status." /><StateError error={q.error} retry={() => q.refetch()} /></>;
  const create = editable.includes(table) && table !== 'profiles';
  return <><Heading name={labels[section] || 'Operations'} subtitle={section === 'live' ? 'Latest positions reported by running trips.' : `Manage ${labels[section]?.toLowerCase() || 'campus records'} directly in your campus workspace.`} action={<div className="heading-actions">{section === 'routes' && <button className="button subtle" onClick={() => { setStopsMode(!stopsMode); setSearch(''); }}>{stopsMode ? 'Manage routes' : 'Manage stops'}</button>}{create && <button className="button primary" onClick={() => { setRecord(undefined); setDialog(true); }}><Plus size={17} /> Add {tableLabels[table]?.replace(/s$/, '')}</button>}</div>} />
    {section === 'live' && <MapPanel />}
    {section === 'routes' && <RouteMap />}
    {section === 'emergency' && <div className="alert-banner"><Siren size={18} /><span><strong>Emergency response</strong> Contact the driver before marking an alert resolved.</span></div>}
    {section === 'attendance' && <div className="info-banner"><ShieldCheck size={17} /> Attendance is unique per student and active trip.</div>}
    <div className="panel records-panel"><div className="records-toolbar"><div className="record-count"><strong>{filtered.length}</strong> records <span>·</span> {tableLabels[table]}</div><div className="toolbar-controls"><label className="search-field"><Search size={16} /><input aria-label="Search records" placeholder="Search records…" value={search} onChange={(e) => setSearch(e.target.value)} /></label>{['buses', 'trips', 'emergency_alerts'].includes(table) && <select aria-label="Filter status" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All statuses</option>{(table === 'buses' ? ['Available', 'On Trip', 'Maintenance', 'Inactive'] : table === 'trips' ? ['Scheduled', 'Running', 'Completed', 'Cancelled'] : ['Active', 'Acknowledged', 'Resolved']).map((v) => <option key={v}>{v}</option>)}</select>}</div></div>
    {filtered.length ? <GridTable table={table} data={filtered} after={refresh} readOnly={['attendance', 'bus_locations', 'notifications'].includes(table)} edit={editable.includes(table) ? (r) => { setRecord(r); setDialog(true); } : undefined} update={['trips', 'emergency_alerts'].includes(table) ? setStatus : undefined} /> : q.data?.length ? <div className="empty-filter"><Search /><p>No records match this search.</p><button className="text-action" onClick={() => { setSearch(''); setFilter(''); }}>Clear search</button></div> : <Empty noun={tableLabels[table] || 'Records'} />}</div>{dialog && <AddDialog table={table} record={record} close={() => setDialog(false)} saved={refresh} />}</>;
}
function MapPanel() {
  const activeTrips = useQuery({ queryKey: ['live-active-trips'], queryFn: async () => { const { data, error } = await supabase.from('trips').select('id,bus_id,route_id,status').eq('status', 'Running'); if (error) throw error; return data || []; }, refetchInterval: 15000 });
  const stops = useQuery({ queryKey: ['admin-route-stops'], queryFn: () => rows('route_stops') });
  const active = activeTrips.data || [];
  const latestLocations = useQuery({ queryKey: ['live-locations', active.map((trip: any) => trip.id).join(',')], queryFn: async () => {
    const results = await Promise.all(active.map(async (trip: any) => {
      const { data, error } = await supabase.from('bus_locations').select('*').eq('trip_id', trip.id).order('recorded_at', { ascending: false }).limit(1);
      if (error) throw error;
      return data?.[0] ? { ...data[0], route_id: trip.route_id, bus_id: trip.bus_id } : null;
    }));
    return results.filter(Boolean) as any[];
  }, enabled: active.length > 0, refetchInterval: 15000 });
  const locations = latestLocations.data || [];
  const err = activeTrips.error || stops.error || latestLocations.error;
  if (err) return <StateError error={err} retry={() => { activeTrips.refetch(); stops.refetch(); latestLocations.refetch(); }} />;
  return <div className="live-layout"><section className="panel map-panel"><div className="map-topline"><span className="live-indicator"><i className="online-dot" /> LIVE POSITIONS · {locations.length}/{active.length}</span><span className="map-provider">OpenStreetMap · Leaflet</span></div><TransitMap stops={stops.data || []} locations={locations} /></section><aside className="panel location-panel"><span className="eyebrow">ACTIVE TRIPS</span><h2>{active.length ? `${active.length} buses in service` : 'No active trips'}</h2>{active.length ? active.map((trip: any) => { const point = locations.find((p: any) => p.trip_id === trip.id); return <div className="active-bus-row" key={trip.id}><strong>Bus {String(trip.bus_id || 'unassigned').slice(0, 8)}</strong><small>{point ? `${point.speed ?? '—'} km/h · ${new Date(point.recorded_at).toLocaleTimeString()}` : 'Waiting for first location report'}</small></div>; }) : <p>Each running trip appears here after its driver starts reporting positions.</p>}</aside></div>;
}
function RouteMap() {
  const q = useQuery({ queryKey: ['route-stops'], queryFn: () => rows('route_stops') });
  return q.data?.length ? <section className="panel routes-map-panel"><div className="panel-heading"><div><span className="eyebrow">ROUTE NETWORK</span><h2>Mapped campus stops</h2></div><span className="panel-note">{q.data.length} stops</span></div><TransitMap stops={q.data} /></section> : null;
}
function Insights({ section }: { section: string }) {
  const bus = useQuery({ queryKey: ['overview-buses'], queryFn: () => rows('buses') });
  const trips = useQuery({ queryKey: ['overview-trips'], queryFn: () => rows('trips') });
  const students = useQuery({ queryKey: ['overview-students'], queryFn: () => rows('students') });
  const attendance = useQuery({ queryKey: ['overview-attendance'], queryFn: () => rows('attendance') });
  const routes = useQuery({ queryKey: ['overview-routes'], queryFn: () => rows('routes') });
  const error = bus.error || trips.error || students.error || attendance.error || routes.error;
  if (error) return <><Heading name={labels[section]} subtitle="Indicators calculated from fetched transport records." /><StateError error={error} retry={() => [bus, trips, students, attendance, routes].forEach((q) => q.refetch())} /></>;
  if ([bus, trips, students, attendance, routes].some((q) => q.isLoading)) return <><Heading name={labels[section]} subtitle="Loading fetched records…" /><div className="skeleton-grid"><div className="skeleton-card" /><div className="skeleton-card" /></div></>;
  const b = bus.data || [], t = trips.data || [], s = students.data || [], a = attendance.data || [], r = routes.data || [];
  if (section === 'analytics') {
    const rate = t.length ? Math.round(t.filter((x: any) => x.status === 'Completed').length / t.length * 100) : 0;
    const chart = ['Scheduled', 'Running', 'Completed', 'Cancelled'].map((status) => ({ status, trips: t.filter((x: any) => x.status === status).length }));
    return <><Heading name="Operations analytics" subtitle="Service indicators calculated from your fetched fleet, trip and attendance records." /><section className="stat-grid"><Stat title="Fleet vehicles" value={b.length} note="Registered buses" icon={Bus} /><Stat title="Trips recorded" value={t.length} note={`${t.filter((x: any) => x.status === 'Running').length} running now`} icon={Navigation} /><Stat title="Completion rate" value={`${rate}%`} note="Completed / all recorded trips" icon={CheckCircle2} /><Stat title="Attendance" value={a.length} note={`${s.length} student roster records`} icon={Users} /></section><section className="panel chart-panel wide-chart"><div className="panel-heading"><div><span className="eyebrow">TRIP MIX</span><h2>Trips by status</h2></div></div><div className="chart-area tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" /><XAxis dataKey="status" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="trips" fill="#168f80" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section></>;
  }
  return <><Heading name="Route insights" subtitle="Recommendations based on current student assignments, route distance and trip records." /><div className="insight-intro panel"><Gauge /><div><strong>Rule-based review</strong><p>Rider density above 18 students per route kilometre signals a capacity review. Unassigned routes or routes without trips need a roster or scheduling check.</p></div></div><div className="insight-list">{r.length ? r.map((route: any) => { const riders = s.filter((x: any) => x.route_id === route.id).length; const runs = t.filter((x: any) => x.route_id === route.id).length; const warning = riders === 0 || runs === 0 || riders / Math.max(Number(route.distance_km) || 1, 1) > 18; return <article className="panel insight-card" key={route.id}><span className={`insight-mark ${warning ? 'gold' : 'teal'}`}><Compass /></span><div className="insight-copy"><span className="eyebrow">ROUTE REVIEW</span><h3>{route.name}</h3><p>{riders === 0 ? 'Check this route’s student assignments.' : runs === 0 ? 'No trips have been scheduled for this route.' : riders / Math.max(Number(route.distance_km) || 1, 1) > 18 ? 'Review boarding capacity at peak times.' : 'Rider density is within a steady range.'}</p><small>{riders} riders · {runs} trips · {route.distance_km ?? '—'} km</small></div></article>; }) : <Empty noun="Routes" />}</div></>;
}
function Stat({ title: name, value, note, icon: Icon }: { title: string; value: string | number; note: string; icon: ElementType }) { return <article className="stat-card"><span className="stat-icon teal"><Icon size={19} /></span><span className="stat-label">{name}</span><strong>{value}</strong><small>{note}</small></article>; }
function Overview() {
  const keys = ['buses', 'trips', 'students', 'attendance', 'emergency_alerts', 'maintenance'];
  const q = useQuery({ queryKey: ['overview-all'], queryFn: async () => Promise.all(keys.map(rows)) });
  if (q.isLoading) return <><Heading name="Operations overview" subtitle="A clear read on your campus morning." /><div className="skeleton-grid"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div></>;
  if (q.error) return <><Heading name="Operations overview" subtitle="A clear read on your campus morning." /><StateError error={q.error} retry={() => q.refetch()} /></>;
  const [b, t, s, a, alerts, maint] = q.data || [[], [], [], [], [], []]; const active = t.filter((x: any) => x.status === 'Running').length;
  const recent = [...t].slice(0, 6);
  return <><Heading name="Good morning." subtitle="Here’s the service picture across your campus today." action={<button className="button subtle" onClick={() => q.refetch()}><RefreshCw size={15} /> Refresh</button>} /><section className="stat-grid"><Stat title="Fleet vehicles" value={b.length} note={`${b.filter((x: any) => x.status === 'Available').length} available now`} icon={Bus} /><Stat title="Trips in motion" value={active} note={`${t.filter((x: any) => x.status === 'Scheduled').length} scheduled`} icon={Navigation} /><Stat title="Students enrolled" value={s.length} note={`${a.length} attendance records`} icon={Users} /><Stat title="Attention needed" value={alerts.filter((x: any) => x.status === 'Active').length + maint.filter((x: any) => ['Overdue', 'Due soon'].includes(maintenanceStatus(x))).length} note="Active alerts, due and overdue service" icon={AlertTriangle} /></section><div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">SERVICE SIGNAL</span><h2>Trips by status</h2></div><span className="panel-note">Fetched from campus records</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={['Scheduled', 'Running', 'Completed', 'Cancelled'].map((status) => ({ status, count: t.filter((x: any) => x.status === status).length }))}><CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" /><XAxis dataKey="status" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="count" fill="#168f80" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section><section className="panel dispatch-panel"><div className="panel-heading"><div><span className="eyebrow">DISPATCH</span><h2>Trips on the road</h2></div><Link href="/admin/live" className="small-link">Open live map <ArrowRight size={15} /></Link></div>{active ? t.filter((x: any) => x.status === 'Running').map((x: any) => <div className="dispatch-row" key={x.id}><span className="dispatch-mark"><Bus size={17} /></span><div><strong>Trip {String(x.id).slice(0, 8)}</strong><small>Bus {String(x.bus_id).slice(0, 8)}</small></div><Pill value="Running" /></div>) : <div className="quiet-empty"><Navigation />No trips are running right now.</div>}</section></div><section className="panel table-panel"><div className="panel-heading"><div><span className="eyebrow">SCHEDULE</span><h2>Recent trips</h2></div></div>{recent.length ? <GridTable table="trips" data={recent} after={() => q.refetch()} readOnly /> : <Empty noun="Trips" />}</section></>;
}

function useLive(table: string) {
  const qc = useQueryClient();
  useEffect(() => { const ch = supabase.channel(`live-${table}`).on('postgres_changes', { event: '*', schema: 'public', table }, () => { qc.invalidateQueries({ predicate: (query) => query.queryKey.some((part) => typeof part === 'string' && (table === 'bus_locations' ? /location/i.test(part) : table === 'notifications' ? /notification/i.test(part) : table === 'emergency_alerts' ? /emergency/i.test(part) : part === table)) }); }).subscribe(); return () => { supabase.removeChannel(ch); }; }, [table, qc]);
}
function NotificationsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['my-notifications', user?.id], queryFn: async () => { const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(8); if (error) throw error; return data || []; }, enabled: Boolean(user?.id) });
  const markRead = async (id: string) => { const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', user?.id); if (error) window.alert(error.message); else qc.invalidateQueries({ queryKey: ['my-notifications', user?.id] }); };
  return <section className="panel notifications-panel"><div className="panel-heading"><div><span className="eyebrow">CAMPUS UPDATES</span><h2>Your notifications</h2></div><span className="panel-note">{q.data?.filter((n: any) => !n.is_read).length || 0} unread</span></div>{q.isLoading ? <div className="skeleton-line" /> : q.error ? <div className="inline-error" role="alert">{messageOf(q.error)}</div> : q.data?.length ? <div className="notification-list">{q.data.map((n: any) => <article className={`notification-row ${n.is_read ? '' : 'unread'}`} key={n.id}><span className="notification-mark"><Activity size={17} /></span><div><strong>{n.title}</strong><p>{n.message}</p><small>{n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</small></div>{!n.is_read && <button className="text-action" onClick={() => markRead(n.id)}>Mark read</button>}</article>)}</div> : <Empty noun="Notifications" />}</section>;
}
function Driver() {
  const { user, profile } = useAuth(); const qc = useQueryClient();
  const driver = useQuery({ queryKey: ['driver', user?.id], queryFn: async () => { const { data, error } = await supabase.from('drivers').select('*').eq('profile_id', user?.id).maybeSingle(); if (error) throw error; return data; } });
  const trips = useQuery({ queryKey: ['driver-trips', driver.data?.id], queryFn: async () => { const { data, error } = await supabase.from('trips').select('*').eq('driver_id', driver.data?.id).order('started_at', { ascending: false }); if (error) throw error; return data || []; }, enabled: Boolean(driver.data?.id) });
  const active = trips.data?.find((x: any) => x.status === 'Running') || trips.data?.find((x: any) => x.status === 'Scheduled');
  const bus = useQuery({ queryKey: ['driver-bus', active?.bus_id], queryFn: async () => { const { data, error } = await supabase.from('buses').select('*').eq('id', active?.bus_id).maybeSingle(); if (error) throw error; return data; }, enabled: Boolean(active?.bus_id) });
  const route = useQuery({ queryKey: ['driver-route', active?.route_id], queryFn: async () => { const { data, error } = await supabase.from('routes').select('*').eq('id', active?.route_id).maybeSingle(); if (error) throw error; return data; }, enabled: Boolean(active?.route_id) });
  const stops = useQuery({ queryKey: ['driver-stops', active?.route_id], queryFn: async () => { const { data, error } = await supabase.from('route_stops').select('*').eq('route_id', active?.route_id).order('stop_order'); if (error) throw error; return data || []; }, enabled: Boolean(active?.route_id) });
  const locations = useQuery({ queryKey: ['driver-locations', active?.id], queryFn: async () => { const { data, error } = await supabase.from('bus_locations').select('*').eq('trip_id', active?.id).order('recorded_at', { ascending: false }).limit(1); if (error) throw error; return data?.[0] || null; }, enabled: Boolean(active?.id), refetchInterval: 12000 });
  const checkedIn = useQuery({ queryKey: ['driver-attendance', active?.id], queryFn: async () => { const { data, error } = await supabase.from('attendance').select('*').eq('trip_id', active?.id).order('attendance_time', { ascending: false }); if (error) throw error; return data || []; }, enabled: Boolean(active?.id) });
  const [busy, setBusy] = useState(false); const [note, setNote] = useState(''); const [issue, setIssue] = useState('');
  const refresh = () => { trips.refetch(); bus.refetch(); locations.refetch(); };
  const lifecycle = async () => { if (!active || !['Scheduled', 'Running'].includes(active.status)) return; setBusy(true); const next = active.status === 'Scheduled' ? 'Running' : 'Completed'; const now = new Date().toISOString(); const { error } = await supabase.from('trips').update({ status: next, ...(next === 'Running' ? { started_at: now } : { completed_at: now }) }).eq('id', active.id).eq('driver_id', driver.data?.id).eq('status', active.status); setNote(error ? error.message : `Trip ${next.toLowerCase()}.`); setBusy(false); if (!error) { await refresh(); qc.invalidateQueries({ queryKey: ['driver-trips'] }); } };
  const simulate = async () => { if (!active || active.status !== 'Running') { setNote('Start an assigned trip before using Demo GPS Simulation.'); return; } const { data: list, error: err } = await supabase.from('route_stops').select('*').eq('route_id', active.route_id).order('stop_order'); if (err || !list?.length) { setNote(err?.message || 'This route has no mapped stops to simulate.'); return; } const usable = list.filter((s: any) => Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude))); if (!usable.length) { setNote('This route has no valid stop coordinates for GPS simulation.'); return; } const last = locations.data; const lastIndex = last ? usable.findIndex((s: any) => Number(s.latitude) === Number(last.latitude) && Number(s.longitude) === Number(last.longitude)) : -1; const point = usable[(lastIndex + 1) % usable.length]; const { error } = await supabase.from('bus_locations').insert({ trip_id: active.id, latitude: point.latitude, longitude: point.longitude, speed: 24.6, recorded_at: new Date().toISOString() }); setNote(error ? error.message : `Demo GPS Simulation · recorded at ${point.stop_name}.`); if (!error) locations.refetch(); };
  const simulateRef = useRef(simulate); simulateRef.current = simulate;
  useEffect(() => {
    if (!active || active.status !== 'Running') return;
    const timer = window.setInterval(() => { void simulateRef.current(); }, 15000);
    return () => window.clearInterval(timer);
  }, [active?.id, active?.status]);
  const sos = async () => { if (!active || !window.confirm('Send an SOS to campus operations with this trip and its last reported location?')) return; const l = locations.data; const { error } = await supabase.from('emergency_alerts').insert({ trip_id: active.id, bus_id: active.bus_id, driver_id: driver.data?.id, latitude: l?.latitude ?? null, longitude: l?.longitude ?? null, message: 'Driver requested emergency assistance.', status: 'Active', created_at: new Date().toISOString() }); setNote(error ? error.message : 'SOS sent to campus operations.'); };
  const report = async (e: FormEvent) => { e.preventDefault(); const { error } = await supabase.from('notifications').insert({ user_id: user?.id, title: 'Driver issue report', message: issue.trim(), type: 'issue_report', is_read: false, created_at: new Date().toISOString() }); setNote(error ? error.message : 'Issue report submitted.'); if (!error) setIssue(''); };
  if (driver.isLoading || trips.isLoading) return <><Heading name="Driver console" subtitle="Loading your assignment…" /><div className="skeleton-card large" /></>;
  if (driver.error || trips.error) return <StateError error={driver.error || trips.error} retry={() => { driver.refetch(); trips.refetch(); }} />;
  return <><Heading name={`Good morning${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.`} subtitle="Assigned service, trip actions and campus safety tools." action={<span className="service-chip"><i className="online-dot" /> DRIVER CONSOLE</span>} />{note && <div className="inline-success" role="status">{note}</div>}<div className="driver-top-grid"><section className="panel assigned-card"><div className="panel-heading"><div><span className="eyebrow">YOUR ASSIGNMENT</span><h2>{bus.data?.bus_number || 'No assigned bus'}</h2></div><Pill value={active?.status || 'No active trip'} /></div><div className="assignment-detail"><div><small>Route</small><strong>{route.data?.name || 'Not assigned'}</strong><span>{route.data ? `${route.data.start_point} → ${route.data.end_point}` : 'Route details unavailable'}</span></div><div><small>Vehicle</small><strong>{bus.data?.registration_number || '—'}</strong><span>Capacity {bus.data?.capacity ?? '—'}</span></div></div><div className="driver-actions">{active && <button className="button primary" onClick={lifecycle} disabled={busy}>{active.status === 'Running' ? <Check /> : <Navigation />}{busy ? 'Updating…' : active.status === 'Scheduled' ? 'Start trip' : 'Complete trip'}</button>}<button className="button danger" disabled={!active || active.status !== 'Running'} onClick={sos}><Siren /> Send SOS</button></div>{active?.status === 'Running' && <Scanner trip={active} after={() => qc.invalidateQueries({ queryKey: ['driver-attendance'] })} />}</section><section className="panel gps-card"><div className="panel-heading"><div><span className="eyebrow">POSITION REPORT</span><h2>Location sharing</h2></div><Navigation /></div><div className="gps-label"><i className="pulse-dot" /> Demo GPS Simulation</div><p>Positions follow stops on your assigned route and are persisted for campus operations.</p><button className="button subtle" disabled={!active || active.status !== 'Running'} onClick={simulate}><MapPin /> Record next stop</button>{locations.data && <small className="last-location">Last report · {new Date(locations.data.recorded_at).toLocaleString()}</small>}</section></div><div className="driver-bottom-grid"><section className="panel history-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR SERVICE</span><h2>Trip history</h2></div></div>{trips.data?.length ? <GridTable table="trips" data={trips.data} after={refresh} readOnly /> : <Empty noun="Assigned trips" />}</section><section className="panel issue-panel"><span className="eyebrow">SAFETY & SUPPORT</span><h2>Report an issue</h2><p>Send an operational note to campus transport.</p><form onSubmit={report}><textarea value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Describe the issue…" required /><button className="button subtle" disabled={!issue.trim()}><AlertCircle /> Submit report</button></form></section></div>{active && <section className="panel attendance-panel"><div className="panel-heading"><div><span className="eyebrow">BOARDING CHECK-INS</span><h2>Attendance on this trip</h2></div><span className="panel-note">{checkedIn.data?.length || 0} recorded</span></div>{checkedIn.data?.length ? <GridTable table="attendance" data={checkedIn.data} after={() => checkedIn.refetch()} readOnly /> : <Empty noun="Attendance records" />}</section>}<NotificationsPanel /><section className="panel routes-map-panel"><div className="panel-heading"><div><span className="eyebrow">ROUTE STOPS</span><h2>{route.data?.name || 'Assigned route map'}</h2></div></div><TransitMap stops={stops.data || []} location={locations.data} /></section></>;
}

function Student() {
  const { user, profile } = useAuth();
  const student = useQuery({ queryKey: ['student-profile', user?.id], queryFn: async () => { const { data, error } = await supabase.from('students').select('*').eq('profile_id', user?.id).maybeSingle(); if (error) throw error; return data; } });
  const route = useQuery({ queryKey: ['student-route', student.data?.route_id], queryFn: async () => { const { data, error } = await supabase.from('routes').select('*').eq('id', student.data?.route_id).maybeSingle(); if (error) throw error; return data; }, enabled: Boolean(student.data?.route_id) });
  const stops = useQuery({ queryKey: ['student-stops', student.data?.route_id], queryFn: async () => { const { data, error } = await supabase.from('route_stops').select('*').eq('route_id', student.data?.route_id).order('stop_order'); if (error) throw error; return data || []; }, enabled: Boolean(student.data?.route_id) });
  const trips = useQuery({ queryKey: ['student-trips', student.data?.route_id], queryFn: async () => { const { data, error } = await supabase.from('trips').select('*').eq('route_id', student.data?.route_id).eq('status', 'Running').order('started_at', { ascending: false }); if (error) throw error; return data || []; }, enabled: Boolean(student.data?.route_id), refetchInterval: 20000 });
  const trip = trips.data?.[0];
  const bus = useQuery({ queryKey: ['student-bus', trip?.bus_id], queryFn: async () => { const { data, error } = await supabase.from('buses').select('*').eq('id', trip?.bus_id).maybeSingle(); if (error) throw error; return data; }, enabled: Boolean(trip?.bus_id) });
  const location = useQuery({ queryKey: ['student-location', trip?.id], queryFn: async () => { const { data, error } = await supabase.from('bus_locations').select('*').eq('trip_id', trip?.id).order('recorded_at', { ascending: false }).limit(1); if (error) throw error; return data?.[0] || null; }, enabled: Boolean(trip?.id), refetchInterval: 10000 });
  const attendance = useQuery({ queryKey: ['student-attendance', student.data?.id], queryFn: async () => { const { data, error } = await supabase.from('attendance').select('*').eq('student_id', student.data?.id).order('attendance_time', { ascending: false }).limit(10); if (error) throw error; return data || []; }, enabled: Boolean(student.data?.id) });
  const [issue, setIssue] = useState(''); const [feedback, setFeedback] = useState('');
  const error = student.error || route.error || stops.error || trips.error || location.error || attendance.error || bus.error;
  const report = async (e: FormEvent) => { e.preventDefault(); const { error: issueError } = await supabase.from('notifications').insert({ user_id: user?.id, title: 'Student issue report', message: issue.trim(), type: 'issue_report', is_read: false, created_at: new Date().toISOString() }); setFeedback(issueError ? issueError.message : 'Your report has been sent.'); if (!issueError) setIssue(''); };
  if (student.isLoading) return <><Heading name="My commute" subtitle="Loading your campus assignment…" /><div className="skeleton-card large" /></>;
  if (error) return <StateError error={error} retry={() => { student.refetch(); route.refetch(); trips.refetch(); attendance.refetch(); stops.refetch(); }} />;
  if (!student.data) return <><Heading name={`Welcome${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.`} subtitle="Your student access is ready." /><div className="state-card"><span className="state-icon"><Users /></span><div><strong>No transport assignment found</strong><p>Your account is not connected to a student roster record yet. Contact transport administration to link your route.</p></div></div></>;
  const pass = JSON.stringify({ student_id: student.data.id, pass: 'campus-transit-student-v1' });
  return <><Heading name={`Good morning${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}.`} subtitle="Your route, live service and boarding pass in one place." action={<span className="service-chip"><i className="online-dot" /> {trip ? 'Bus on route' : 'No active trip'}</span>} />
    <div className="student-hero-grid"><section className="panel route-card"><span className="eyebrow">YOUR ROUTE</span><h2>{route.data?.name || 'Assigned route'}</h2><div className="route-journey"><span>{route.data?.start_point || 'Start point'}</span><div className="journey-line"><i /><i /><i /></div><span>{route.data?.end_point || 'Campus'}</span></div><div className="route-meta"><span><Clock3 /> {route.data?.estimated_minutes ? `${route.data.estimated_minutes} min estimate` : 'ETA unavailable'}</span><span><MapPin /> {route.data?.distance_km ?? '—'} km</span></div><div className="student-bus-line"><Bus size={16} /><span>Assigned service</span><strong>{bus.data?.bus_number || 'Bus details unavailable'}</strong></div><div className="stop-list">{(stops.data || []).map((s: any, i: number) => <div className={`stop-row ${s.id === student.data.stop_id ? 'your-stop' : ''}`} key={s.id}><span className="stop-index">{i + 1}</span><strong>{s.stop_name}</strong>{s.id === student.data.stop_id && <span className="you-tag">YOUR STOP</span>}</div>)}</div></section><section className="panel qr-panel"><div className="panel-heading"><div><span className="eyebrow">BOARDING PASS</span><h2>Your student pass</h2></div><QrCode /></div><div className="qr-code-box"><QRCodeSVG value={pass} size={162} bgColor="transparent" fgColor="#163347" level="M" /></div><strong>{student.data.roll_number || 'Student pass'}</strong><p>Show this pass to your driver when boarding.</p><small>Pass contains a student identifier only.</small></section></div>
    <div className="student-bottom-grid"><section className="panel student-map-panel"><div className="panel-heading"><div><span className="eyebrow">ROUTE TRACKING</span><h2>{trip ? 'Live bus position' : 'Campus route map'}</h2></div></div><TransitMap stops={stops.data || []} location={location.data} />{trip && <div className="eta-strip"><i className="online-dot" /> Position updates automatically · route estimate {route.data?.estimated_minutes ?? '—'} min</div>}</section><section className="panel attendance-panel"><div className="panel-heading"><div><span className="eyebrow">RECENT CHECK-INS</span><h2>My attendance</h2></div></div>{attendance.data?.length ? <GridTable table="attendance" data={attendance.data} after={() => attendance.refetch()} readOnly /> : <Empty noun="Attendance records" />}</section></div>
    <NotificationsPanel /><section className="panel issue-panel student-report"><div><span className="eyebrow">NEED HELP?</span><h2>Report a commute issue</h2><p>For urgent safety concerns, contact campus emergency services directly.</p></div><form onSubmit={report}><textarea aria-label="Commute issue details" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Share a brief description…" required /><button className="button subtle" disabled={!issue.trim()}><AlertCircle /> Send report</button>{feedback && <span className="muted" role="status">{feedback}</span>}</form></section>
  </>;
}
function Scanner({ trip, after }: { trip: any; after: () => void }) {
  const [open, setOpen] = useState(false); const [message, setMessage] = useState('');
  const busyRef = useRef(false); const afterRef = useRef(after); afterRef.current = after;
  useEffect(() => {
    if (!open) return;
    const scanner = new Html5Qrcode('campus-qr-reader');
    scanner.start({ facingMode: 'environment' }, { fps: 8, qrbox: { width: 225, height: 225 } }, async (text) => {
      if (busyRef.current) return; busyRef.current = true;
      try {
        const pass = JSON.parse(text) as { student_id?: string; pass?: string };
        if (!pass.student_id || pass.pass !== 'campus-transit-student-v1') throw new Error('This is not a valid CampusTransit student pass.');
        const { data: currentTrip, error: tripError } = await supabase.from('trips').select('id,bus_id,route_id,status').eq('id', trip.id).maybeSingle();
        if (tripError) throw tripError;
        if (!currentTrip || currentTrip.status !== 'Running') throw new Error('This trip is no longer active. Attendance cannot be recorded.');
        const { data: student, error: studentError } = await supabase.from('students').select('*').eq('id', pass.student_id).maybeSingle();
        if (studentError) throw studentError; if (!student) throw new Error('No student record matches this pass.');
        if (student.route_id !== currentTrip.route_id) throw new Error('This student is assigned to a different route.');
        const { data: duplicate, error: duplicateError } = await supabase.from('attendance').select('id').eq('student_id', student.id).eq('trip_id', trip.id).maybeSingle();
        if (duplicateError) throw duplicateError; if (duplicate) throw new Error('Attendance is already recorded for this student on this trip.');
        const { error: insertError } = await supabase.from('attendance').insert({ student_id: student.id, trip_id: currentTrip.id, bus_id: currentTrip.bus_id, attendance_time: new Date().toISOString(), status: 'Present' });
        if (insertError) throw insertError;
        setMessage(`Attendance recorded for ${student.roll_number || 'student'}.`); afterRef.current();
      } catch (e) { setMessage(messageOf(e)); }
      busyRef.current = false;
    }, () => undefined).catch((e) => setMessage(`Camera unavailable or permission denied: ${messageOf(e)}`));
    return () => { scanner.stop().catch(() => undefined); };
  }, [open, trip.id, trip.route_id, trip.bus_id]);
  return <div className="scanner-area"><button className="button subtle" onClick={() => { setMessage(''); setOpen(!open); }}><QrCode />{open ? 'Close camera scanner' : 'Scan student pass'}</button>{open && <div id="campus-qr-reader" className="qr-reader" />}<p role="status" className="scanner-feedback">{message}</p></div>;
}

export function Workspace({ role }: { role: 'admin' | 'driver' | 'student' }) {
  const { profile } = useAuth(); const [location, setLocation] = useLocation(); const [menu, setMenu] = useState(false);
  const section = location.split('/')[2] || 'overview'; const activeTitle = labels[section] || (role === 'driver' ? 'Driver console' : 'Student commute');
  const links = role === 'admin' ? nav : role === 'driver' ? [['My operations', '/driver', Bus]] as const : [['My commute', '/student', Bus]] as const;
  const logout = async () => { await supabase.auth.signOut(); setLocation('/login'); };
  useLive('notifications'); useLive('emergency_alerts'); useLive('bus_locations');
  return <div className="app-frame"><aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}><Link href={role === 'admin' ? '/admin' : `/${role}`} className="brand-lockup"><span className="brand-mark"><Bus size={21} /></span><span>Campus<span>Transit</span></span></Link><div className="workspace-label">CAMPUS OPERATIONS</div><nav className="side-nav" aria-label="Main navigation">{links.map(([n, href, Icon]) => <Link key={href} href={href} onClick={() => setMenu(false)} className={`nav-link ${(href === location || (href !== '/admin' && location.startsWith(href))) ? 'nav-active' : ''}`}><Icon size={18} /><span>{n}</span></Link>)}</nav><div className="sidebar-bottom"><div className="online-label"><span className="online-dot" /> Service connected</div><button className="user-chip" onClick={logout}><span className="avatar">{(profile?.full_name || profile?.email || 'U').slice(0, 1).toUpperCase()}</span><span className="user-copy"><strong>{profile?.full_name || 'Campus user'}</strong><small>{role} · Sign out</small></span><LogOut size={16} /></button></div></aside><div className="main-column"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenu(!menu)}><Menu /></button><div className="breadcrumb">Operations <span>/</span> <b>{activeTitle}</b></div><div className="topbar-right"><span className="morning-status"><i className="online-dot" /> Morning service active</span><span className="avatar small">{(profile?.full_name || 'U').slice(0, 1).toUpperCase()}</span></div></header><main className="page-content">{role === 'admin' ? section === 'overview' ? <Overview /> : <Admin section={section} /> : role === 'driver' ? <Driver /> : <Student />}</main></div>{menu && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMenu(false)} />}</div>;
}
