"use client";

import { Check, Link2, LocateFixed, Printer, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import type { Huddle } from "@/hooks/useHuddle";

const LIVE = new Set(["open-meteo", "nws", "firms", "osrm", "osm"]);
const SCRIPTED = new Set(["scripted", "demo", "drill", "synthetic"]);

function tone(v: string) {
  const head = v.split(" ")[0];
  if (LIVE.has(head)) return "live";
  if (SCRIPTED.has(head)) return "scripted";
  return "off";
}

/** Scenario switcher, source chips, share link and fridge card. */
export default function ScenarioBar({ h }: { h: Huddle }) {
  const { scenario, sources, busy, notice, sharePath, actions } = h;
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/play${sharePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy your huddle link", url);
    }
  }

  const cardHref = `/card${sharePath}`;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-bone/10 px-4 py-2 md:px-6">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-tape" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone">{scenario.name}</span>
        {busy && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-ash">
            {busy === "scene" ? "loading scene…" : "routing roads…"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => void actions.resetDemo()}
          className={`cursor-pointer px-2 py-1 font-mono text-[10px] uppercase tracking-wider ring-1 ${
            scenario.kind === "demo" ? "bg-bone/10 text-bone ring-bone/20" : "text-ash ring-bone/15 hover:text-bone"
          }`}
        >
          Palisades
        </button>
        <button
          type="button"
          onClick={() => void actions.useMyLocation()}
          className="flex cursor-pointer items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ash ring-1 ring-bone/15 hover:text-bone"
        >
          <LocateFixed size={11} /> my location
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim().length >= 2) void actions.searchPlace(q.trim());
          }}
          className="flex items-center"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="any town on Earth"
            aria-label="Search a place"
            className="w-36 border border-bone/15 bg-peat-2 px-2 py-1 font-sans text-xs text-bone outline-none placeholder:text-ash/60 focus:ring-2 focus:ring-tape"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex h-[26px] w-7 cursor-pointer items-center justify-center bg-bone/10 text-ash hover:text-bone"
          >
            <Search size={12} />
          </button>
        </form>
        <button
          type="button"
          onClick={() => void actions.reload()}
          aria-label="Reload live data"
          className="flex h-[26px] w-7 cursor-pointer items-center justify-center text-ash ring-1 ring-bone/15 hover:text-bone"
        >
          <RefreshCw size={11} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => void copy()}
          className="flex cursor-pointer items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ice ring-1 ring-ice/30 hover:bg-ice hover:text-peat"
        >
          {copied ? <Check size={11} /> : <Link2 size={11} />} {copied ? "copied" : "share huddle"}
        </button>
        <a
          href={cardHref}
          className="flex cursor-pointer items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ash ring-1 ring-bone/15 hover:text-bone"
        >
          <Printer size={11} /> fridge card
        </a>
      </div>

      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.18em] text-ash">
        {(
          [
            ["hotspots", sources.fires],
            ["wind", sources.weather],
            ["alerts", sources.alerts],
            ["roads", sources.routes],
            ["lots", sources.places],
          ] as const
        ).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${tone(v) === "live" ? "bg-ice" : tone(v) === "scripted" ? "bg-tape/70" : "bg-ash/50"}`} />
            {k} <span className={tone(v) === "live" ? "text-ice" : tone(v) === "scripted" ? "text-tape/80" : ""}>{v}</span>
          </span>
        ))}
        {notice && <span className="text-tape normal-case tracking-normal">{notice}</span>}
      </div>
    </div>
  );
}
