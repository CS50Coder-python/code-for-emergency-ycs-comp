import { NextRequest, NextResponse } from "next/server";
import { applyRoadLegs } from "@/lib/chains";
import { DEMO_FIRES, DEMO_HOUSEHOLD, DEMO_WEATHER, RALLY_CANDIDATES } from "@/lib/demo";
import { rankCandidates, rescorePlay, solveHuddle } from "@/lib/rally-solver";
import { buildThreatField } from "@/lib/spread";
import type {
  FireHotspot,
  HouseholdMember,
  LatLng,
  PlayRoute,
  RallyCandidate,
  WeatherNow,
} from "@/lib/types";

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const OSRM_TIMEOUT_MS = 6000;
const MAX_MEMBERS = 12;
const MAX_CANDIDATES = 24;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    members?: HouseholdMember[];
    weather?: WeatherNow;
    fires?: FireHotspot[];
    candidates?: RallyCandidate[];
  };
  const members = sane(body.members) ? body.members.slice(0, MAX_MEMBERS) : DEMO_HOUSEHOLD.members;
  const weather = body.weather ?? DEMO_WEATHER;
  const fires =
    Array.isArray(body.fires) && body.fires.length ? body.fires.slice(0, 60) : DEMO_FIRES;
  const candidates =
    Array.isArray(body.candidates) && body.candidates.length
      ? body.candidates.slice(0, MAX_CANDIDATES)
      : RALLY_CANDIDATES;
  const origin = members[0]?.location ?? DEMO_HOUSEHOLD.members[0].location;
  const threat = buildThreatField(fires, weather, origin);

  const ranked = rankCandidates({ members, candidates, threat });
  let play = solveHuddle({ members, candidates, threat });

  const legs = await roadLegs(play.routes, members, play.rally.location);
  const routedCount = Object.keys(legs).length;
  if (routedCount) {
    play = rescorePlay({ ...play, routes: applyRoadLegs(play.routes, members, legs) }, threat);
  }

  return NextResponse.json({
    play,
    ranked,
    routes: routedCount ? "osrm" : "estimate",
    threatEllipse: threat.ellipse,
    isochrones: threat.isochrones,
    downwind: threat.downwind,
  });
}

function sane(members: unknown): members is HouseholdMember[] {
  return (
    Array.isArray(members) &&
    members.length > 0 &&
    members.every(
      (m) =>
        m &&
        typeof m.id === "string" &&
        typeof m.name === "string" &&
        m.location &&
        Number.isFinite(m.location.lat) &&
        Number.isFinite(m.location.lng),
    )
  );
}

/** Route every driver chain and walker through OSRM, one request per route, in parallel. */
async function roadLegs(routes: PlayRoute[], members: HouseholdMember[], rally: LatLng) {
  const byId = new Map(members.map((m) => [m.id, m]));
  const jobs = routes
    .filter((r) => r.mode === "drive" || r.mode === "walk")
    .map(async (r) => {
      const me = byId.get(r.memberId);
      if (!me) return null;
      const points = [
        me.location,
        ...(r.pickups ?? []).map((p) => byId.get(p.memberId)?.location).filter(Boolean),
        rally,
      ] as LatLng[];
      const road = await osrm(points);
      return road ? ([r.memberId, road] as const) : null;
    });
  const settled = await Promise.all(jobs);
  const out: Record<string, { minutes: number[]; geometry: LatLng[]; distanceKm: number }> = {};
  for (const s of settled) if (s) out[s[0]] = s[1];
  return out;
}

async function osrm(points: LatLng[]) {
  try {
    const path = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const res = await fetch(`${OSRM}/${path}?overview=full&geometries=geojson`, {
      cache: "no-store",
      signal: AbortSignal.timeout(OSRM_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route?.legs?.length) return null;
    return {
      minutes: route.legs.map((l: { duration: number }) => l.duration / 60),
      geometry: route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })),
      distanceKm: route.distance / 1000,
    };
  } catch {
    return null;
  }
}
