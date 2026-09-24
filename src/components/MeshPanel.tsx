"use client";

import { CarFront, UserRound } from "lucide-react";
import type { Huddle } from "@/hooks/useHuddle";

/** Neighbors with empty seats claim the people no household car can reach. */
export default function MeshPanel({ h }: { h: Huddle }) {
  const { members, play, volunteers, claimed, you, setYou, actions } = h;
  const open = members.filter((m) => {
    const r = play.routes.find((x) => x.memberId === m.id);
    return r?.mode === "stranded" || (m.status === "needs-ride" && r?.mode !== "ride");
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-tape">
          <UserRound size={12} /> Neighbor mesh
        </p>
        <p className="mt-2 font-serif text-sm text-ash">
          Empty seats are infrastructure. Claim a car and the solver re-draws the play with that
          car in it.
        </p>
        <label className="mt-3 block font-mono text-[10px] uppercase tracking-wider text-ash">
          Your name
          <input
            value={you}
            onChange={(e) => setYou(e.target.value.slice(0, 30))}
            className="mt-1 w-full border border-bone/15 bg-peat-2 px-3 py-2 font-sans text-sm text-bone outline-none focus:ring-2 focus:ring-tape"
          />
        </label>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ember">
          Needs a seat · {open.length}
        </p>
        <ul className="mt-2 space-y-2">
          {open.length === 0 && (
            <li className="font-serif text-sm text-ash">Nobody stranded. Every rider has a car.</li>
          )}
          {open.map((m) => (
            <li key={m.id} className="border border-ember/40 bg-peat-2 p-3">
              <p className="font-medium">{m.name}</p>
              <p className="font-serif text-sm text-ash">{m.needs.join(" · ") || "ride"}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ember">
                front at door · {Math.round(h.threat.impactMinutesAt(m.location))} min
              </p>
              <button
                type="button"
                onClick={() => void actions.pulse(m, "need")}
                className="mt-2 cursor-pointer px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-tape ring-1 ring-tape/40 hover:bg-tape hover:text-peat"
              >
                Pulse NEED RIDE
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ice">
          <CarFront size={12} /> Cars with seats
        </p>
        <ul className="mt-2 space-y-2">
          {volunteers.map((v) => (
            <li key={v.id} className="border border-bone/10 bg-peat-2 p-3">
              <p className="font-medium">{v.name}</p>
              <p className="font-serif text-sm text-ash">{v.needs.join(" · ")}</p>
              <button
                type="button"
                onClick={() => actions.claim(v.id)}
                className="mt-2 cursor-pointer bg-ice px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-peat hover:bg-bone"
              >
                I&apos;m driving this car
              </button>
            </li>
          ))}
          {claimed.map((v) => {
            const r = play.routes.find((x) => x.memberId === v.id);
            const names = (r?.pickups ?? []).map(
              (p) => members.find((m) => m.id === p.memberId)?.name.split(" ")[0] ?? "",
            );
            return (
              <li key={v.id} className="border border-ice/40 bg-peat-2 p-3">
                <p className="font-medium">{v.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ice">
                  {names.length ? `collecting ${names.join(", ")}` : "in the play · no pickups needed"}
                </p>
                <button
                  type="button"
                  onClick={() => actions.release(v.id)}
                  className="mt-2 cursor-pointer px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ash ring-1 ring-bone/15 hover:text-bone"
                >
                  Release seat
                </button>
              </li>
            );
          })}
          {volunteers.length === 0 && claimed.length === 0 && (
            <li className="font-serif text-sm text-ash">No volunteers nearby yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
