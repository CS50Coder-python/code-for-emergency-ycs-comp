import { bearingDeg, centroid, destination, haversineKm, windOffset } from "./geo";
import type { FireHotspot, LatLng, WeatherNow } from "./types";

export type ThreatField = {
  cells: { location: LatLng; minutes: number; intensity: number }[];
  impactMinutesAt: (p: LatLng) => number;
  ellipse: LatLng[];
  /** Arrival-time contours, one ring per horizon in ISOCHRONE_MINUTES. */
  isochrones: Isochrone[];
  /** Downwind bearing in degrees (where embers travel). */
  downwind: number;
  headRosKmh: number;
};

export type Isochrone = { minutes: number; ring: LatLng[] };

export const ISOCHRONE_MINUTES = [15, 30, 45, 60, 90];
export const HORIZON_MINUTES = 240;

/**
 * Anisotropic wildfire arrival field.
 * Rate of spread is a compact Rothermel-inspired model:
 *   ROS = R0 * (1 + cU * U^1.12) * dryFactor
 * The head fire runs downwind; flanks are slower; the backing fire is slowest.
 * Everything is in km/h so the field can answer "when does the fire get here?".
 */
export function buildThreatField(
  fires: FireHotspot[],
  weather: WeatherNow,
  origin: LatLng,
): ThreatField {
  const ros = rateOfSpread(weather);
  const downwind = windOffset(weather.windDeg);
  const params = { fires, downwind, ...ros };

  const cells: ThreatField["cells"] = [];
  const step = 0.9;
  for (let i = -8; i <= 10; i++) {
    for (let j = -7; j <= 7; j++) {
      const location = destination(
        origin,
        (Math.atan2(j, i) * 180) / Math.PI,
        Math.hypot(i, j) * step,
      );
      const minutes = arrivalMinutes(location, params);
      const intensity = Math.max(0, 1 - minutes / 180);
      cells.push({ location, minutes, intensity });
    }
  }

  const seed = fires.length ? centroid(fires.map((f) => f.location)) : origin;
  const ellipse: LatLng[] = [];
  for (let a = 0; a < 360; a += 10) {
    const r = directionalRos(a, downwind, ros.head, ros.flank, ros.back);
    ellipse.push(destination(seed, a, r * (40 / 60)));
  }

  const impactMinutesAt = (p: LatLng) => arrivalMinutes(p, params);
  const isochrones = ISOCHRONE_MINUTES.map((minutes) => ({
    minutes,
    ring: contour(seed, minutes, impactMinutesAt),
  }));

  return {
    cells,
    ellipse,
    isochrones,
    downwind,
    headRosKmh: ros.head,
    impactMinutesAt,
  };
}

/** Head, flank and backing rates of spread in km/h. */
export function rateOfSpread(weather: WeatherNow) {
  const windMs = Math.max(weather.windKph, 0) / 3.6;
  const dry = Math.exp(-2.1 * (Math.min(Math.max(weather.humidity, 0), 100) / 100));
  const r0 = 2.2;
  const head = r0 * (1 + 0.2 * Math.pow(Math.max(windMs, 0.4), 1.12)) * dry;
  return { head, flank: head * 0.45, back: head * 0.18 };
}

/**
 * Trace a contour where the arrival time equals `minutes`.
 * Arrival time grows with distance from the fire cluster along any bearing,
 * so a bisection per bearing finds the ring cheaply.
 */
export function contour(
  seed: LatLng,
  minutes: number,
  impactAt: (p: LatLng) => number,
  stepDeg = 6,
): LatLng[] {
  const ring: LatLng[] = [];
  for (let a = 0; a < 360; a += stepDeg) {
    let lo = 0;
    let hi = 80;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      if (impactAt(destination(seed, a, mid)) < minutes) lo = mid;
      else hi = mid;
    }
    ring.push(destination(seed, a, (lo + hi) / 2));
  }
  return ring;
}

function directionalRos(
  bearing: number,
  downwind: number,
  head: number,
  flank: number,
  back: number,
) {
  const delta = Math.abs(((bearing - downwind + 540) % 360) - 180);
  const t = delta / 180;
  if (t < 0.35) {
    return head * (1 - t / 0.35) + flank * (t / 0.35);
  }
  return flank * (1 - (t - 0.35) / 0.65) + back * ((t - 0.35) / 0.65);
}

type ArrivalParams = {
  fires: FireHotspot[];
  downwind: number;
  head: number;
  flank: number;
  back: number;
};

function arrivalMinutes(point: LatLng, p: ArrivalParams) {
  if (!p.fires.length) return HORIZON_MINUTES;
  let best = HORIZON_MINUTES;
  for (const fire of p.fires) {
    const km = haversineKm(fire.location, point);
    const brng = bearingDeg(fire.location, point);
    const ros = Math.max(0.05, directionalRos(brng, p.downwind, p.head, p.flank, p.back));
    const boost = 1 + Math.min(fire.frp, 80) / 220;
    const spotting = 8;
    best = Math.min(best, Math.max(8, (km / (ros * boost)) * 60 - spotting));
  }
  return best;
}
