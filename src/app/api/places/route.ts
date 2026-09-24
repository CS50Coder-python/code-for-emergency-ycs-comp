import { NextRequest, NextResponse } from "next/server";
import { NWS_UA } from "@/lib/env";
import { haversineKm } from "@/lib/geo";
import type { RallyCandidate } from "@/lib/types";

const OVERPASS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const TIMEOUT_MS = 9000;
const MAX = 10;

/**
 * Real rally-point candidates from OpenStreetMap: schools, large parking lots,
 * community centres and fire stations within a radius. Falls back to an empty
 * list; the client then lays out geometric crosswind turnouts instead.
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  const radius = Math.min(8000, Math.max(1000, Number(req.nextUrl.searchParams.get("r")) || 4500));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const q = `[out:json][timeout:8];
(
  nwr["amenity"="school"](around:${radius},${lat},${lng});
  nwr["amenity"="community_centre"](around:${radius},${lat},${lng});
  nwr["amenity"="fire_station"](around:${radius},${lat},${lng});
  nwr["amenity"="parking"]["parking"="surface"](around:${radius},${lat},${lng});
  nwr["leisure"="stadium"](around:${radius},${lat},${lng});
);
out center tags 40;`;

  try {
    const data = (await query(q)) as {
      elements: {
        id: number;
        type: string;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      }[];
    };
    const center = { lat, lng };
    const seen = new Set<string>();
    const candidates: RallyCandidate[] = [];
    for (const el of data.elements ?? []) {
      const p = el.center ?? (el.lat !== undefined ? { lat: el.lat, lon: el.lon! } : null);
      if (!p) continue;
      const tags = el.tags ?? {};
      const kind = kindOf(tags);
      const name = tags.name ?? defaultName(kind);
      const key = `${name}-${Math.round(p.lat * 500)}-${Math.round(p.lon * 500)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        id: `osm-${el.type}-${el.id}`,
        name,
        kind,
        location: { lat: p.lat, lng: p.lon },
      });
    }
    // Prefer named places, then spread candidates around the compass.
    candidates.sort((a, b) => {
      const an = a.name.startsWith("Unnamed") ? 1 : 0;
      const bn = b.name.startsWith("Unnamed") ? 1 : 0;
      if (an !== bn) return an - bn;
      return haversineKm(center, b.location) - haversineKm(center, a.location);
    });
    return NextResponse.json({ source: "osm", candidates: candidates.slice(0, MAX) });
  } catch {
    return NextResponse.json({ source: "none", candidates: [] });
  }
}

/** Try each Overpass endpoint in turn; the public one rate-limits bursts. */
async function query(q: string) {
  let lastError: unknown = null;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": NWS_UA,
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(q)}`,
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`overpass ${res.status}`);
      return await res.json();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("overpass");
}

function kindOf(tags: Record<string, string>): RallyCandidate["kind"] {
  if (tags.amenity === "school") return "school";
  if (tags.amenity === "community_centre" || tags.amenity === "fire_station") return "civic";
  if (tags.leisure === "stadium") return "civic";
  return "lot";
}

function defaultName(kind: RallyCandidate["kind"]) {
  return kind === "school"
    ? "Unnamed school"
    : kind === "civic"
      ? "Unnamed civic site"
      : "Unnamed parking lot";
}
