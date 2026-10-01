import { NextResponse } from "next/server";
import { hotspotsNear } from "@/lib/firms";
import { clusterHotspots } from "@/lib/clusters";

// GET /api/active
// The largest fires in the contiguous United States right now, for the landing page.
// Names are looked up separately by /api/placename so this stays fast.

const US = { lat: 39.5, lon: -98.4 };
let cached: { at: number; body: unknown } | null = null;

export async function GET() {
  if (cached && Date.now() - cached.at < 15 * 60 * 1000) return NextResponse.json(cached.body);
  try {
    const hotspots = await hotspotsNear(US.lat, US.lon, 2600);
    const fires = clusterHotspots(hotspots, US)
      .filter((f) => f.count >= 5)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map((f) => ({
        id: f.id,
        lat: f.center.lat,
        lon: f.center.lon,
        count: f.count,
        frpTotal: f.frpTotal,
        spanKm: f.spanKm,
        lastSeen: f.lastSeen,
        ageHours: f.ageHours,
      }));
    const body = { fires, total: hotspots.length, updatedAt: new Date().toISOString() };
    cached = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
