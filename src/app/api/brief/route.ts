import { NextRequest, NextResponse } from "next/server";
import { hotspotsNear } from "@/lib/firms";
import { scoreRisk, type Alert, type Weather } from "@/lib/risk";
import { BRIEF_RADIUS_KM } from "@/lib/site";
import { clusterFires } from "@/lib/firms";
import { destination, distanceKm, bearingDeg } from "@/lib/geo";

// GET /api/brief?q=123 Main St, Town   or   /api/brief?lat=34&lon=-118
// One call: geocode, satellite hotspots, live weather, official alerts, risk score.

const UA = process.env.NWS_USER_AGENT ?? "Hearth/1.0 (student project)";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  let lat = Number(p.get("lat"));
  let lon = Number(p.get("lon"));
  let name = p.get("q") ?? "";

  try {
    if (Number.isNaN(lat) || Number.isNaN(lon) || !p.get("lat")) {
      if (!name.trim()) return NextResponse.json({ error: "Enter an address." }, { status: 400 });
      const place = await geocode(name);
      if (!place) return NextResponse.json({ error: "Address not found. Try adding the city or state." }, { status: 404 });
      lat = place.lat; lon = place.lon; name = place.name;
    } else if (!name) {
      name = (await reverseGeocode(lat, lon)) ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }

    const [hotspots, weather, alerts] = await Promise.all([
      hotspotsNear(lat, lon, BRIEF_RADIUS_KM),
      getWeather(lat, lon),
      getAlerts(lat, lon),
    ]);
    const risk = scoreRisk(hotspots, weather, alerts);
    const fires = clusterFires(hotspots, weather, { lat, lon });
    const nearestFire = fires[0];
    const arrival = nearestFire?.spreadHours && weather ? { ...nearestFire.spreadHours, label: `about ${Math.max(1, Math.round((nearestFire.spreadHours.low + nearestFire.spreadHours.high) / 2))} hours`, confidence: "Very uncertain: simplified wind and humidity model; terrain, fuel, suppression, and changing weather are not modeled." } : null;
    let route = null;
    if (nearestFire) {
      try {
        // Continue past the cluster in the home-to-fire direction to reach the far side.
        const beyond = bearingDeg(lat, lon, nearestFire.lat, nearestFire.lon);
        const target = destination(nearestFire.lat, nearestFire.lon, beyond, 20);
        let destinationName = "a point beyond the nearest fire";
        try {
          const townRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${target.lat}&lon=${target.lon}&zoom=10&addressdetails=1`, { headers: { "User-Agent": UA }, cache: "no-store" });
          if (townRes.ok) {
            const town = await townRes.json();
            const address = town.address ?? {};
            destinationName = address.city ?? address.town ?? address.village ?? address.municipality ?? destinationName;
          }
        } catch { /* Keep the coordinate target if reverse lookup is unavailable. */ }
        const url = `https://router.project-osrm.org/route/v1/driving/${lon},${lat};${target.lon},${target.lat}?overview=full&geometries=geojson`;
        const rr = await fetch(url, { cache: "no-store" });
        if (rr.ok) {
          const data = await rr.json(); const coords = data.routes?.[0]?.geometry?.coordinates ?? [];
          const near = coords.some((c: number[]) => fires.some(f => distanceKm(c[1], c[0], f.lat, f.lon) < 3));
          route = { coordinates: coords.map((c: number[]) => [c[1], c[0]]), risky: near, destination: destinationName };
        }
      } catch { /* Routing is a best-effort planning aid. */ }
    }

    return NextResponse.json({
      place: { name, lat, lon },
      hotspots: hotspots.slice(0, 200),
      fires,
      arrival,
      route,
      weather,
      alerts,
      risk,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}

async function geocode(q: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  if (!rows.length) return null;
  return { lat: Number(rows[0].lat), lon: Number(rows[0].lon), name: rows[0].display_name };
}

async function reverseGeocode(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json()) as { display_name?: string };
  return j.display_name ?? null;
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
