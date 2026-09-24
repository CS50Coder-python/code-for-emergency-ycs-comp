"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CarFront, Clapperboard, Globe2, Radio, Share2, Wind } from "lucide-react";
import { DEMO_FIRES, DEMO_HOUSEHOLD, DEMO_VOLUNTEERS, DEMO_WEATHER, RALLY_CANDIDATES } from "@/lib/demo";
import { windOffset } from "@/lib/geo";
import { rankCandidates, solveHuddle } from "@/lib/rally-solver";
import { buildThreatField } from "@/lib/spread";
import EmberField from "./EmberField";
import TapeMark from "./TapeMark";

export default function Landing() {
  const demo = useMemo(() => {
    const threat = buildThreatField(DEMO_FIRES, DEMO_WEATHER, DEMO_HOUSEHOLD.members[0].location);
    const play = solveHuddle({ members: DEMO_HOUSEHOLD.members, candidates: RALLY_CANDIDATES, threat });
    const ranked = rankCandidates({ members: DEMO_HOUSEHOLD.members, candidates: RALLY_CANDIDATES, threat });
    const rescued = solveHuddle({
      members: [...DEMO_HOUSEHOLD.members, DEMO_VOLUNTEERS[0]],
      candidates: RALLY_CANDIDATES,
      threat,
    });
    const driver = play.routes.find((r) => r.mode === "drive");
    const stranded = play.routes.filter((r) => r.mode === "stranded");
    const name = (id?: string) => DEMO_HOUSEHOLD.members.find((m) => m.id === id)?.name ?? "";
    return {
      play,
      ranked,
      rescued,
      chain: driver?.pickups?.map((p) => name(p.memberId)) ?? [],
      driverName: name(driver?.memberId),
      strandedNames: stranded.map((r) => name(r.memberId)),
      front: Math.round(threat.impactMinutesAt(play.rally.location)),
    };
  }, []);

  return (
    <div className="min-h-screen bg-peat text-bone">
      <header className="relative z-10 flex items-center justify-between px-5 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <TapeMark className="h-4 w-16" />
          <span className="font-display text-3xl tracking-wide">RALLY</span>
        </div>
        <Link
          href="/play"
          className="cursor-pointer bg-tape px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-peat hover:bg-bone"
        >
          Run the huddle
        </Link>
      </header>

      <section className="relative overflow-hidden">
        <EmberField
          bearing={windOffset(DEMO_WEATHER.windDeg)}
          density={140}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,transparent_20%,#161310_75%)]" />
        <div className="relative grid items-center gap-10 px-5 py-10 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div>
            <p className="rise font-mono text-[11px] uppercase tracking-[0.32em] text-tape">
              Wildfire · household huddle engine
            </p>
            <h1 className="rise rise-2 mt-4 max-w-xl font-display text-[clamp(3.2rem,9vw,7.5rem)] leading-[0.86] tracking-wide">
              DON&apos;T WAIT
              <br />
              FOR EACH
              <br />
              OTHER.
            </h1>
            <p className="rise rise-3 mt-6 max-w-lg font-serif text-xl leading-snug text-bone/85">
              People don&apos;t die in wildfires because they missed the alert. They die because a
              family waits in the driveway. Rally draws the play: one meeting point, pickup chains
              on real roads, a go-window against the wind, and a neighbor&apos;s empty seat for
              whoever no car can reach.
            </p>
            <div className="rise rise-3 mt-8 flex flex-wrap gap-3">
              <Link
                href="/play"
                className="flex cursor-pointer items-center gap-2 bg-tape px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-peat hover:bg-bone"
              >
                Palisades demo <ArrowRight size={14} />
              </Link>
              <Link
                href="/mesh"
                className="cursor-pointer px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-ice ring-1 ring-ice/50 hover:bg-ice hover:text-peat"
              >
                Neighbor mesh
              </Link>
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ash">
              Zero keys needed · SDG 11 cities · SDG 13 climate · SDG 3 health
            </p>
          </div>
          <PlaySketch />
        </div>
      </section>

      <section className="grid gap-px bg-bone/10 md:grid-cols-4">
        {[
          ["Go window", `${demo.play.goWindowMinutes} min`, `front reaches the lot in ${demo.front} min`],
          ["Pickup chain", demo.chain.length ? `${demo.driverName} → ${demo.chain.join(" → ")}` : demo.driverName, "one sedan, real roads"],
          ["Stranded", demo.strandedNames.join(", ") || "nobody", "no household car beats the front"],
          ["After mesh claim", `${demo.rescued.goWindowMinutes} min · all in`, "a neighbor's SUV closes the gap"],
        ].map(([k, v, d]) => (
          <div key={k} className="bg-peat px-6 py-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">{k}</p>
            <p className="mt-1 font-display text-2xl leading-tight tracking-wide">{v}</p>
            <p className="mt-1 font-serif text-sm text-ash">{d}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-px bg-bone/10 md:grid-cols-3">
        {[
          {
            icon: <Wind size={14} />,
            k: "01  The field",
            t: "Wind is the defense.",
            d: "NASA FIRMS hotspots and Open-Meteo wind feed a Rothermel-style spread model. Arrival rings show when the front reaches every door and every lot.",
          },
          {
            icon: <CarFront size={14} />,
            k: "02  The play",
            t: "Every car runs a chain.",
            d: "Drivers collect the kid at school and grandma at home in the order the fire dictates. OSRM times the legs. The slowest person is the clock.",
          },
          {
            icon: <Radio size={14} />,
            k: "03  The mesh",
            t: "Empty seats are infrastructure.",
            d: "Anyone no car can reach is flagged stranded. A neighbor claims the seat, the solver re-draws, and SMS pulses stop the hunt.",
          },
        ].map((c) => (
          <article key={c.k} className="bg-peat p-8">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-tape">
              {c.icon} {c.k}
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-wide">{c.t}</h2>
            <p className="mt-3 font-serif text-lg text-ash">{c.d}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-10 px-5 py-16 md:px-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <h2 className="font-display text-5xl tracking-wide md:text-7xl">
            HOW RALLY
            <br />
            PICKS A LOT.
          </h2>
          <p className="mt-6 max-w-lg font-serif text-lg leading-relaxed text-bone/85">
            Every candidate gets one number: <span className="text-tape">slack</span>, the minutes
            between the last person arriving and the front arriving. Lots inside the 45-minute ring
            are penalised even when the slack is positive. A stranded person costs thirty. The
            winner is the lot with the most slack left for the slowest member, not the closest one.
          </p>
          <pre className="mt-6 max-w-lg overflow-auto border border-bone/10 bg-peat-2 p-4 font-mono text-[12px] leading-relaxed text-bone/80">
{`slack   = arrival(front, lot) − max(arrival(member, lot))
score   = slack − 22·threat(lot) + 6·[civic or lot] − 30·stranded
chain   = driver → nearest urgent door → … → lot
stranded= no car reaches the door 3 min before the front`}
          </pre>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Tonight&apos;s ranking · Palisades demo</p>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-wider text-ash">
                <th className="py-1 text-left font-normal">lot</th>
                <th className="py-1 text-right font-normal">front</th>
                <th className="py-1 text-right font-normal">last in</th>
                <th className="py-1 text-right font-normal">slack</th>
              </tr>
            </thead>
            <tbody>
              {demo.ranked.map((c, i) => (
                <tr key={c.rally.id} className={`border-t border-bone/10 ${i === 0 ? "text-bone" : "text-ash"}`}>
                  <td className="py-2 pr-2">
                    {i === 0 ? "★ " : ""}
                    {c.rally.name}
                    <div className="font-serif text-xs text-ash">{c.verdict || "Chosen play"}</div>
                  </td>
                  <td className="py-2 text-right font-mono">{Math.round(c.impactMinutes)}</td>
                  <td className="py-2 text-right font-mono">{Math.round(c.slowestMinutes)}</td>
                  <td className={`py-2 text-right font-mono ${c.slackMinutes <= 0 ? "text-ember" : ""}`}>
                    {Math.round(c.slackMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-px bg-bone/10 md:grid-cols-3">
        {[
          {
            icon: <Clapperboard size={14} />,
            t: "Run the tape",
            d: "Scrub the next 90 minutes. The front grows ring by ring, every person moves along their real route, riders wait at the door until their car shows, and the scorecard says who makes it by how many minutes.",
          },
          {
            icon: <Globe2 size={14} />,
            t: "Anywhere on Earth",
            d: "Use your location or search a town. Live wind stages a drill fire upwind, OpenStreetMap supplies real schools and lots as rally candidates, NWS alerts filter to that exact point.",
          },
          {
            icon: <Share2 size={14} />,
            t: "Your household, one link",
            d: "Add people, drag them to where they really are, set who drives and who needs a ride. Share the huddle as a link, print the fridge card, install it as an app.",
          },
        ].map((c) => (
          <article key={c.t} className="bg-peat p-8">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-ice">
              {c.icon} {c.t}
            </p>
            <p className="mt-3 font-serif text-lg text-bone/85">{c.d}</p>
          </article>
        ))}
      </section>

      <section className="px-5 py-16 md:px-10">
        <h2 className="font-display text-5xl tracking-wide md:text-7xl">
          WHY THIS ISN&apos;T
          <br />
          ANOTHER FIRE MAP.
        </h2>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <p className="font-serif text-lg leading-relaxed text-bone/85">
            Maps show heat. Rally solves the reunion. It knows that Rosa cannot drive, that Leon is
            behind a school gate, that Samir has no car, and that one sedan cannot be in two canyons
            at once. It answers the only question a family asks in smoke: where do we meet, who gets
            whom, and how long do we have.
          </p>
          <p className="font-serif text-lg leading-relaxed text-bone/85">
            Judges can click once. Demo data boots if keys are missing. Live weather, alerts, places
            and routing still run on free APIs. Twilio and an LLM key upgrade the same buttons.
            Feasible tonight, global tomorrow: any FIRMS scene, any household roster, any town.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/play"
            className="flex cursor-pointer items-center gap-2 bg-tape px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-peat hover:bg-bone"
          >
            Open the playboard <ArrowRight size={14} />
          </Link>
          <Link
            href="/card"
            className="cursor-pointer px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-ash ring-1 ring-bone/20 hover:text-bone"
          >
            Print the fridge card
          </Link>
        </div>
      </section>

      <footer className="border-t border-bone/10 px-5 py-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ash md:px-10">
        Built for Young Coders Sphere · Code for Emergency · Data: NASA FIRMS · Open-Meteo · NWS ·
        OpenStreetMap · OSRM · CARTO
      </footer>
    </div>
  );
}

function PlaySketch() {
  return (
    <div className="relative aspect-square w-full max-w-xl justify-self-center overflow-hidden bg-peat-2/80 ring-1 ring-tape backdrop-blur-sm">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,#EFE7D622_1px,transparent_1px),linear-gradient(to_bottom,#EFE7D622_1px,transparent_1px)] [background-size:28px_28px]" />
      <svg viewBox="0 0 400 400" className="relative h-full w-full">
        <ellipse cx="110" cy="80" rx="120" ry="60" transform="rotate(-25 110 80)" fill="#E11D74" opacity="0.12" stroke="#E11D74" strokeDasharray="4 8" />
        <ellipse cx="110" cy="80" rx="70" ry="34" transform="rotate(-25 110 80)" fill="#E11D74" opacity="0.18" stroke="#E11D74" />
        <circle cx="70" cy="60" r="9" fill="#E11D74" />
        <text x="150" y="150" fill="#E11D74" fontSize="10" fontFamily="ui-monospace">45 MIN RING</text>
        <path d="M330 300 C 300 260, 270 230, 232 188" fill="none" stroke="#5EEAD4" strokeWidth="3" className="draw" />
        <path d="M330 300 C 340 240, 330 130, 310 80" fill="none" stroke="#5EEAD4" strokeWidth="3" className="draw" />
        <path d="M310 80 C 250 90, 200 130, 232 188" fill="none" stroke="#5EEAD4" strokeWidth="3" className="draw" />
        <path d="M90 310 C 140 280, 180 220, 232 188" fill="none" stroke="#5EEAD4" strokeWidth="3" strokeDasharray="8 6" className="draw" />
        <circle cx="232" cy="188" r="14" fill="#F4C430" />
        <circle cx="330" cy="300" r="8" fill="#5EEAD4" />
        <circle cx="310" cy="80" r="8" fill="#F4C430" stroke="#5EEAD4" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="90" cy="310" r="8" fill="#5EEAD4" />
        <circle cx="70" cy="170" r="8" fill="#E11D74" />
        <circle cx="70" cy="170" r="14" fill="none" stroke="#E11D74" strokeDasharray="3 3" />
        <text x="244" y="184" fill="#161310" fontSize="9" fontWeight="700">MEET</text>
        <text x="86" y="200" fill="#E11D74" fontSize="9" fontFamily="ui-monospace">STRANDED → MESH</text>
        <text x="322" y="66" fill="#5EEAD4" fontSize="9" fontFamily="ui-monospace">PICKUP</text>
      </svg>
      <p className="absolute bottom-3 left-3 right-3 font-mono text-[10px] uppercase tracking-[0.2em] text-tape">
        One sedan. Two pickups. One lot. One neighbor closes the gap.
      </p>
    </div>
  );
}
