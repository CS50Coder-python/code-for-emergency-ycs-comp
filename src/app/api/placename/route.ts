import { NextRequest, NextResponse } from "next/server";
import { reverse } from "@/lib/nominatim";

// GET /api/placename?lat=37.6&lon=-119.6  ->  { name: "Wawona, Mariposa County, California" }
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }
  const place = await reverse(lat, lon, 12).catch(() => null);
  return NextResponse.json({ name: place?.short ?? null });
}
