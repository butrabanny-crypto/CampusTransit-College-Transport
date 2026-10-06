import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type Point = { latitude: number | null; longitude: number | null; stop_name?: string; stop_order?: number; route_id?: string | null; trip_id?: string | null };
export function TransitMap({ stops = [], location, locations = [] }: { stops?: Point[]; location?: Point | null; locations?: Point[] }) {
  const validStops = stops.filter((p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));
  const current: [number, number] | null = location && Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude))
    ? [Number(location.latitude), Number(location.longitude)] : null;
  const live = [...locations, ...(location ? [location] : [])].filter((p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));
  const center = current || (live[0] ? [Number(live[0].latitude), Number(live[0].longitude)] as [number, number] : null) || (validStops[0] ? [Number(validStops[0].latitude), Number(validStops[0].longitude)] as [number, number] : [14.195, 79.16]);
  const groups = new Map<string, Point[]>();
  validStops.forEach((stop, index) => {
    const key = stop.route_id || `route-${index}`;
    groups.set(key, [...(groups.get(key) || []), stop]);
  });
  return <div className="transit-map" aria-label="Route map"><MapContainer center={center} zoom={13} scrollWheelZoom={false} className="map-canvas">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    {[...groups.entries()].map(([routeId, routeStops], groupIndex) => routeStops.length > 1 && <Polyline key={routeId} positions={routeStops.sort((a, b) => Number(a.stop_order || 0) - Number(b.stop_order || 0)).map((p) => [Number(p.latitude), Number(p.longitude)] as [number, number])} pathOptions={{ color: ['#158f81', '#287bb2', '#b28d4b', '#956da5'][groupIndex % 4], weight: 5, opacity: .8 }} />)}
    {validStops.map((p, i) => <CircleMarker key={`${p.stop_name}-${i}`} center={[Number(p.latitude), Number(p.longitude)]} radius={7} pathOptions={{ color: '#fff', fillColor: '#167f75', fillOpacity: 1, weight: 3 }}><Tooltip>{p.stop_name || `Stop ${i + 1}`}</Tooltip></CircleMarker>)}
    {live.map((p, i) => <CircleMarker key={`${p.trip_id || 'bus'}-${i}`} center={[Number(p.latitude), Number(p.longitude)]} radius={10} pathOptions={{ color: '#fff', fillColor: '#2388c6', fillOpacity: 1, weight: 3 }}><Tooltip>Live bus location {p.trip_id ? `· trip ${p.trip_id.slice(0, 8)}` : ''}</Tooltip></CircleMarker>)}
  </MapContainer></div>;
}
