import { NextRequest, NextResponse } from "next/server";
import { hotspotsNear } from "@/lib/firms";
import { planEscape } from "@/lib/routes";
import { BRIEF_RADIUS_KM } from "@/lib/site";

// GET /api/routes?lat=34&lon=-118
// Driving routes out in eight directions, scored by how close they come to a fire.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const lat = Number(p.get("lat"));
  const lon = Number(p.get("lon"));
  if (!p.get("lat") || Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }
  try {
    const hotspots = await hotspotsNear(lat, lon, BRIEF_RADIUS_KM);
    const plan = await planEscape(lat, lon, hotspots);
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
