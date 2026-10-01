import { NextRequest, NextResponse } from "next/server";
import { hotspotsNear } from "@/lib/firms";
import { clusterHotspots } from "@/lib/clusters";
import { estimateArrival } from "@/lib/spread";
import { scoreRisk, type Alert, type Weather } from "@/lib/risk";
import { search, reverse } from "@/lib/nominatim";
import { BRIEF_RADIUS_KM } from "@/lib/site";

// GET /api/brief?q=123 Main St, Town   or   /api/brief?lat=34&lon=-118
// One call: geocode, satellite hotspots grouped into fires, live weather,
// official alerts, risk score, and how long the nearest fire needs to arrive.

const UA = process.env.NWS_USER_AGENT ?? "Hearth/1.0 (student project)";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  let lat = Number(p.get("lat"));
  let lon = Number(p.get("lon"));
  let name = p.get("q") ?? "";

  try {
    if (!p.get("lat") || Number.isNaN(lat) || Number.isNaN(lon)) {
      if (!name.trim()) return NextResponse.json({ error: "Enter an address." }, { status: 400 });
      const [place] = await search(name, 1);
      if (!place) return NextResponse.json({ error: "Address not found. Try adding the city or state." }, { status: 404 });
      lat = place.lat; lon = place.lon; name = place.name;
    } else if (!name) {
      name = (await reverse(lat, lon, 16).catch(() => null))?.name ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }

    const [hotspots, weather, alerts] = await Promise.all([
      hotspotsNear(lat, lon, BRIEF_RADIUS_KM),
      getWeather(lat, lon),
      getAlerts(lat, lon),
    ]);
    const risk = scoreRisk(hotspots, weather, alerts);
    const fires = clusterHotspots(hotspots, { lat, lon });
    const nearestFire = fires[0] ?? null;
    const arrival =
      nearestFire && weather
        ? estimateArrival(nearestFire.nearestKm, (nearestFire.bearing + 180) % 360, weather)
        : null;

    return NextResponse.json({
      place: { name, lat, lon },
      hotspots: hotspots.slice(0, 300),
      fires: fires.slice(0, 8),
      arrival,
      weather,
      alerts,
      risk,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}

async function getWeather(lat: number, lon: number): Promise<Weather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const j = await res.json();
  const c = j.current;
  return {
    tempC: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    windKmh: c.wind_speed_10m,
    gustKmh: c.wind_gusts_10m,
    windFromDeg: c.wind_direction_10m,
  };
}

// National Weather Service covers the United States only. Elsewhere this returns [].
async function getAlerts(lat: number, lon: number): Promise<Alert[]> {
  try {
    const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/geo+json" }, cache: "no-store" });
    if (!res.ok) return [];
    const j = await res.json();
    type F = { properties: { event: string; headline: string; severity: string; expires: string } };
    return ((j.features ?? []) as F[]).map((f) => ({
      event: f.properties.event,
      headline: f.properties.headline,
      severity: f.properties.severity,
      expires: f.properties.expires,
    }));
  } catch {
    return [];
  }
}
