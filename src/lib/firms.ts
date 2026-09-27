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
