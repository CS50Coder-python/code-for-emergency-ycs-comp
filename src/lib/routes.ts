import { destinationPoint, distanceKm } from "./geo";
import { reverse } from "./nominatim";
import type { Hotspot } from "./firms";

// Escape routes. We ask OSRM (free, public, no key) for a driving route to a
// point about REACH_KM out in each compass direction, then measure how close
// each road comes to any satellite detection. A route that stays SAFE_KM from
// every detection is safe. The fastest route overall is what most people
// would drive on instinct; if it is not safe we show it in red.
const REACH_KM = 20;
const SAFE_KM = 5;
const BEARINGS = [0, 45, 90, 135, 180, 225, 270, 315];

export type EscapeRoute = {
  bearing: number;
  to: { lat: number; lon: number; name: string | null };
  durationMin: number;
  distanceKm: number;
  minFireKm: number; // closest the road comes to a detection
  safe: boolean;
  geometry: [number, number][]; // [lat, lon]
};

export type RoutePlan = {
  best: EscapeRoute | null; // the one to take
  risky: EscapeRoute | null; // the fastest route, only when it is unsafe
  checked: number;
};

export async function planEscape(lat: number, lon: number, hotspots: Hotspot[]): Promise<RoutePlan> {
  const results = await Promise.all(BEARINGS.map((b) => routeTo(lat, lon, b, hotspots).catch(() => null)));
  const routes = results.filter((r): r is EscapeRoute => r !== null);
  if (!routes.length) return { best: null, risky: null, checked: 0 };

  const fastest = [...routes].sort((a, b) => a.durationMin - b.durationMin)[0];
  const safeOnes = routes.filter((r) => r.safe).sort((a, b) => a.durationMin - b.durationMin);
  const best =
    safeOnes[0] ??
    [...routes].sort((a, b) => b.minFireKm - a.minFireKm || a.durationMin - b.durationMin)[0];
  const risky = !fastest.safe && fastest !== best ? fastest : null;

  // Name the destinations people will actually read.
  best.to.name = (await reverse(best.to.lat, best.to.lon).catch(() => null))?.short ?? null;
  if (risky) risky.to.name = (await reverse(risky.to.lat, risky.to.lon).catch(() => null))?.short ?? null;

  return { best, risky, checked: routes.length };
}

async function routeTo(lat: number, lon: number, bearing: number, hotspots: Hotspot[]): Promise<EscapeRoute | null> {
  const dest = destinationPoint(lat, lon, bearing, REACH_KM);
  const url =
    `https://router.project-osrm.org/route/v1/driving/${lon},${lat};${dest.lon},${dest.lat}` +
    `?overview=simplified&geometries=geojson`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!res.ok) return null;
  const j = await res.json();
  if (j.code !== "Ok" || !j.routes?.length) return null;
  const r = j.routes[0];
  const geometry: [number, number][] = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
  const end = geometry[geometry.length - 1];

  // A route that snapped to a road far from where we aimed, or that barely
  // moves, is not a real way out.
  const travelled = distanceKm(lat, lon, end[0], end[1]);
  if (travelled < REACH_KM * 0.4) return null;

  // Clearance is measured past the first 2 km. The road outside the door is
  // the same for every direction; what matters is where each route goes next.
  let minFireKm = Infinity;
  for (const [plat, plon] of geometry) {
    if (distanceKm(lat, lon, plat, plon) < 2) continue;
    for (const h of hotspots) {
      const d = distanceKm(plat, plon, h.lat, h.lon);
      if (d < minFireKm) minFireKm = d;
    }
  }
  if (minFireKm === Infinity) minFireKm = 999;

  return {
    bearing,
    to: { lat: end[0], lon: end[1], name: null },
    durationMin: r.duration / 60,
    distanceKm: r.distance / 1000,
    minFireKm,
    safe: minFireKm >= SAFE_KM,
    geometry,
  };
}
