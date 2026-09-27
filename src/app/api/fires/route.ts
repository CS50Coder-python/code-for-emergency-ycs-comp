import { NextRequest, NextResponse } from "next/server";
import { hotspotsNear } from "@/lib/firms";

// GET /api/fires?lat=34&lon=-118&radius=50
// Satellite heat detections from the last 24 hours within `radius` km.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  const radius = Math.min(3000, Number(p.get("radius") ?? 50));
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }
  try {
    const hotspots = await hotspotsNear(lat, lon, radius);
    return NextResponse.json({ hotspots, count: hotspots.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
