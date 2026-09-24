import { NextRequest, NextResponse } from "next/server";
import { DEMO_WEATHER, SCENARIO_CENTER } from "@/lib/demo";

const TIMEOUT_MS = 6000;

export async function GET(req: NextRequest) {
  const lat = clamp(req.nextUrl.searchParams.get("lat"), -90, 90, SCENARIO_CENTER.lat);
  const lng = clamp(req.nextUrl.searchParams.get("lng"), -180, 180, SCENARIO_CENTER.lng);
  const forecast = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,relative_humidity_2m&timezone=auto`;
  const air = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5`;

  try {
    const [f, a] = await Promise.all([
      fetch(forecast, { next: { revalidate: 600 }, signal: AbortSignal.timeout(TIMEOUT_MS) }),
      fetch(air, { next: { revalidate: 600 }, signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(
        () => null,
      ),
    ]);
    if (!f.ok) throw new Error("meteo");
    const data = await f.json();
    const aq = a && a.ok ? await a.json().catch(() => null) : null;
    const aqi = aq?.current?.us_aqi;
    return NextResponse.json({
      source: "open-meteo",
      weather: {
        windKph: num(data.current?.wind_speed_10m, DEMO_WEATHER.windKph),
        windDeg: num(data.current?.wind_direction_10m, DEMO_WEATHER.windDeg),
        gustKph: num(data.current?.wind_gusts_10m, null),
        humidity: num(data.current?.relative_humidity_2m, DEMO_WEATHER.humidity),
        tempC: num(data.current?.temperature_2m, DEMO_WEATHER.tempC),
        aqi: typeof aqi === "number" ? Math.round(aqi) : null,
      },
    });
  } catch {
    return NextResponse.json({ source: "demo", weather: DEMO_WEATHER });
  }
}

function clamp(raw: string | null, lo: number, hi: number, dflt: number) {
  const n = Number(raw);
  if (raw === null || !Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, n));
}

function num<T>(v: unknown, dflt: T) {
  return typeof v === "number" && Number.isFinite(v) ? v : dflt;
}
