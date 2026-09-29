import { distanceKm, bearingDeg } from "./geo";

// NASA FIRMS publishes the last 24 hours of VIIRS satellite heat detections
// as public CSV files, no key needed. https://firms.modaps.eosdis.nasa.gov/active_fire/
const BASE = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/";

export type Hotspot = {
  lat: number;
  lon: number;
  frp: number; // fire radiative power, megawatts
  confidence: string; // low, nominal, high
  acquired: string; // UTC, "2026-09-26 08:54"
  daynight: string;
  distanceKm: number; // from the queried point
  bearing: number; // from the queried point
};

export type FireCluster = { id: string; name: string; lat: number; lon: number; count: number; distanceKm: number; bearing: number; heading: number | null; spreadHours: { low: number; high: number } | null; hotspots: Hotspot[] };

// Single-link distance clustering; 5 km joins nearby satellite detections.
export function clusterFires(hotspots: Hotspot[], weather: { windKmh: number; windFromDeg: number; humidity: number } | null, origin: { lat: number; lon: number }): FireCluster[] {
  const unseen = new Set(hotspots.map((_, i) => i));
  const groups: Hotspot[][] = [];
  while (unseen.size) {
    const first = unseen.values().next().value as number;
    unseen.delete(first); const group = [hotspots[first]]; const queue = [hotspots[first]];
    while (queue.length) {
      const point = queue.pop()!;
      for (const i of [...unseen]) if (distanceKm(point.lat, point.lon, hotspots[i].lat, hotspots[i].lon) <= 5) {
        unseen.delete(i); group.push(hotspots[i]); queue.push(hotspots[i]);
      }
    }
    groups.push(group);
  }
  return groups.map((points, i) => {
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lon = points.reduce((s, p) => s + p.lon, 0) / points.length;
    // Principal axis of hotspot spread, oriented downwind. Sparse clusters have no reliable axis.
    let heading: number | null = null;
    if (points.length >= 3) {
      const xx = points.reduce((s,p)=>s+(p.lon-lon)**2,0), yy = points.reduce((s,p)=>s+(p.lat-lat)**2,0), xy = points.reduce((s,p)=>s+(p.lon-lon)*(p.lat-lat),0);
      const axis = (Math.atan2(2*xy, xx-yy) * 90 / Math.PI + 360) % 180;
      const windTo = weather ? (weather.windFromDeg + 180) % 360 : axis;
      heading = weather ? (axis * 0.35 + windTo * 0.65) % 360 : axis;
    } else if (weather) heading = (weather.windFromDeg + 180) % 360;
    const dist = distanceKm(origin.lat, origin.lon, lat, lon), bearing = bearingDeg(origin.lat, origin.lon, lat, lon);
    // Heuristic perimeter spread: 0.15 km/h baseline, increased by wind and dryness.
    const rate = weather ? Math.max(0.08, 0.15 + weather.windKmh * 0.012 + (40-weather.humidity) * 0.004) : 0.2;
    const hours = Math.max(0, dist - 1) / rate;
    return { id: `fire-${i+1}`, name: `Fire ${String.fromCharCode(65 + (i % 26))}`, lat, lon, count: points.length, distanceKm: dist, bearing, heading, spreadHours: Number.isFinite(hours) ? { low: Math.max(0, hours * 0.5), high: hours * 2 } : null, hotspots: points };
  }).sort((a,b)=>a.distanceKm-b.distanceKm);
}

type Region = { file: string; box: [number, number, number, number] }; // south, north, west, east

const REGIONS: Region[] = [
  { file: "SUOMI_VIIRS_C2_USA_contiguous_and_Hawaii_24h.csv", box: [18, 50, -161, -66] },
  { file: "SUOMI_VIIRS_C2_Alaska_24h.csv", box: [50, 72, -170, -129] },
  { file: "SUOMI_VIIRS_C2_Canada_24h.csv", box: [41, 84, -142, -52] },
  { file: "SUOMI_VIIRS_C2_Central_America_24h.csv", box: [6, 33, -119, -58] },
  { file: "SUOMI_VIIRS_C2_South_America_24h.csv", box: [-57, 14, -93, -32] },
  { file: "SUOMI_VIIRS_C2_Europe_24h.csv", box: [34, 72, -26, 46] },
  { file: "SUOMI_VIIRS_C2_Australia_NewZealand_24h.csv", box: [-50, -9, 110, 180] },
];
const GLOBAL = "SUOMI_VIIRS_C2_Global_24h.csv";

function fileFor(lat: number, lon: number) {
  const hit = REGIONS.find(
    (r) => lat >= r.box[0] && lat <= r.box[1] && lon >= r.box[2] && lon <= r.box[3]
  );
  return hit ? hit.file : GLOBAL;
}

// Cache each regional file in memory for 15 minutes so repeated checks are instant.
const cache = new Map<string, { at: number; rows: RawRow[] }>();
const TTL_MS = 15 * 60 * 1000;

type RawRow = { lat: number; lon: number; frp: number; confidence: string; acquired: string; daynight: string };

async function loadRows(file: string): Promise<RawRow[]> {
  const hit = cache.get(file);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rows;

  const res = await fetch(BASE + file, { cache: "no-store" });
  if (!res.ok) throw new Error(`FIRMS ${file} returned ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  const col = (name: string) => header.indexOf(name);
  const iLat = col("latitude"), iLon = col("longitude"), iFrp = col("frp"),
    iConf = col("confidence"), iDate = col("acq_date"), iTime = col("acq_time"), iDn = col("daynight");

  const rows: RawRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",");
    if (c.length < header.length) continue;
    const t = c[iTime].padStart(4, "0");
    rows.push({
      lat: Number(c[iLat]),
      lon: Number(c[iLon]),
      frp: Number(c[iFrp]),
      confidence: c[iConf],
      acquired: `${c[iDate]} ${t.slice(0, 2)}:${t.slice(2)} UTC`,
      daynight: c[iDn] === "D" ? "day" : "night",
    });
  }
  cache.set(file, { at: Date.now(), rows });
  return rows;
}

export async function hotspotsNear(lat: number, lon: number, radiusKm: number): Promise<Hotspot[]> {
  const rows = await loadRows(fileFor(lat, lon));
  const out: Hotspot[] = [];
  for (const r of rows) {
    const d = distanceKm(lat, lon, r.lat, r.lon);
    if (d <= radiusKm) out.push({ ...r, distanceKm: d, bearing: bearingDeg(lat, lon, r.lat, r.lon) });
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}
