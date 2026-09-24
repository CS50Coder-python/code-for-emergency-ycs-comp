import { haversineKm } from "./geo";
import type { ThreatField } from "./spread";
import type { HouseholdMember, LatLng, PlayRoute, RallyCandidate } from "./types";

const DRIVE_KMH = 32;
const TRAFFIC = 1.35;
const WALK_KMH = 4.5;
const WALK_FACTOR = 1.25;
/** Minutes the car must beat the front to a door for a pickup to count. */
const PICKUP_MARGIN = 3;
const SEATS: Record<string, number> = { driver: 4, volunteer: 3 };
/** Household cars are preferred; volunteers cover what the family cannot. */
const VOLUNTEER_PENALTY = 6;

export function estimateDriveMinutes(from: LatLng, to: LatLng, extra = 0) {
  return Math.max(4, (haversineKm(from, to) / DRIVE_KMH) * 60 * TRAFFIC) + extra;
}

export function estimateWalkMinutes(from: LatLng, to: LatLng, extra = 0) {
  return Math.max(3, (haversineKm(from, to) / WALK_KMH) * 60 * WALK_FACTOR) + extra;
}

export function walkMinutesForKm(km: number, extra = 0) {
  return Math.max(3, (km / WALK_KMH) * 60 * WALK_FACTOR) + extra;
}

export function sketchLeg(from: LatLng, to: LatLng): LatLng[] {
  const mid = { lat: (from.lat + to.lat) / 2, lng: (from.lng + to.lng) / 2 };
  const wobble = {
    lat: mid.lat + (to.lng - from.lng) * 0.08,
    lng: mid.lng - (to.lat - from.lat) * 0.08,
  };
  return [from, wobble, to];
}

export function sketchRoute(points: LatLng[]): LatLng[] {
  const out: LatLng[] = [];
  for (let i = 1; i < points.length; i++) {
    const leg = sketchLeg(points[i - 1], points[i]);
    out.push(...(i === 1 ? leg : leg.slice(1)));
  }
  return out.length ? out : points.slice(0, 1);
}

export function hasCar(m: HouseholdMember) {
  return m.role === "driver" || m.role === "volunteer";
}

export function mustRide(m: HouseholdMember) {
  return m.role === "school" || m.role === "homebound" || m.status === "needs-ride";
}

function arrived(m: HouseholdMember) {
  return m.status === "at-rally" || m.status === "safe";
}

type Chain = {
  driver: HouseholdMember;
  stops: { member: HouseholdMember; atMinute: number }[];
  minute: number;
  at: LatLng;
};

/**
 * Build one route per member for a candidate rally point.
 * Drivers run pickup chains. Riders board the first car that can beat the
 * front to their door. Walkers ride when it is faster, else walk. Anyone no
 * car can reach in time is marked stranded so the mesh can claim them.
 */
export function buildRoutes(
  members: HouseholdMember[],
  rally: RallyCandidate,
  threat: ThreatField,
): PlayRoute[] {
  const routes = new Map<string, PlayRoute>();
  const chains: Chain[] = [];

  for (const m of members) {
    if (arrived(m)) {
      routes.set(m.id, {
        memberId: m.id,
        geometry: [m.location],
        minutes: 0,
        distanceKm: 0,
        source: "estimate",
        mode: "arrived",
      });
    } else if (hasCar(m)) {
      chains.push({ driver: m, stops: [], minute: m.mobilityMinutes, at: m.location });
    }
  }

  const riders = members
    .filter((m) => !arrived(m) && !hasCar(m) && mustRide(m))
    .sort((a, b) => threat.impactMinutesAt(a.location) - threat.impactMinutesAt(b.location));

  for (const r of riders) {
    const pick = bestChain(chains, r, threat);
    if (!pick) {
      routes.set(r.id, stranded(r));
      continue;
    }
    board(pick.chain, r, pick.pickupAt);
    routes.set(r.id, riderRoute(r, pick.chain.driver.id, pick.pickupAt));
  }

  const walkers = members.filter((m) => !arrived(m) && !hasCar(m) && !mustRide(m));
  for (const w of walkers) {
    const walk = estimateWalkMinutes(w.location, rally.location, w.mobilityMinutes);
    const pick = bestChain(chains, w, threat);
    const rideArrival = pick
      ? pick.pickupAt + w.mobilityMinutes + estimateDriveMinutes(w.location, rally.location)
      : Infinity;
    if (pick && rideArrival < walk) {
      board(pick.chain, w, pick.pickupAt);
      routes.set(w.id, riderRoute(w, pick.chain.driver.id, pick.pickupAt));
    } else {
      routes.set(w.id, {
        memberId: w.id,
        geometry: sketchLeg(w.location, rally.location),
        minutes: walk,
        distanceKm: haversineKm(w.location, rally.location),
        source: "estimate",
        mode: "walk",
      });
    }
  }

  for (const c of chains) {
    const arrival = c.minute + estimateDriveMinutes(c.at, rally.location);
    const points = [c.driver.location, ...c.stops.map((s) => s.member.location), rally.location];
    let km = 0;
    for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
    routes.set(c.driver.id, {
      memberId: c.driver.id,
      geometry: sketchRoute(points),
      minutes: arrival,
      distanceKm: km,
      source: "estimate",
      mode: "drive",
      pickups: c.stops.map((s) => ({ memberId: s.member.id, atMinute: s.atMinute })),
    });
    for (const s of c.stops) {
      const r = routes.get(s.member.id);
      if (r) r.minutes = arrival;
    }
  }

  return members.map((m) => routes.get(m.id) ?? stranded(m));
}

