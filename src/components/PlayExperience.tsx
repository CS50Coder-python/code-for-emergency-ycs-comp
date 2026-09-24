"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Flag, Wind } from "lucide-react";
import { useHuddle } from "@/hooks/useHuddle";
import GoClock from "./GoClock";
import MeshPanel from "./MeshPanel";
import PlanPanel from "./PlanPanel";
import RosterPanel from "./RosterPanel";
import ScenarioBar from "./ScenarioBar";
import TapeDeck from "./TapeDeck";
import TapeMark from "./TapeMark";

const PlayboardMap = dynamic(() => import("./PlayboardMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-peat-2" />,
});

export default function PlayExperience({ volunteer = false }: { volunteer?: boolean }) {
  const h = useHuddle();
  const { play, members, weather, threat, tape, editing, placing, actions } = h;
  const stranded = play.routes.filter((r) => r.mode === "stranded").length;

  return (
    <div className="min-h-screen bg-peat text-bone">
      <header className="flex items-center justify-between gap-4 border-b border-bone/10 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <TapeMark className="h-4 w-16" />
          <span className="font-display text-2xl tracking-wide">RALLY</span>
        </Link>
        <nav className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-ash">
          <Link href="/play" className={volunteer ? "hover:text-tape" : "text-tape"}>
            Huddle
          </Link>
          <Link href="/mesh" className={volunteer ? "text-tape" : "hover:text-tape"}>
            Mesh{stranded > 0 && !volunteer ? <span className="ml-1 rounded-full bg-ember px-1.5 text-bone">{stranded}</span> : null}
          </Link>
        </nav>
      </header>

      <ScenarioBar h={h} />

      <div className="grid lg:grid-cols-[minmax(290px,350px)_minmax(0,1fr)_minmax(300px,380px)]">
        <aside className="space-y-4 border-b border-bone/10 p-4 lg:h-[calc(100vh-113px)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <GoClock minutes={play.goWindowMinutes} threat={play.threat} stranded={stranded} />
          <TapeDeck h={h} />
          <RosterPanel h={h} />
        </aside>

        <section className="relative min-h-[62vh] lg:h-[calc(100vh-113px)]">
          <PlayboardMap
            members={members}
            fires={h.fires}
            play={play}
            weather={weather}
            threat={threat}
            candidates={h.candidates}
            forcedRallyId={h.forcedRallyId}
            onPickRally={h.setForcedRallyId}
            tapeT={tape.t}
            editing={editing}
            placing={placing}
            onPlace={actions.placeMember}
            onDrag={(id, p) => actions.updateMember(id, { location: p })}
            fitKey={`${h.scenario.id}:${h.sceneVersion}`}
          />
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-[min(22rem,calc(100%-2rem))] flex-col gap-2">
            <div className="pointer-events-auto bg-peat/90 px-3 py-2 ring-1 ring-tape backdrop-blur">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-tape">
                <Flag size={12} /> Playboard
                {h.forcedRallyId && (
                  <button
                    type="button"
                    onClick={() => h.setForcedRallyId(null)}
                    className="ml-auto cursor-pointer text-ash hover:text-bone"
                  >
                    forced · clear
                  </button>
                )}
              </p>
              <p className="mt-1 font-serif text-sm leading-snug">{play.rationale}</p>
            </div>
            <div className="pointer-events-auto flex flex-wrap items-center gap-x-2 gap-y-1 bg-peat/90 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-ash ring-1 ring-bone/15 backdrop-blur">
              <Wind size={12} className="text-tape" />
              {Math.round(weather.windKph)} kph
              {weather.gustKph ? ` (gust ${Math.round(weather.gustKph)})` : ""} from {Math.round(weather.windDeg)}° ·
              RH {weather.humidity}% · AQI {weather.aqi ?? "—"} · head fire {threat.headRosKmh.toFixed(1)} km/h
            </div>
            {placing && (
              <div className="pointer-events-auto bg-tape px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-peat">
                Click the map to place {members.find((m) => m.id === placing)?.name ?? "them"}
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 flex gap-3 font-mono text-[9px] uppercase tracking-[0.18em] text-ash">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-ember" /> hotspot / front</span>
            <span className="flex items-center gap-1"><i className="h-px w-3 bg-ember" /> arrival rings</span>
            <span className="flex items-center gap-1"><i className="h-px w-3 bg-ice" /> car</span>
            <span className="flex items-center gap-1"><i className="h-px w-3 border-t border-dashed border-ice" /> foot</span>
          </div>
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              type="button"
              onClick={() => h.setTape((s) => ({ ...s, t: 0, playing: true }))}
              className="cursor-pointer bg-tape px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-peat hover:bg-bone"
            >
              {tape.playing ? "Running…" : "Run the tape"}
            </button>
          </div>
        </section>

        <aside className="space-y-4 border-t border-bone/10 p-4 lg:h-[calc(100vh-113px)] lg:overflow-y-auto lg:border-l lg:border-t-0">
          {volunteer ? <MeshPanel h={h} /> : <PlanPanel h={h} />}
        </aside>
      </div>
    </div>
  );
}
