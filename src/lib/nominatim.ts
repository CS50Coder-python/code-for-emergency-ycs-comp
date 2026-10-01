// OpenStreetMap's geocoder asks for one request per second and a contact
// address. Every call in the app goes through this queue and a 30 minute cache.
const UA = process.env.NWS_USER_AGENT ?? "Hearth/1.0 (student project)";
const GAP_MS = 1100;
const TTL_MS = 30 * 60 * 1000;

const cache = new Map<string, { at: number; value: unknown }>();
let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;

async function call<T>(url: string): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;

  const run = chain.then(async () => {
    const wait = lastCall + GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
    const value = await res.json();
    cache.set(url, { at: Date.now(), value });
    return value as T;
  });
  chain = run.catch(() => undefined);
  return run;
}

export type Place = { name: string; short: string; lat: number; lon: number };

type Row = { lat: string; lon: string; display_name: string; address?: Record<string, string> };

export async function search(q: string, limit = 1): Promise<Place[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&q=${encodeURIComponent(q)}`;
  const rows = await call<Row[]>(url);
  return rows.map(toPlace);
}

export async function reverse(lat: number, lon: number, zoom = 12): Promise<Place | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=${zoom}&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const row = await call<Row & { error?: string }>(url);
  if (!row || row.error) return null;
  return toPlace(row);
}

// "Wawona, Mariposa County, California" rather than the full postal line.
function toPlace(r: Row): Place {
  const a = r.address ?? {};
  const locality = a.city || a.town || a.village || a.hamlet || a.suburb || a.county || "";
  const region = a.state || a.country || "";
  const county = a.county && a.county !== locality ? a.county : "";
  const short = [locality, county, region].filter(Boolean).join(", ") || r.display_name;
  return { name: r.display_name, short, lat: Number(r.lat), lon: Number(r.lon) };
}
