import { angleBetween } from "./geo";
import type { Weather } from "./risk";

// A deliberately simple rate-of-spread model. Real fire behaviour depends on
// fuel, slope and spotting that we do not know, so the output is an order of
// magnitude with an honest range, not a forecast.
//
//   ROS = BASE * (1 + WIND_K * U) * humidity(RH) * shape(angle)
//
//   BASE          0.5 km/h, a brush fire with little wind and moderate humidity
//   U             sustained wind in km/h (gusts count for half)
//   humidity(RH)  1.6 at 0% down to 0.4 at 60%+; dry air burns faster
//   shape(angle)  1.0 at the head (downwind), about 0.35 on the flanks,
//                 0.15 at the back, the classic ellipse

const BASE_KMH = 0.5;
const WIND_K = 0.08;

export type Arrival = {
  rosKmh: number; // rate of spread toward the address
  hours: number;
  hoursLow: number; // half, for the range we show
  hoursHigh: number; // double
  windToDeg: number; // where the wind is pushing the fire
  relative: "head" | "flank" | "back"; // where the address sits relative to the fire's run
  angle: number; // degrees between the wind push and the line fire -> address
};

export function estimateArrival(distanceKm: number, bearingFireToHouse: number, w: Weather): Arrival {
  const windTo = (w.windFromDeg + 180) % 360;
  const angle = angleBetween(windTo, bearingFireToHouse);
  const u = Math.max(w.windKmh, 0.5 * w.gustKmh);
  const humidity = clamp(1.6 - 0.02 * w.humidity, 0.4, 1.6);
  const c = (1 + Math.cos((angle * Math.PI) / 180)) / 2; // 1 at head, 0 at back
  const shape = 0.15 + 0.85 * c * c;
  const ros = BASE_KMH * (1 + WIND_K * u) * humidity * shape;
  const hours = distanceKm / ros;
  return {
    rosKmh: ros,
    hours,
    hoursLow: hours / 2,
    hoursHigh: hours * 2,
    windToDeg: windTo,
    relative: angle <= 35 ? "head" : angle <= 100 ? "flank" : "back",
    angle,
  };
}

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}
