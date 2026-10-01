import { distanceKm, bearingDeg } from "./geo";
import type { Hotspot } from "./firms";

// A "fire" is a group of satellite detections that sit within LINK_KM of each
// other. Single-linkage clustering: two detections belong to the same fire if
// a chain of neighbours connects them. VIIRS pixels are 375 m, so 2.5 km joins
// the pixels of one burning area without merging separate fires.
const LINK_KM = 2.5;

export type Fire = {
  id: number;
  center: { lat: number; lon: number };
  count: number;
  frpTotal: number; // megawatts, all detections
  spanKm: number; // longest distance between two detections
  axisDeg: number | null; // orientation the detections are stretched along, 0 to 180
  lastSeen: string; // latest satellite pass, UTC
  ageHours: number; // hours since that pass
  nearest: Hotspot; // detection closest to the query point
  nearestKm: number;
  bearing: number; // from the query point to the nearest detection
};

export function clusterHotspots(hotspots: Hotspot[], from: { lat: number; lon: number }): Fire[] {
  const n = hotspots.length;
  if (!n) return [];

  // Union-find over pairs closer than LINK_KM.
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const degLat = LINK_KM / 111; // quick bounding-box reject before the real distance
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(hotspots[i].lat - hotspots[j].lat) > degLat) continue;
      if (distanceKm(hotspots[i].lat, hotspots[i].lon, hotspots[j].lat, hotspots[j].lon) <= LINK_KM) {
        parent[find(i)] = find(j);
      }
    }
  }

  const groups = new Map<number, Hotspot[]>();
  hotspots.forEach((h, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(h);
  });

  const fires: Fire[] = [];
  let id = 1;
  for (const members of groups.values()) {
    const lat = members.reduce((s, h) => s + h.lat, 0) / members.length;
    const lon = members.reduce((s, h) => s + h.lon, 0) / members.length;
    let span = 0;
    for (let i = 0; i < members.length; i++)
      for (let j = i + 1; j < members.length; j++)
        span = Math.max(span, distanceKm(members[i].lat, members[i].lon, members[j].lat, members[j].lon));

    const nearest = members.reduce((a, b) => {
      const da = distanceKm(from.lat, from.lon, a.lat, a.lon);
      const db = distanceKm(from.lat, from.lon, b.lat, b.lon);
      return db < da ? b : a;
    });
    const latest = members.map((h) => h.acquired).sort().at(-1)!;

    fires.push({
      id: id++,
      center: { lat, lon },
      count: members.length,
      frpTotal: members.reduce((s, h) => s + h.frp, 0),
      spanKm: span,
      axisDeg: members.length >= 3 ? principalAxis(members, lat, lon) : null,
      lastSeen: latest,
      ageHours: (Date.now() - parseAcquired(latest)) / 3.6e6,
      nearest,
      nearestKm: distanceKm(from.lat, from.lon, nearest.lat, nearest.lon),
      bearing: bearingDeg(from.lat, from.lon, nearest.lat, nearest.lon),
    });
  }
  return fires.sort((a, b) => a.nearestKm - b.nearestKm);
}

// Direction the cloud of detections is stretched along, from the covariance
// of positions in km. A long thin cluster usually runs with the wind.
function principalAxis(members: Hotspot[], lat0: number, lon0: number) {
  const kx = 111 * Math.cos((lat0 * Math.PI) / 180);
  let sxx = 0, syy = 0, sxy = 0;
  for (const h of members) {
    const x = (h.lon - lon0) * kx;
    const y = (h.lat - lat0) * 111;
    sxx += x * x; syy += y * y; sxy += x * y;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy); // angle from east, maths convention
  const compassDeg = (90 - (theta * 180) / Math.PI + 360) % 360;
  return compassDeg % 180;
}

export function parseAcquired(s: string) {
  // "2026-09-27 10:19 UTC"
  return Date.parse(s.replace(" UTC", "Z").replace(" ", "T"));
}