function bestChain(chains: Chain[], rider: HouseholdMember, threat: ThreatField) {
  const doorBurns = threat.impactMinutesAt(rider.location);
  let best: { chain: Chain; pickupAt: number; cost: number } | null = null;
  for (const c of chains) {
    if (c.stops.length >= (SEATS[c.driver.role] ?? 3)) continue;
    const pickupAt = c.minute + estimateDriveMinutes(c.at, rider.location);
    if (pickupAt > doorBurns - PICKUP_MARGIN) continue;
    const cost = pickupAt + (c.driver.role === "volunteer" ? VOLUNTEER_PENALTY : 0);
    if (!best || cost < best.cost) best = { chain: c, pickupAt, cost };
  }
  return best;
}

function board(chain: Chain, rider: HouseholdMember, pickupAt: number) {
  chain.stops.push({ member: rider, atMinute: pickupAt });
  chain.minute = pickupAt + rider.mobilityMinutes;
  chain.at = rider.location;
}

function riderRoute(m: HouseholdMember, driverId: string, boardAtMinute: number): PlayRoute {
  return {
    memberId: m.id,
    geometry: [m.location],
    minutes: boardAtMinute,
    distanceKm: 0,
    source: "estimate",
    mode: "ride",
    driverId,
    boardAtMinute,
  };
}

function stranded(m: HouseholdMember): PlayRoute {
  return {
    memberId: m.id,
    geometry: [m.location],
    minutes: Infinity,
    distanceKm: 0,
    source: "estimate",
    mode: "stranded",
  };
}

/**
 * Re-time a set of routes after real road legs came back for the drivers.
 * `legMinutes[driverId]` holds one duration per leg of the driver's chain.
 */
export function applyRoadLegs(
  routes: PlayRoute[],
  members: HouseholdMember[],
  legs: Record<string, { minutes: number[]; geometry: LatLng[]; distanceKm: number }>,
): PlayRoute[] {
  const byId = new Map(members.map((m) => [m.id, m]));
  const out = routes.map((r) => ({ ...r }));
  const lookup = new Map(out.map((r) => [r.memberId, r]));

  for (const r of out) {
    const road = legs[r.memberId];
    if (!road) continue;
    const me = byId.get(r.memberId);
    if (!me) continue;

    if (r.mode === "walk") {
      r.geometry = road.geometry;
      r.distanceKm = road.distanceKm;
      r.minutes = walkMinutesForKm(road.distanceKm, me.mobilityMinutes);
      r.source = "osrm";
      continue;
    }
    if (r.mode !== "drive") continue;

    let t = me.mobilityMinutes;
    const pickups = r.pickups ?? [];
    const timed: { memberId: string; atMinute: number }[] = [];
    road.minutes.forEach((leg, i) => {
      t += leg;
      const stop = pickups[i];
      if (stop) {
        timed.push({ memberId: stop.memberId, atMinute: t });
        t += byId.get(stop.memberId)?.mobilityMinutes ?? 0;
      }
    });
    r.geometry = road.geometry;
    r.distanceKm = road.distanceKm;
    r.minutes = t;
    r.pickups = timed;
    r.source = "osrm";
    for (const stop of timed) {
      const rider = lookup.get(stop.memberId);
      if (rider) {
        rider.boardAtMinute = stop.atMinute;
        rider.minutes = t;
        rider.source = "osrm";
      }
    }
  }
  return out;
}
