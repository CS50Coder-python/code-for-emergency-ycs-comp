import { buildRoutes } from "./chains";
import type { ThreatField } from "./spread";
import type {
  CandidateScore,
  HouseholdMember,
  HuddlePlay,
  PlayRoute,
  RallyCandidate,
} from "./types";

export {
  estimateDriveMinutes,
  estimateWalkMinutes,
  sketchLeg as sketchRoute,
} from "./chains";

/** Minutes charged for a stranded member so the play still ranks. */
const STRANDED_PENALTY = 90;

/** The moving member who reaches the lot last. Stranded members are scored separately. */
function slowestOf(routes: PlayRoute[]) {
  let slowest: PlayRoute | null = null;
  for (const r of routes) {
    if (r.mode === "arrived" || r.mode === "stranded") continue;
    if (!slowest || r.minutes > slowest.minutes) slowest = r;
  }
  return slowest;
}

function effective(r: PlayRoute) {
  return r.mode === "stranded" ? STRANDED_PENALTY : r.minutes;
}

/**
 * Score every candidate. Slack = fire arrival at the lot minus the slowest
 * member's travel time. A lot the fire reaches soon is penalised even when
 * the slack is positive, and civic lots get a small bonus for services.
 */
export function rankCandidates(opts: {
  members: HouseholdMember[];
  candidates: RallyCandidate[];
  threat: ThreatField;
  routes?: PlayRoute[];
}): CandidateScore[] {
  const { members, candidates, threat } = opts;
  const scored = candidates.map((rally) => {
    const impactMinutes = threat.impactMinutesAt(rally.location);
    const rs = buildRoutes(members, rally, threat);
    const slowest = slowestOf(rs);
    const slowestMinutes = slowest ? effective(slowest) : 0;
    const stranded = rs.filter((r) => r.mode === "stranded").length;
    const slackMinutes = impactMinutes - slowestMinutes;
    const threatScore = Math.max(0, 1 - impactMinutes / 180);
    const bonus = rally.kind === "lot" || rally.kind === "civic" ? 6 : 0;
    const score = slackMinutes - threatScore * 22 + bonus - stranded * 30;
    return {
      rally,
      impactMinutes,
      slowestMinutes,
      slowestMemberId: slowest?.memberId ?? null,
      slackMinutes,
      score,
      verdict: "",
    };
  });
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  for (const c of scored) {
    if (c === winner) continue;
    c.verdict = verdictFor(c, winner, members);
  }
  return scored;
}

function verdictFor(c: CandidateScore, winner: CandidateScore, members: HouseholdMember[]) {
  const who = members.find((m) => m.id === c.slowestMemberId)?.name ?? "someone";
  if (c.slackMinutes <= 0) {
    return `Fire beats ${who} there by ${Math.round(-c.slackMinutes)} min.`;
  }
  if (c.impactMinutes < 45) {
    return `Inside the ${Math.round(c.impactMinutes)}-min arrival zone. Too hot to hold.`;
  }
  const diff = winner.slackMinutes - c.slackMinutes;
  if (diff > 0) return `${Math.round(diff)} min less slack for ${who}.`;
  return "Farther for the group with no service bonus.";
}

export function solveHuddle(opts: {
  members: HouseholdMember[];
  candidates: RallyCandidate[];
  threat: ThreatField;
}): HuddlePlay {
  const { members, candidates, threat } = opts;
  if (!candidates.length) {
    throw new Error("solveHuddle needs at least one rally candidate");
  }
  const ranked = rankCandidates(opts);
  const best = ranked[0];
  const routes = buildRoutes(members, best.rally, threat);
  const play: HuddlePlay = {
    rally: best.rally,
    goWindowMinutes: Math.max(0, Math.round(best.slackMinutes)),
    slackMinutes: best.slackMinutes,
    routes,
    threat: Math.max(0, 1 - best.impactMinutes / 180),
    rationale: "",
  };
  play.rationale = rationale(play, members, best.impactMinutes, ranked);
  return play;
}

/** Recompute slack after routes were replaced by real road timings. */
export function rescorePlay(play: HuddlePlay, threat: ThreatField): HuddlePlay {
  const slowest = slowestOf(play.routes);
  const impact = threat.impactMinutesAt(play.rally.location);
  const slack = impact - (slowest ? effective(slowest) : 0);
  return {
    ...play,
    slackMinutes: slack,
    goWindowMinutes: Math.max(0, Math.round(slack)),
    threat: Math.max(0, 1 - impact / 180),
  };
}

function rationale(
  play: HuddlePlay,
  members: HouseholdMember[],
  impact: number,
  ranked: CandidateScore[],
) {
  const name = (id?: string | null) => members.find((m) => m.id === id)?.name ?? "someone";
  const stranded = play.routes.filter((r) => r.mode === "stranded");
  if (stranded.length) {
    const names = stranded.map((r) => name(r.memberId)).join(" and ");
    return `${play.rally.name} works for everyone except ${names}: no household car can beat the front to that door. Claim a mesh seat for ${names} now.`;
  }
  const slow = slowestOf(play.routes);
  const who = name(slow?.memberId);
  const runnerUp = ranked[1];
  const beat = runnerUp
    ? ` It beats ${runnerUp.rally.name} by ${Math.max(1, Math.round(play.slackMinutes - runnerUp.slackMinutes))} min of slack.`
    : "";
  if (play.slackMinutes <= 0) {
    return `No lot gives everyone time. ${play.rally.name} loses the least: ${who} arrives ${Math.round(-play.slackMinutes)} min after the modeled front. Leave now.`;
  }
  const driver = play.routes.find((r) => r.mode === "drive" && r.pickups?.length);
  const chain = driver?.pickups?.length
    ? ` ${name(driver.memberId)} collects ${driver.pickups.map((p) => name(p.memberId)).join(", then ")} on the way.`
    : "";
  return `${play.rally.name} is where the whole household converges before the downwind arrival (~${Math.round(impact)} min).${beat}${chain} ${who} is the clock: ${Math.round(slow?.minutes ?? 0)} min out. Do not wait at home.`;
}
