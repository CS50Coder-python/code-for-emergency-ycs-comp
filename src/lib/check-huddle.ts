/**
 * Zero-dependency checks for the pure simulation core.
 * Run with `npm test`. Every check throws on failure; the last line prints ok.
 */
import { DEMO_FIRES, DEMO_HOUSEHOLD, DEMO_VOLUNTEERS, DEMO_WEATHER, RALLY_CANDIDATES } from "./demo";
import { haversineKm } from "./geo";
import { rankCandidates, rescorePlay, solveHuddle } from "./rally-solver";
import { householdAround, synthesizeFires, syntheticCandidates } from "./scenario";
import { decodeHousehold, encodeHousehold } from "./share";
import { buildThreatField, ISOCHRONE_MINUTES } from "./spread";
import { along, positionAt, tapeOutcomes, tapeVerdict } from "./tape";

function check(cond: unknown, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ok  ${msg}`);
}

const threat = buildThreatField(DEMO_FIRES, DEMO_WEATHER, DEMO_HOUSEHOLD.members[0].location);
const play = solveHuddle({
  members: DEMO_HOUSEHOLD.members,
  candidates: RALLY_CANDIDATES,
  threat,
});

console.log("solver");
check(play.rally.name, "solver picks a rally point");
check(play.routes.length === DEMO_HOUSEHOLD.members.length, "one route per member");
check(play.slackMinutes > 0, `Palisades play has positive slack (${play.goWindowMinutes} min)`);
check(/mesh seat for Rosa/.test(play.rationale), "rationale names who is stranded and asks for the mesh");

const ranked = rankCandidates({
  members: DEMO_HOUSEHOLD.members,
  candidates: RALLY_CANDIDATES,
  threat,
});
check(ranked[0].rally.id === play.rally.id, "ranking winner matches the solved play");
check(ranked.slice(1).every((c) => c.verdict.length > 0), "every loser has a verdict");
check(
  ranked.every((c, i) => i === 0 || ranked[i - 1].score >= c.score),
  "candidates sorted by score",
);

console.log("spread");
const nearFire = threat.impactMinutesAt(DEMO_FIRES[0].location);
const farAway = threat.impactMinutesAt({ lat: 34.0, lng: -118.45 });
check(nearFire < farAway, "arrival is sooner next to the fire than far away");
check(threat.isochrones.length === ISOCHRONE_MINUTES.length, "one isochrone per horizon");
const radii = threat.isochrones.map(
  (iso) =>
    iso.ring.reduce((s, p) => s + haversineKm(p, DEMO_FIRES[0].location), 0) / iso.ring.length,
);
check(radii.every((r, i) => i === 0 || r >= radii[i - 1]), "isochrone rings grow with time");
check(
  threat.isochrones.every((iso) =>
    iso.ring.every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
  ),
  "rings are finite",
);

console.log("tape");
const route = play.routes[0];
const start = positionAt(play.routes, DEMO_HOUSEHOLD.members, "maya", 0);
const end = positionAt(play.routes, DEMO_HOUSEHOLD.members, "maya", 999);
check(haversineKm(start, DEMO_HOUSEHOLD.members[0].location) < 0.01, "tape starts at home");
check(haversineKm(end, play.rally.location) < 0.01, "tape ends at the rally");
check(haversineKm(along(route.geometry, 0.5), start) > 0, "midpoint has moved");
const outcomes = tapeOutcomes(play, DEMO_HOUSEHOLD.members, threat);
const rosa = play.routes.find((r) => r.memberId === "abuela");
check(rosa?.mode === "stranded", "no household car beats the front to Rosa");
check(!tapeVerdict(outcomes).ok && /mesh/i.test(tapeVerdict(outcomes).text), "verdict asks for a mesh seat");
const maya = play.routes.find((r) => r.memberId === "maya");
check(maya?.mode === "drive" && (maya.pickups?.length ?? 0) === 2, "Maya runs a two-stop pickup chain");
check(play.routes.find((r) => r.memberId === "leon")?.mode === "ride", "Leon rides with Maya");

const withDev = [...DEMO_HOUSEHOLD.members, DEMO_VOLUNTEERS[0]];
const rescue = solveHuddle({ members: withDev, candidates: RALLY_CANDIDATES, threat });
const rescueOutcomes = tapeOutcomes(rescue, withDev, threat);
check(rescueOutcomes.every((o) => o.makesIt), "claiming Dev gets everyone to the rally");
check(
  rescue.routes.find((r) => r.memberId === "vol-dev")?.pickups?.some((p) => p.memberId === "abuela"),
  "the volunteer collects Rosa",
);
const boarded = positionAt(rescue.routes, withDev, "abuela", 60);
check(haversineKm(boarded, rescue.rally.location) < 0.05, "Rosa rides to the rally on the tape");
const waiting = positionAt(rescue.routes, withDev, "abuela", 2);
check(haversineKm(waiting, DEMO_HOUSEHOLD.members[2].location) < 0.01, "Rosa waits at her door until the car arrives");
const rescored = rescorePlay(
  { ...play, routes: play.routes.map((r) => ({ ...r, minutes: 500 })) },
  threat,
);
check(
  rescored.goWindowMinutes === 0 && rescored.slackMinutes < 0,
  "late routes collapse the window",
);

console.log("share");
const token = encodeHousehold(DEMO_HOUSEHOLD);
check(!/[+/=]/.test(token), "token is URL safe");
const back = decodeHousehold(token);
check(back?.members.length === 4 && back.members[2].name === "Rosa", "household round-trips");
check(decodeHousehold("not-a-token") === null, "garbage decodes to null");

console.log("scenario");
const live = { lat: 37.7749, lng: -122.4194 };
const fires = synthesizeFires(live, DEMO_WEATHER);
const liveThreat = buildThreatField(fires, DEMO_WEATHER, live);
const liveHouse = householdAround(live);
const livePlay = solveHuddle({
  members: liveHouse.members,
  candidates: syntheticCandidates(live, DEMO_WEATHER),
  threat: liveThreat,
});
check(fires.length === 3 && haversineKm(fires[0].location, live) > 5, "drill fire staged upwind");
check(livePlay.routes.length === 4, "live scenario solves with synthetic lots");

console.log(`\nok huddle @ ${play.rally.id} window ${play.goWindowMinutes}m`);
