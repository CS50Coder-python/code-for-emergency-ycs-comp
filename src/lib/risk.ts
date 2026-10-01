import { angleBetween, compass } from "./geo";
import type { Hotspot } from "./firms";
import type { Msg } from "./i18n";

export type Weather = {
  tempC: number;
  humidity: number; // percent
  windKmh: number;
  gustKmh: number;
  windFromDeg: number; // direction the wind is blowing FROM
};

export type Alert = { event: string; headline: string; severity: string; expires: string };

export type Level = "Low" | "Moderate" | "High" | "Extreme";

export type Risk = {
  score: number; // 0 to 100
  level: Level;
  reasons: Msg[]; // translated on the page, see i18n.ts
  nearest: Hotspot | null;
  upwind: boolean; // is there a hotspot on the side the wind is coming from?
};

// Each factor adds points. The thresholds are simple on purpose so the
// logic can be read, explained to a judge, and changed in one place.
export function scoreRisk(hotspots: Hotspot[], weather: Weather | null, alerts: Alert[]): Risk {
  let score = 0;
  const reasons: Msg[] = [];
  const nearest = hotspots[0] ?? null;

  // 1. Distance to the nearest satellite heat detection.
  if (nearest) {
    const d = nearest.distanceKm;
    const dir = compass(nearest.bearing);
    if (d < 5) { score += 50; reasons.push({ key: "risk.near", params: { d: d.toFixed(1), dir } }); }
    else if (d < 15) { score += 35; reasons.push({ key: "risk.nearest", params: { d: d.toFixed(0), dir } }); }
    else if (d < 30) { score += 20; reasons.push({ key: "risk.nearest", params: { d: d.toFixed(0), dir } }); }
    else { score += 8; reasons.push({ key: "risk.far", params: { d: d.toFixed(0), dir } }); }
  } else {
    reasons.push({ key: "risk.none" });
  }

  // 2. How many detections are close. Clusters mean an active fire, not a single flare.
  const within25 = hotspots.filter((h) => h.distanceKm <= 25).length;
  if (within25 >= 2) {
    score += Math.min(15, within25 * 3);
    reasons.push({ key: "risk.count", params: { n: within25 } });
  }

  // 3. Is the fire upwind? Wind carries embers toward the house.
  let upwind = false;
  if (weather && hotspots.length) {
    upwind = hotspots.some(
      (h) => h.distanceKm <= 30 && angleBetween(h.bearing, weather.windFromDeg) <= 45
    );
    if (upwind) {
      score += 15;
      reasons.push({ key: "risk.upwind", params: { dir: compass(weather.windFromDeg) } });
    }
  }

  // 4. Fire weather: strong wind and dry air.
  if (weather) {
    const g = Math.round(weather.gustKmh);
    if (weather.gustKmh >= 40) { score += 15; reasons.push({ key: "risk.gusts", params: { g } }); }
    else if (weather.gustKmh >= 25) { score += 8; reasons.push({ key: "risk.gusts", params: { g } }); }
    if (weather.humidity <= 15) { score += 15; reasons.push({ key: "risk.dryVery", params: { h: weather.humidity } }); }
    else if (weather.humidity <= 25) { score += 8; reasons.push({ key: "risk.dry", params: { h: weather.humidity } }); }
  }

  // 5. Official warnings from the National Weather Service.
  for (const a of alerts) {
    const e = a.event.toLowerCase();
    if (e.includes("evacuation")) { score += 40; reasons.push({ key: "risk.evac", params: { event: a.event } }); }
    else if (e.includes("red flag")) { score += 20; reasons.push({ key: "risk.redflag" }); }
    else if (e.includes("fire weather")) { score += 10; reasons.push({ key: "risk.fww" }); }
  }

  score = Math.min(100, score);
  const level: Level = score >= 70 ? "Extreme" : score >= 45 ? "High" : score >= 20 ? "Moderate" : "Low";
  return { score, level, reasons, nearest, upwind };
}
