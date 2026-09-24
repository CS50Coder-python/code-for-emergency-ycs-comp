import { haversineKm, lerp } from "./geo";
import type { ThreatField } from "./spread";
import type { HouseholdMember, HuddlePlay, LatLng, PlayRoute, TapeOutcome } from "./types";

export const TAPE_LENGTH_MINUTES = 90;

/**
 * Where a member is `t` minutes into the play.
 * Drivers and walkers spend their mobility minutes before moving. Riders sit
 * at their door until the car arrives, then travel with the driver. Stranded
 * members never move.
 */
export function positionAt(
  routes: PlayRoute[],
  members: HouseholdMember[],
  memberId: string,
  t: number,
): LatLng {
  const member = members.find((m) => m.id === memberId);
  const route = routes.find((r) => r.memberId === memberId);
  if (!member) return { lat: 0, lng: 0 };
  if (!route || route.mode === "stranded" || route.mode === "arrived") return member.location;

  if (route.mode === "ride") {
    if (route.boardAtMinute === undefined || t < route.boardAtMinute || !route.driverId) {
      return member.location;
    }
    return positionAt(routes, members, route.driverId, t);
  }

  const geometry = route.geometry.length ? route.geometry : [member.location];
  const loadTime = (route.pickups ?? []).reduce(
    (s, p) => s + (members.find((m) => m.id === p.memberId)?.mobilityMinutes ?? 0),
    0,
  );
  const delay = member.mobilityMinutes;
  const moving = Math.max(0, route.minutes - delay - loadTime);
  if (t <= delay || moving <= 0) return geometry[0];
  const frac = Math.min(1, (t - delay) / moving);
  return along(geometry, frac);
}

/** Point at a fraction of a polyline by distance. */
export function along(geometry: LatLng[], frac: number): LatLng {
  if (geometry.length === 1) return geometry[0];
  const legs: number[] = [];
  let total = 0;
  for (let i = 1; i < geometry.length; i++) {
    const d = haversineKm(geometry[i - 1], geometry[i]);
    legs.push(d);
    total += d;
  }
  if (total === 0) return geometry[geometry.length - 1];
  let target = frac * total;
  for (let i = 0; i < legs.length; i++) {
    if (target <= legs[i]) {
      return lerp(geometry[i], geometry[i + 1], legs[i] === 0 ? 1 : target / legs[i]);
    }
    target -= legs[i];
  }
  return geometry[geometry.length - 1];
}

/** Has the modeled front reached this point by minute `t`? */
export function isBurningAt(threat: ThreatField, p: LatLng, t: number) {
  return threat.impactMinutesAt(p) <= t;
}

export function tapeOutcomes(
  play: HuddlePlay,
  members: HouseholdMember[],
  threat: ThreatField,
): TapeOutcome[] {
  const fireAtRally = threat.impactMinutesAt(play.rally.location);
  return members.map((m) => {
    const route = play.routes.find((r) => r.memberId === m.id);
    const arrives = !route || route.mode === "stranded" ? Infinity : route.minutes;
    const margin = fireAtRally - arrives;
    return {
      memberId: m.id,
      name: m.name,
      arrivesAtMinute: arrives,
      fireAtRallyMinute: fireAtRally,
      marginMinutes: margin,
      makesIt: margin > 0,
    };
  });
}

export function tapeVerdict(outcomes: TapeOutcome[]) {
  const late = outcomes.filter((o) => !o.makesIt);
  if (!outcomes.length) return { ok: false, text: "No household loaded." };
  if (!late.length) {
    const tightest = [...outcomes].sort((a, b) => a.marginMinutes - b.marginMinutes)[0];
    return {
      ok: true,
      text: `Everyone meets. Tightest margin: ${tightest.name}, ${Math.round(tightest.marginMinutes)} min ahead of the front.`,
    };
  }
  const stranded = late.filter((o) => !Number.isFinite(o.arrivesAtMinute));
  if (stranded.length) {
    return {
      ok: false,
      text: `${stranded.map((o) => o.name).join(", ")} ${stranded.length === 1 ? "has" : "have"} no ride that beats the front. Claim a mesh seat.`,
    };
  }
  return {
    ok: false,
    text: `${late.map((o) => o.name).join(", ")} ${late.length === 1 ? "misses" : "miss"} the rally. Move the lot or add a car.`,
  };
}
