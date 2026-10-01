import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/nominatim";

// GET /api/suggest?q=Wawo  ->  address suggestions while typing
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ places: [] });
  let places = await search(q, 5).catch(() => []);
  // The geocoder matches whole words. "Wawona, Cal" finds nothing, so retry
  // without the unfinished last part.
  if (!places.length && q.includes(",")) {
    places = await search(q.slice(0, q.lastIndexOf(",")), 5).catch(() => []);
  }
  return NextResponse.json({ places: places.map((p) => ({ name: p.name, lat: p.lat, lon: p.lon })) });
}
