"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { DEMO_FIRES, DEMO_HOUSEHOLD, DEMO_WEATHER, RALLY_CANDIDATES } from "@/lib/demo";
import { solveHuddle } from "@/lib/rally-solver";
import { synthesizeFires, syntheticCandidates } from "@/lib/scenario";
import { decodeHousehold } from "@/lib/share";
import { buildThreatField } from "@/lib/spread";
import type { HouseholdProfile } from "@/lib/types";
import TapeMark from "./TapeMark";

/**
 * A printable one-page card. Reads the shared household from the URL and
 * solves the play locally, so it works with zero network.
 */
export default function FridgeCard() {
  const params = useSearchParams();
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const household = useMemo<HouseholdProfile>(() => {
    const h = params.get("h");
    return (h ? decodeHousehold(h) : null) ?? DEMO_HOUSEHOLD;
  }, [params]);
  const center = useMemo(() => {
    const at = params.get("at");
    if (!at) return null;
    const [lat, lng] = at.split(",").map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }, [params]);
  const url = origin ? `${origin}/play${params.toString() ? `?${params.toString()}` : ""}` : "";

  const play = useMemo(() => {
    const fires = center ? synthesizeFires(center, DEMO_WEATHER) : DEMO_FIRES;
    const candidates = center ? syntheticCandidates(center, DEMO_WEATHER) : RALLY_CANDIDATES;
    const threat = buildThreatField(fires, DEMO_WEATHER, household.members[0].location);
    return solveHuddle({ members: household.members, candidates, threat });
  }, [household, center]);

  const name = (id?: string) => household.members.find((m) => m.id === id)?.name ?? "";

  return (
    <div className="fridge min-h-screen bg-bone px-6 py-8 text-peat">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between border-b-4 border-peat pb-3">
          <div className="flex items-center gap-3">
            <TapeMark className="h-4 w-16" />
            <span className="font-display text-3xl tracking-wide">RALLY</span>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden cursor-pointer bg-peat px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-bone"
          >
            Print
          </button>
        </header>

        <h1 className="mt-6 font-display text-5xl leading-none tracking-wide">
          {household.name.toUpperCase()}
        </h1>
        <p className="mt-2 font-serif text-lg">
          If there is smoke on the wind, nobody waits at home. Meet at:
        </p>
        <p className="mt-2 inline-block bg-tape px-3 py-1 font-display text-2xl tracking-wide">
          {play.rally.name}
        </p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-peat/70">
          fallback drill · {play.rally.location.lat.toFixed(4)}, {play.rally.location.lng.toFixed(4)}
        </p>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-peat font-mono text-[10px] uppercase tracking-wider">
              <th className="py-1 text-left font-normal">who</th>
              <th className="py-1 text-left font-normal">does</th>
              <th className="py-1 text-left font-normal">carries</th>
            </tr>
          </thead>
          <tbody>
            {household.members.map((m) => {
              const r = play.routes.find((x) => x.memberId === m.id);
              const does =
                r?.mode === "drive"
                  ? `Drives. ${r.pickups?.length ? `Collects ${r.pickups.map((p) => name(p.memberId)).join(", then ")}.` : "No pickups."}`
                  : r?.mode === "ride"
                    ? `Waits at the door for ${name(r.driverId)}. Bag by the door.`
                    : r?.mode === "walk"
                      ? "Walks. Does not go home first."
                      : r?.mode === "stranded"
                        ? "Needs a neighbor's car. Call the mesh first."
                        : "Already safe.";
              return (
                <tr key={m.id} className="border-b border-peat/20 align-top">
                  <td className="py-2 pr-2 font-medium">
                    {m.name}
                    <div className="font-mono text-[10px] uppercase text-peat/60">{m.role}</div>
                  </td>
                  <td className="py-2 pr-2 font-serif">{does}</td>
                  <td className="py-2 font-serif">{m.needs.filter((n) => !/ignore/i.test(n)).join(", ") || "go-bag"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]">House rules</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 font-serif text-sm">
              <li>Never reverse toward the fire to grab one more thing.</li>
              <li>{household.pets.length ? household.pets.join(", ") : "Pets"} leave in the first car.</li>
              <li>Text AT RALLY the second you arrive, so nobody hunts for you.</li>
              <li>Masks on if AQI &gt; 100. Windows up. Headlights on.</li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Live play</p>
            <p className="mt-1 break-all font-mono text-[11px] leading-snug">{url}</p>
            <p className="mt-2 font-serif text-sm">
              Open the link during a red flag warning. Rally re-draws this card against live wind and
              roads.
            </p>
          </div>
        </div>

        <p className="mt-8 border-t border-peat/30 pt-3 font-mono text-[9px] uppercase tracking-[0.2em] text-peat/60">
          Rally · household huddle for wildfire · Young Coders Sphere · SDG 11 · 13 · 3
        </p>
      </div>
    </div>
  );
}
