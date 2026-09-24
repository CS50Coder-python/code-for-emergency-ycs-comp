import { NextRequest, NextResponse } from "next/server";
import { NWS_UA } from "@/lib/env";

const TIMEOUT_MS = 6000;

/** Place search via Nominatim. One result, trimmed, with a polite User-Agent. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 2) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,
      {
        headers: { "User-Agent": NWS_UA, Accept: "application/json" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) throw new Error("nominatim");
    const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = data[0];
    if (!hit) return NextResponse.json({ result: null });
    return NextResponse.json({
      result: {
        lat: Number(hit.lat),
        lng: Number(hit.lon),
        name: hit.display_name.split(",").slice(0, 3).join(",").trim(),
      },
    });
  } catch {
    return NextResponse.json({ result: null, error: "geocoder unavailable" }, { status: 502 });
  }
}
