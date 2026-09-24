import { destination, haversineKm, windOffset } from "./geo";
import { SCENARIO_CENTER } from "./demo";
import type {
  FireHotspot,
  HouseholdMember,
  HouseholdProfile,
  LatLng,
  RallyCandidate,
  Scenario,
  WeatherNow,
} from "./types";

export const PALISADES: Scenario = {
  id: "palisades",
  name: "Pacific Palisades · night ops",
  center: SCENARIO_CENTER,
  kind: "demo",
};

/** A drill is always a red flag day: today's wind direction, floored to red-flag speed and dryness. */
export const DRILL_MIN_WIND_KPH = 32;
export const DRILL_MAX_HUMIDITY = 18;

export function redFlagDrill(live: WeatherNow): WeatherNow {
  return {
    ...live,
    windKph: Math.max(live.windKph, DRILL_MIN_WIND_KPH),
    gustKph: live.gustKph ? Math.max(live.gustKph, DRILL_MIN_WIND_KPH + 12) : live.gustKph,
    humidity: Math.min(live.humidity, DRILL_MAX_HUMIDITY),
  };
}

export function isNearPalisades(p: LatLng) {
  return haversineKm(p, SCENARIO_CENTER) < 25;
}

/**
 * When there is no satellite detection for a live scenario, stage a drill:
 * an ignition cluster 6 km upwind so the wind really is the defense.
 */
export function synthesizeFires(center: LatLng, weather: WeatherNow): FireHotspot[] {
  const upwind = (weather.windDeg + 360) % 360;
  const seed = destination(center, upwind, 6);
  const cross = (upwind + 90) % 360;
  const now = new Date().toISOString();
  return [
    { id: "drill-1", location: seed, brightness: 360, frp: 42, observedAt: now, source: "demo" },
    {
      id: "drill-2",
      location: destination(seed, cross, 0.9),
      brightness: 340,
      frp: 20,
      observedAt: now,
      source: "demo",
    },
    {
      id: "drill-3",
      location: destination(destination(seed, upwind, 0.8), cross + 180, 0.6),
      brightness: 330,
      frp: 12,
      observedAt: now,
      source: "demo",
    },
  ];
}

/** Geometric fallback lots when OpenStreetMap has nothing usable nearby. */
export function syntheticCandidates(center: LatLng, weather: WeatherNow): RallyCandidate[] {
  const downwind = windOffset(weather.windDeg);
  const mk = (
    id: string,
    name: string,
    bearing: number,
    km: number,
    kind: RallyCandidate["kind"],
  ): RallyCandidate => ({
    id,
    name,
    kind,
    location: destination(center, bearing, km),
  });
  return [
    mk("cw-left", "Crosswind turnout · left flank", (downwind + 90) % 360, 3.2, "turnout"),
    mk("cw-right", "Crosswind turnout · right flank", (downwind + 270) % 360, 3.2, "turnout"),
    mk("dw-far", "Downwind civic staging", downwind, 7.5, "civic"),
    mk("cw-far", "Far crosswind lot", (downwind + 110) % 360, 6, "lot"),
  ];
}

/** A generic household placed around a live center so the play has players. */
export function householdAround(center: LatLng, name = "Your household"): HouseholdProfile {
  const mk = (
    id: string,
    label: string,
    role: HouseholdMember["role"],
    bearing: number,
    km: number,
    mobilityMinutes: number,
    needs: string[],
    status: HouseholdMember["status"] = "unaccounted",
  ): HouseholdMember => ({
    id,
    name: label,
    role,
    status,
    location: destination(center, bearing, km),
    mobilityMinutes,
    needs,
  });
  return {
    id: `live-${Math.round(center.lat * 1e3)}-${Math.round(center.lng * 1e3)}`,
    name,
    pets: [],
    vehicles: 1,
    notes: "Drag people to where they really are. Edit roles.",
    members: [
      mk("you", "You", "driver", 0, 0, 0, ["car keys"]),
      mk("kid", "Kid", "school", 120, 1.4, 8, ["pickup"]),
      mk("elder", "Elder", "homebound", 250, 1.8, 15, ["walker", "meds"], "needs-ride"),
      mk("walker", "Neighbor", "walker", 40, 0.9, 3, ["no car"]),
    ],
  };
}
