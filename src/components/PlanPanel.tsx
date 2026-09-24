"use client";

import { Bell, ListOrdered, Radio, Shield } from "lucide-react";
import type { Huddle } from "@/hooks/useHuddle";

/** Plan text, the "why this lot" ranking, pulses and NWS alerts. */
export default function PlanPanel({ h }: { h: Huddle }) {
  const { plan, ranked, play, forcedRallyId, setForcedRallyId, members, pulses, alerts, actions } = h;
  const name = (id: string | null) => members.find((m) => m.id === id)?.name.split(" ")[0] ?? "";

  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-tape">
          <ListOrdered size={12} /> Why this lot
        </p>
        <table className="mt-2 w-full border-collapse text-xs">
          <thead>
            <tr className="font-mono text-[9px] uppercase tracking-wider text-ash">
              <th className="py-1 text-left font-normal">lot</th>
              <th className="py-1 text-right font-normal">front</th>
              <th className="py-1 text-right font-normal">last in</th>
              <th className="py-1 text-right font-normal">slack</th>
            </tr>
          </thead>
          <tbody>
            {ranked.slice(0, 6).map((c) => {
              const chosen = c.rally.id === play.rally.id;
              const forced = c.rally.id === forcedRallyId;
              return (
                <tr
                  key={c.rally.id}
                  onClick={() => setForcedRallyId(forced ? null : c.rally.id)}
                  title={c.verdict || "Chosen play"}
                  className={`cursor-pointer border-t border-bone/10 ${
                    chosen ? "bg-tape/10 text-bone" : "text-ash hover:text-bone"
                  }`}
                >
                  <td className="max-w-[9rem] truncate py-1.5 pr-2">
                    {chosen ? "★ " : ""}
                    {c.rally.name}
                    {forced && <span className="ml-1 font-mono text-[9px] uppercase text-tape">forced</span>}
                  </td>
                  <td className="py-1.5 text-right font-mono">{Math.round(c.impactMinutes)}</td>
                  <td className="py-1.5 text-right font-mono">
                    {Math.round(c.slowestMinutes)}
                    <span className="ml-1 text-[9px] text-ash">{name(c.slowestMemberId)}</span>
                  </td>
                  <td className={`py-1.5 text-right font-mono ${c.slackMinutes <= 0 ? "text-ember" : ""}`}>
                    {Math.round(c.slackMinutes)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-1 font-serif text-[11px] text-ash">
          Click a row to force that lot and watch the tape. Slack = front arrival − slowest person.
        </p>
      </div>

      <div>
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-tape">
          <Shield size={12} /> Household play · {plan.source}
        </p>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap border border-bone/10 bg-peat-2 p-3 font-serif text-[13px] leading-relaxed text-bone/90">
          {plan.text || "Drawing the huddle from wind, roads, and who still needs a ride…"}
        </pre>
      </div>

      <div>
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ice">
          <Radio size={12} /> SMS pulses
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => members.forEach((m) => void actions.pulse(m, "go"))}
            className="cursor-pointer bg-tape px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-peat hover:bg-bone"
          >
            Pulse GO to all
          </button>
          {play.routes
            .filter((r) => r.mode === "stranded")
            .map((r) => {
              const m = members.find((x) => x.id === r.memberId);
              return m ? (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void actions.pulse(m, "need")}
                  className="cursor-pointer px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ember ring-1 ring-ember/50 hover:bg-ember hover:text-bone"
                >
                  Mesh for {m.name.split(" ")[0]}
                </button>
              ) : null;
            })}
        </div>
        <ul className="mt-3 max-h-36 space-y-2 overflow-auto">
          {pulses.length === 0 && (
            <li className="font-serif text-sm text-ash">No pulses yet. GO texts keep people from waiting.</li>
          )}
          {pulses.map((p) => (
            <li key={p.id} className="border-l-2 border-tape pl-2 text-xs text-ash">
              <span className="font-mono uppercase text-tape">{p.status}</span> → {p.to}
              <p className="text-bone/80">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="border border-bone/10 p-3">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ash">
          <Bell size={12} /> NWS · {alerts.length} active
        </p>
        <ul className="mt-2 space-y-2">
          {alerts.slice(0, 3).map((a) => (
            <li key={a.id}>
              <p className="text-sm font-medium">{a.event}</p>
              <p className="font-serif text-xs text-ash">{a.headline}</p>
            </li>
          ))}
          {alerts.length === 0 && <li className="font-serif text-xs text-ash">No active alerts for this point.</li>}
        </ul>
      </div>
    </div>
  );
}
