import { NextRequest, NextResponse } from "next/server";
import { DEMO_FIRES, SCENARIO_CENTER } from "@/lib/demo";
import { hasFirms } from "@/lib/env";
import { isNearPalisades } from "@/lib/scenario";
import type { FireHotspot } from "@/lib/types";

const TIMEOUT_MS = 8000;

/**
 * Thermal hotspots around a point. With a FIRMS key we read NASA VIIRS for the
 * last day. Without one, the Palisades scene gets the scripted cluster and any
 * other place gets an empty list so the client can stage a drill upwind.
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  const center = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : SCENARIO_CENTER;
  const demo = isNearPalisades(center) ? DEMO_FIRES : [];

  if (!hasFirms()) {
    return NextResponse.json({ source: demo.length ? "demo" : "none", fires: demo });
  }

  const key = process.env.FIRMS_MAP_KEY!;
  const box = `${center.lng - 0.35},${center.lat - 0.25},${center.lng + 0.35},${center.lat + 0.25}`;
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${box}/1`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const csv = await res.text();
    const fires = parseFirms(csv);
    return NextResponse.json({
      source: fires.length ? "firms" : demo.length ? "demo" : "none",
      fires: fires.length ? fires : demo,
    });
  } catch {
    return NextResponse.json({ source: demo.length ? "demo" : "none", fires: demo });
  }
}

function parseFirms(csv: string): FireHotspot[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2 || lines[0].toLowerCase().includes("invalid")) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const latI = header.findIndex((h) => h === "latitude");
  const lngI = header.findIndex((h) => h === "longitude");
  const brI = header.findIndex((h) => h.includes("bright"));
  const frpI = header.findIndex((h) => h === "frp");
  const acq = header.findIndex((h) => h.includes("acq_date"));
  return lines.slice(1, 60).flatMap((line, i) => {
    const c = line.split(",");
    const lat = Number(c[latI]);
    const lng = Number(c[lngI]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [
      {
        id: `firms-${i}`,
        location: { lat, lng },
        brightness: Number(c[brI]) || 300,
        frp: Number(c[frpI]) || 10,
        observedAt: c[acq] || new Date().toISOString(),
        source: "firms" as const,
      },
    ];
  });
}
