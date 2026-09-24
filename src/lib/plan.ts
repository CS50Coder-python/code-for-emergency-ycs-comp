import type { HouseholdProfile, HuddlePlay, NwsAlert, WeatherNow } from "./types";

export function composePlan(opts: {
  household: HouseholdProfile;
  play: HuddlePlay;
  weather: WeatherNow;
  alerts: NwsAlert[];
  modelText?: string;
}) {
  if (opts.modelText) return opts.modelText;
  const { household, play, weather, alerts } = opts;
  const alertLine = alerts[0]?.headline ?? "No NWS headline. Still treat wind as the threat.";
  const drivers = household.members.filter((m) => m.role === "driver");
  const rideNeeders = household.members.filter(
    (m) => m.status === "needs-ride" || m.role === "homebound",
  );
  const tasks = household.members
    .map((m) => {
      const route = play.routes.find((r) => r.memberId === m.id);
      const verb =
        m.role === "driver"
          ? "Drive"
          : m.status === "needs-ride" || m.role === "homebound"
            ? "Wait for the assigned ride, then move"
            : m.role === "school"
              ? "Stay put until pickup, then move"
              : "Move";
      const carry = m.needs.filter((n) => !/ignore/i.test(n)).join(", ") || "go-bag";
      return `• ${m.name}: ${verb} toward ${play.rally.name} (${Math.round(route?.minutes ?? 0)} min). Carry: ${carry}.`;
    })
    .join("\n");

  const rideRule = rideNeeders.length
    ? household.vehicles < 2
      ? `One vehicle. ${drivers[0]?.name ?? "The driver"} takes ${rideNeeders.map((m) => m.name).join(" and ")} first; the neighbor mesh covers anyone left.`
      : `Use every vehicle. ${rideNeeders.map((m) => m.name).join(" and ")} ride in the first car out.`
    : "Use every vehicle. No empty seats.";

  return `RALLY PLAY — ${household.name.toUpperCase()}
Window: ${play.goWindowMinutes} minutes before the modeled arrival.
Rally: ${play.rally.name}
Wind: ${Math.round(weather.windKph)} km/h from ${Math.round(weather.windDeg)}° · RH ${weather.humidity}% · AQI ${weather.aqi ?? "n/a"}
Alert: ${alertLine}

WHY THIS PLAY
${play.rationale}

THE HUDDLE
${tasks}

HOUSE RULES
• Do not reverse toward the fire to grab one more thing.
• ${household.pets.length ? household.pets.join(", ") : "Pets"} ${household.pets.length === 1 ? "leaves" : "leave"} in the first car, not a second trip.
• ${rideRule}
• Masks on if AQI > 100. Windows up. Headlights on even in daytime smoke.

AFTER YOU MEET
Keep moving away from the wind toward civic staging. Pulse "AT RALLY" so the mesh stops hunting you.`;
}

/** Short spoken version for the coach voice. */
export function composeCoachScript(opts: { household: HouseholdProfile; play: HuddlePlay }) {
  const { household, play } = opts;
  const slow = [...play.routes].sort((a, b) => b.minutes - a.minutes)[0];
  const who = household.members.find((m) => m.id === slow?.memberId)?.name ?? "the slowest";
  const window =
    play.goWindowMinutes > 0
      ? `You have ${play.goWindowMinutes} minutes of slack.`
      : "There is no slack. Move now.";
  return `${household.name}, this is Rally. Meet at ${play.rally.name}. ${window} ${who} is the clock at ${Math.round(slow?.minutes ?? 0)} minutes. Nobody waits at home. Pulse when you arrive.`;
}
