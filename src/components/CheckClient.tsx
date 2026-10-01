"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Gauge from "./Gauge";
import { COLORS } from "@/lib/colors";
import { buildChecklist, type Household } from "@/lib/checklist";
import { compass } from "@/lib/geo";
import { t, tm, hoursText, type Lang } from "@/lib/i18n";
import type { Hotspot } from "@/lib/firms";
import type { Fire } from "@/lib/clusters";
import type { Arrival } from "@/lib/spread";
import type { RoutePlan, EscapeRoute } from "@/lib/routes";
import type { Risk, Weather, Alert } from "@/lib/risk";
import { BRIEF_RADIUS_KM, SITE } from "@/lib/site";

const FireMap = dynamic(() => import("./FireMap"), { ssr: false });

type Brief = {
  place: { name: string; lat: number; lon: number };
  hotspots: Hotspot[];
  fires: Fire[];
  arrival: Arrival | null;
  weather: Weather | null;
  alerts: Alert[];
  risk: Risk;
  checkedAt: string;
};
type Suggestion = { name: string; lat: number; lon: number };
type Phase = "idle" | "brief" | "routes" | "done";

export default function CheckClient() {
  const params = useSearchParams();
  const [lang, setLang] = useState<Lang>("en");
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [household, setHousehold] = useState<Household>({ needsHelp: false, noCar: false, medical: false, pets: false });
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [routes, setRoutes] = useState<RoutePlan | null>(null);
  const [copied, setCopied] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);

  const T = (key: string, p?: Record<string, string | number>) => t(lang, key, p);

  async function load(query: string) {
    setPhase("brief"); setError(""); setBrief(null); setRoutes(null); setSuggestions([]);
    try {
      const res = await fetch(`/api/brief?${query}`);
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error ?? `Request failed (${res.status})`);
      setBrief(j);
      setPhase("routes");
      const r = await fetch(`/api/routes?lat=${j.place.lat}&lon=${j.place.lon}`).then((x) => x.json()).catch(() => null);
      setRoutes(r && !r.error ? r : { best: null, risky: null, checked: 0 });
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }

  // Arriving from the landing page's "Check this area" button.
  useEffect(() => {
    const lat = params.get("lat"), lon = params.get("lon");
    if (lat && lon && !started.current) {
      started.current = true;
      load(`lat=${lat}&lon=${lon}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onAddressChange(v: string) {
    setAddress(v);
    if (debounce.current) clearTimeout(debounce.current);
    if (v.trim().length < 3) { setSuggestions([]); return; }
    debounce.current = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(v.trim())}`)
        .then((r) => r.json())
        .then((j) => setSuggestions(j.places ?? []))
        .catch(() => setSuggestions([]));
    }, 350);
  }

  function pick(s: Suggestion) {
    setAddress(s.name);
    load(`lat=${s.lat}&lon=${s.lon}&q=${encodeURIComponent(s.name)}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (address.trim()) load(`q=${encodeURIComponent(address.trim())}`);
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setError("Location is not available in this browser."); return; }
    setPhase("brief");
    navigator.geolocation.getCurrentPosition(
      (pos) => load(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
      () => { setPhase("idle"); setError("Could not get your location. Type an address instead."); }
    );
  }

  function toggle(key: keyof Household) {
    setHousehold((h) => ({ ...h, [key]: !h[key] }));
  }

  const loading = phase === "brief" || phase === "routes";
  const checklist = brief ? buildChecklist(brief.risk.level, household) : [];
  const nearestFire = brief?.fires[0] ?? null;
  const locale = lang === "es" ? "es" : "en-US";

  function arrivalText(a: Arrival) {
    if (nearestFire && nearestFire.nearestKm < 1.5) {
      return T("ui.arrival.inside", { km: nearestFire.nearestKm.toFixed(1) });
    }
    return T(`ui.arrival.${a.relative}`, {
      hours: hoursText(lang, a.hours),
      low: hoursText(lang, a.hoursLow),
      high: hoursText(lang, a.hoursHigh),
    });
  }
  function routeText(r: EscapeRoute, kind: "best" | "risky") {
    const key = kind === "risky" ? "ui.routes.risky" : r.safe ? "ui.routes.best" : "ui.routes.bestUnsafe";
    return T(key, {
      dir: compass(r.bearing),
      name: r.to.name ?? T("ui.routes.unknown"),
      min: Math.round(r.durationMin),
      km: r.minFireKm >= 999 ? "50" : r.minFireKm.toFixed(0),
    });
  }

  function summary() {
    if (!brief) return "";
    const lines = [
      `${SITE.name}: ${brief.place.name}`,
      T("ui.risk", { level: brief.risk.level }) + ` (${brief.risk.score}/100)`,
      ...brief.risk.reasons.map((r) => `- ${tm(lang, r)}`),
    ];
    if (brief.arrival && nearestFire) lines.push("", arrivalText(brief.arrival));
    if (routes?.best) lines.push("", routeText(routes.best, "best"));
    if (routes?.risky) lines.push(routeText(routes.risky, "risky"));
    lines.push("");
    for (const g of checklist) lines.push(T(g.title).toUpperCase(), ...g.items.map((k) => `[ ] ${T(k)}`), "");
    lines.push(new Date(brief.checkedAt).toLocaleString(locale));
    return lines.join("\n");
  }

  function copySummary() {
    navigator.clipboard.writeText(summary()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <section className="hero no-print" style={{ paddingBottom: 24 }}>
        <div className="container">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h1>{T("ui.title")}</h1>
            <button className="btn secondary" type="button" onClick={() => setLang(lang === "en" ? "es" : "en")}>
              {T("lang.switch")}
            </button>
          </div>
          <div className="rule" />
          <p>{T("ui.intro", { r: BRIEF_RADIUS_KM })}</p>
        </div>
      </section>

      <section className="no-print" style={{ paddingTop: 0 }}>
        <div className="container grid-2">
          <form className="card" onSubmit={submit} autoComplete="off">
            <label htmlFor="address">{T("ui.address")}</label>
            <div className="suggest-wrap">
              <input
                id="address"
                type="text"
                placeholder={T("ui.placeholder")}
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
              />
              {suggestions.length > 0 && (
                <ul className="suggest" role="listbox">
                  {suggestions.map((s) => (
                    <li key={`${s.lat},${s.lon}`}>
                      <button type="button" onClick={() => pick(s)}>{s.name}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" type="submit" disabled={loading || !address.trim()}>
                {loading ? T("ui.checking") : T("ui.go")}
              </button>
              <button className="link" type="button" onClick={useMyLocation} disabled={loading}>{T("ui.useLocation")}</button>
            </div>
            {error && <div className="error">{error}</div>}
            {loading && (
              <ol className="steps">
                <li className={phase === "brief" ? "current" : "done"}>{T("ui.loading.brief")}</li>
                <li className={phase === "routes" ? "current" : ""}>{T("ui.loading.routes")}</li>
              </ol>
            )}
          </form>

          <div className="card">
            <label>{T("ui.who")}</label>
            <p className="small muted">{T("ui.whoNote")}</p>
            <label className="check"><input type="checkbox" checked={household.needsHelp} onChange={() => toggle("needsHelp")} />{T("ui.needsHelp")}</label>
            <label className="check"><input type="checkbox" checked={household.noCar} onChange={() => toggle("noCar")} />{T("ui.noCar")}</label>
            <label className="check"><input type="checkbox" checked={household.medical} onChange={() => toggle("medical")} />{T("ui.medical")}</label>
            <label className="check"><input type="checkbox" checked={household.pets} onChange={() => toggle("pets")} />{T("ui.pets")}</label>
          </div>
        </div>
      </section>

      {brief && (
        <section style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="card risk-grid" style={{ marginBottom: 20 }}>
              <Gauge score={brief.risk.score} level={brief.risk.level} label={T(`level.${brief.risk.level}`)} />
              <div>
                <div className="small muted">{brief.place.name}</div>
                <div className={`level ${brief.risk.level}`}>{T("ui.risk", { level: brief.risk.level })}</div>
                <div className="small muted" style={{ marginBottom: 12 }}>
                  {T("ui.score", { score: brief.risk.score, time: new Date(brief.checkedAt).toLocaleString(locale) })}
                </div>
                <ul className="plain">
                  {brief.risk.reasons.map((r, i) => <li key={i}>{tm(lang, r)}</li>)}
                </ul>
                {brief.alerts.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    {brief.alerts.map((a, i) => (
                      <div className="alert" key={i}><strong>{a.event}.</strong> {a.headline}</div>
                    ))}
                  </div>
                )}
                <div className="row no-print" style={{ marginTop: 16 }}>
                  <button className="btn secondary" type="button" onClick={() => window.print()}>{T("ui.print")}</button>
                  <button className="btn secondary" type="button" onClick={copySummary}>{copied ? T("ui.copied") : T("ui.copy")}</button>
                  <a className="btn secondary" href={`sms:?&body=${encodeURIComponent(summary())}`}>{T("ui.sms")}</a>
                </div>
              </div>
            </div>

            <div className="stats" style={{ marginBottom: 20 }}>
              <div className="stat">
                <div className="n">{brief.hotspots.length}</div>
                <div className="l">{T("ui.stat.detections", { r: BRIEF_RADIUS_KM })}</div>
              </div>
              <div className="stat">
                <div className="n">{brief.risk.nearest ? `${brief.risk.nearest.distanceKm.toFixed(1)} km` : T("ui.stat.none")}</div>
                <div className="l">{T("ui.stat.nearest")}{brief.risk.nearest ? T("ui.stat.toThe", { dir: compass(brief.risk.nearest.bearing) }) : ""}</div>
              </div>
              <div className="stat">
                <div className="n">{brief.weather ? `${Math.round(brief.weather.windKmh)} km/h` : "n/a"}</div>
                <div className="l">{brief.weather ? T("ui.stat.wind", { dir: compass(brief.weather.windFromDeg), g: Math.round(brief.weather.gustKmh) }) : ""}</div>
              </div>
              <div className="stat">
                <div className="n">{brief.weather ? `${brief.weather.humidity}%` : "n/a"}</div>
                <div className="l">{brief.weather ? T("ui.stat.humidity", { t: Math.round(brief.weather.tempC) }) : ""}</div>
              </div>
            </div>

            <div className="grid-2 top" style={{ marginBottom: 20 }}>
              <div className="card">
                <h3>{T("ui.fires.title")}</h3>
                {brief.fires.length === 0 && <p className="muted">{T("ui.fires.none", { r: BRIEF_RADIUS_KM })}</p>}
                {brief.fires.slice(0, 4).map((f, i) => (
                  <div className="fire-row" key={f.id}>
                    <strong>{T("ui.fire.name", { n: i + 1 })}.</strong>{" "}
                    {T("ui.fire.line", { count: f.count, span: f.spanKm.toFixed(1), km: f.nearestKm.toFixed(1), dir: compass(f.bearing), age: f.ageHours.toFixed(0) })}
                    {brief.arrival && i === 0 && <> {T("ui.fire.push", { dir: compass(brief.arrival.windToDeg) })}</>}
                  </div>
                ))}
              </div>
              <div className="card">
                <h3>{T("ui.arrival.title")}</h3>
                {brief.arrival && nearestFire ? (
                  <>
                    <p className={`arrival ${nearestFire.nearestKm < 1.5 ? "head" : brief.arrival.relative}`}>{arrivalText(brief.arrival)}</p>
                    <p className="small muted" style={{ margin: 0 }}>{T("ui.arrival.note", { age: nearestFire.ageHours.toFixed(0) })}</p>
                  </>
                ) : (
                  <p className="muted">{T("ui.fires.none", { r: BRIEF_RADIUS_KM })}</p>
                )}
              </div>
            </div>

            <div className="map-frame" style={{ marginBottom: 20 }}>
              <div className="map">
                <FireMap
                  center={[brief.place.lat, brief.place.lon]}
                  zoom={10}
                  hotspots={brief.hotspots}
                  home={[brief.place.lat, brief.place.lon]}
                  ringKm={25}
                  safeRoute={routes?.best ? { geometry: routes.best.geometry, label: routes.best.to.name ?? T("ui.legend.safe") } : null}
                  riskyRoute={routes?.risky ? { geometry: routes.risky.geometry, label: T("ui.legend.risky") } : null}
                />
              </div>
              <div className="legend">
                <span><i style={{ background: COLORS.home, borderColor: "#fff" }} />{T("ui.legend.home")}</span>
                <span><i style={{ background: COLORS.hot }} />{T("ui.legend.hot")}</span>
                <span><i className="ring" />{T("ui.legend.ring")}</span>
                <span><i className="line" style={{ background: COLORS.safe }} />{T("ui.legend.safe")}</span>
                <span><i className="line dashed" style={{ borderColor: COLORS.risky }} />{T("ui.legend.risky")}</span>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 28 }}>
              <h3>{T("ui.routes.title")}</h3>
              {phase === "routes" && <p className="muted">{T("ui.loading.routes")}</p>}
              {routes && (
                <>
                  {routes.best ? (
                    <p className={`route ${routes.best.safe ? "safe" : "unsafe"}`}>{routeText(routes.best, "best")}</p>
                  ) : (
                    <p className="route unsafe">{T("ui.routes.none")}</p>
                  )}
                  {routes.risky && <p className="route risky">{routeText(routes.risky, "risky")}</p>}
                  <p className="small muted" style={{ margin: 0 }}>{T("ui.routes.note")}</p>
                </>
              )}
            </div>

            <h2>{T("ui.checklist")}</h2>
            <div className="rule" />
            <div className="grid-3">
              {checklist.map((g) => (
                <div className="card" key={g.title}>
                  <h3>{T(g.title)}</h3>
                  <ul className="tick">
                    {g.items.map((k) => <li key={k}>{T(k)}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
