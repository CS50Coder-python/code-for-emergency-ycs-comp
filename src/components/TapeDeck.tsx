"use client";

import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useMemo } from "react";
import { composeCoachScript } from "@/lib/plan";
import { TAPE_LENGTH_MINUTES, tapeOutcomes, tapeVerdict } from "@/lib/tape";
import type { Huddle } from "@/hooks/useHuddle";

/** The scrubber. Plays the next 90 minutes and scores every member. */
export default function TapeDeck({ h }: { h: Huddle }) {
  const { tape, setTape, play, members, threat, household } = h;
  const outcomes = useMemo(() => tapeOutcomes(play, members, threat), [play, members, threat]);
  const verdict = tapeVerdict(outcomes);
  const fireAtRally = threat.impactMinutesAt(play.rally.location);
  const t = Math.round(tape.t);

  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      composeCoachScript({ household: { ...household, members }, play }),
    );
    u.rate = 1.02;
    u.pitch = 0.9;
    window.speechSynthesis.speak(u);
  }

  return (
    <section className="border border-bone/10 bg-peat-2 p-3" aria-label="Run the tape">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">Run the tape</p>
        <p className="font-mono text-[10px] uppercase tracking-wider text-ash">
          front at lot · {Math.round(fireAtRally)} min
        </p>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={tape.playing ? "Pause" : "Play"}
          onClick={() => setTape((s) => ({ ...s, playing: !s.playing, t: s.t >= TAPE_LENGTH_MINUTES ? 0 : s.t }))}
          className="flex h-9 w-9 cursor-pointer items-center justify-center bg-tape text-peat hover:bg-bone"
        >
          {tape.playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          aria-label="Rewind"
          onClick={() => setTape((s) => ({ ...s, t: 0, playing: false }))}
          className="flex h-9 w-9 cursor-pointer items-center justify-center text-ash ring-1 ring-bone/15 hover:text-bone"
        >
          <RotateCcw size={14} />
        </button>
        <div className="relative flex-1">
          <input
            type="range"
            min={0}
            max={TAPE_LENGTH_MINUTES}
            step={0.5}
            value={tape.t}
            aria-label="Minutes into the play"
            onChange={(e) => setTape((s) => ({ ...s, t: Number(e.target.value), playing: false }))}
            className="tape-range w-full"
          />
          <div
            className="pointer-events-none absolute top-1/2 h-3 w-px -translate-y-1/2 bg-ember"
            style={{ left: `${Math.min(100, (fireAtRally / TAPE_LENGTH_MINUTES) * 100)}%` }}
            title="Front reaches the rally"
          />
        </div>
        <p className="w-14 text-right font-display text-2xl leading-none text-bone">
          {t}
          <span className="ml-0.5 font-sans text-[10px] text-ash">m</span>
        </p>
      </div>

      <div className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ash">
        speed
        {[1, 3, 8].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTape((st) => ({ ...st, speed: s }))}
            className={`cursor-pointer px-2 py-0.5 ${tape.speed === s ? "bg-bone/15 text-bone" : "hover:text-bone"}`}
          >
            {s}×
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={speak}
            className="flex cursor-pointer items-center gap-1 px-2 py-0.5 text-ice ring-1 ring-ice/30 hover:bg-ice hover:text-peat"
          >
            <Volume2 size={11} /> coach
          </button>
        </span>
      </div>

      <p
        className={`mt-3 border-l-2 pl-2 font-serif text-sm leading-snug ${
          verdict.ok ? "border-ice text-bone/90" : "border-ember text-bone"
        }`}
      >
        {verdict.text}
      </p>

      <ul className="mt-2 space-y-1">
        {outcomes.map((o) => {
          const route = play.routes.find((r) => r.memberId === o.memberId);
          const arrived = Number.isFinite(o.arrivesAtMinute) && tape.t >= o.arrivesAtMinute;
          const label =
            route?.mode === "stranded"
              ? "stranded"
              : route?.mode === "arrived"
                ? "already there"
                : arrived
                  ? "at rally"
                  : route?.mode === "ride" && route.boardAtMinute !== undefined && tape.t < route.boardAtMinute
                    ? `waiting · car at ${Math.round(route.boardAtMinute)}m`
                    : route?.mode === "ride"
                      ? "riding"
                      : route?.mode === "walk"
                        ? "walking"
                        : "driving";
          return (
            <li key={o.memberId} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    !o.makesIt ? "bg-ember" : arrived ? "bg-tape" : "bg-ice"
                  }`}
                />
                <span className="font-medium text-bone">{o.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ash">{label}</span>
              </span>
              <span className={`font-mono text-[10px] ${o.makesIt ? "text-ash" : "text-ember"}`}>
                {Number.isFinite(o.arrivesAtMinute)
                  ? `${Math.round(o.arrivesAtMinute)}m · ${o.makesIt ? "+" : ""}${Math.round(o.marginMinutes)}`
                  : "no ride"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
