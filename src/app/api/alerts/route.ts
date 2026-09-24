import { NextRequest, NextResponse } from "next/server";
import { NWS_UA } from "@/lib/env";
import type { NwsAlert } from "@/lib/types";

const TIMEOUT_MS = 6000;
const FIRE_WORDS = /fire|red flag|wind|smoke|heat|evacuat/i;

/**
 * Active NWS alerts. With a point we ask for that exact spot (any US state);
 * without one we fall back to statewide California, then to the demo warning.
 */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const query = hasPoint ? `point=${lat.toFixed(4)},${lng.toFixed(4)}` : "area=CA";

  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?${query}&status=actual&message_type=alert`,
      {
        headers: { "User-Agent": NWS_UA, Accept: "application/geo+json" },
        next: { revalidate: 180 },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok) throw new Error("nws");
    const data = await res.json();
    const all: NwsAlert[] = (data.features ?? [])
      .slice(0, 20)
      .map((f: { id: string; properties: Record<string, string> }) => ({
        id: f.id,
        event: f.properties.event,
        headline: f.properties.headline ?? f.properties.event,
        severity: f.properties.severity,
        instruction: f.properties.instruction ?? "",
      }));
    const relevant = all.filter((a) => FIRE_WORDS.test(`${a.event} ${a.headline}`));
    const alerts = relevant.length ? relevant : all.slice(0, 3);
    return NextResponse.json({
      source: "nws",
      scope: hasPoint ? "point" : "state",
      alerts: alerts.slice(0, 6),
    });
  } catch {
    return NextResponse.json({ source: "offline", scope: "none", alerts: [] });
  }
}
