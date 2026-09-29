"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { buildChecklist, type Household } from "@/lib/checklist";
import { compass } from "@/lib/geo";
import type { Hotspot } from "@/lib/firms";
import type { Risk, Weather, Alert } from "@/lib/risk";
import { BRIEF_RADIUS_KM, SITE } from "@/lib/site";
import type { FireCluster } from "@/lib/firms";
import { spanishText } from "@/lib/spanish";

const FireMap = dynamic(() => import("@/components/FireMap"), { ssr: false });

type Brief = {
  place: { name: string; lat: number; lon: number };
  hotspots: Hotspot[];
  weather: Weather | null;
  alerts: Alert[];
  risk: Risk;
  checkedAt: string;
  fires: FireCluster[];
  arrival: { low: number; high: number; label: string; confidence: string } | null;
  route: { coordinates: [number, number][]; risky: boolean; destination: string } | null;
};

export default function CheckPage() {
  const [address, setAddress] = useState("");
  const [household, setHousehold] = useState<Household>({ needsHelp: false, noCar: false, medical: false, pets: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [copied, setCopied] = useState(false);
  const [spanish, setSpanish] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("lat") && params.has("lon")) load(`lat=${params.get("lat")}&lon=${params.get("lon")}`);
  }, []);
  useEffect(() => {
    if (address.trim().length < 3 || brief) return;
    const timer = setTimeout(() => fetch(`/api/suggest?q=${encodeURIComponent(address)}`).then(r => r.json()).then(j => setSuggestions(j.suggestions ?? [])).catch(() => setSuggestions([])), 300);
    return () => clearTimeout(timer);
  }, [address, brief]);
  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setStage(s => (s + 1) % 3), 1800);
    return () => clearInterval(timer);
  }, [loading]);

  async function load(query: string) {
    setLoading(true); setError(""); setBrief(null);
    try {
      const res = await fetch(`/api/brief?${query}`);
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error ?? `Request failed (${res.status})`);
      setBrief(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (address.trim()) load(`q=${encodeURIComponent(address.trim())}`);
  }

  function useMyLocation() {
    if (!navigator.geolocation) { setError("Location is not available in this browser."); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => load(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
      () => { setLoading(false); setError("Could not get your location. Type an address instead."); }
    );
  }

  function toggle(key: keyof Household) {
    setHousehold((h) => ({ ...h, [key]: !h[key] }));
  }

  const checklist = brief ? buildChecklist(brief.risk.level, household) : [];
  const es = (s: string) => spanishText(s, spanish) || ({ "Check an address":"Consultar una dirección", "Address":"Dirección", "Get my brief":"Ver mi informe", "Use my location":"Usar mi ubicación", "Who lives here?":"¿Quién vive aquí?", "Checklist for this house":"Lista para este hogar", "Do this now":"Hacer ahora", "Do this today":"Hacer hoy", "Go bag":"Bolsa de emergencia", "Plan":"Plan" } as Record<string,string>)[s] || s;

  function copySummary() {
    if (!brief) return;
    const lines = [
      `${SITE.name} ${spanish ? "informe de incendio para" : "fire brief for"} ${brief.place.name}`,
      `${spanish ? "Riesgo" : "Risk"}: ${es(brief.risk.level)} (${brief.risk.score}/100)`,
      ...brief.risk.reasons.map((r) => `- ${es(r)}`),
      "",
      ...checklist.flatMap((g) => [g.title.toUpperCase(), ...g.items.map((i) => `[ ] ${i}`), ""]),
      `${spanish ? "Consultado" : "Checked"} ${new Date(brief.checkedAt).toLocaleString(spanish ? "es" : undefined)}`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <section className="hero no-print" style={{ paddingBottom: 24 }}>
        <div className="container">
          <div className="row" style={{ justifyContent: "space-between" }}><h1>{es("Check an address")}</h1><button type="button" className="btn secondary" onClick={() => setSpanish(v => !v)}>{spanish ? "English" : "Español"}</button></div>
          <div className="rule" />
          <p>{spanish ? `El informe usa detecciones satelitales de las últimas 24 horas dentro de ${BRIEF_RADIUS_KM} km, viento y humedad actuales, y alertas oficiales.` : `The brief uses satellite heat detections from the last 24 hours within ${BRIEF_RADIUS_KM} km, live wind and humidity, and official warnings.`}</p>
        </div>
      </section>

      <section className="no-print" style={{ paddingTop: 0 }}>
        <div className="container grid-2">
          <form className="card" onSubmit={submit}>
            <label htmlFor="address">{es("Address")}</label>
            <input
              id="address"
              type="text"
              placeholder={spanish ? "123 Calle Principal, Paradise, CA" : "123 Main St, Paradise, CA"}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
            />
            {suggestions.length > 0 && address.trim().length >= 3 && !brief && <div className="suggestions">{suggestions.map(s => <button type="button" key={s} onClick={() => { setAddress(s); setSuggestions([]); }}>{s}</button>)}</div>}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" type="submit" disabled={loading || !address.trim()}>
            {loading ? es(["Fetching satellite data…", "Checking wind and humidity…", "Scoring nearby fires…"][stage]) : es("Get my brief")}
              </button>
              <button className="link" type="button" onClick={useMyLocation} disabled={loading}>{es("Use my location")}</button>
            </div>
            {error && <div className="error">{es(error) || error}</div>}
          </form>

          <div className="card">
            <label>{es("Who lives here?")}</label>
            <p className="small muted">{es("The checklist changes based on your answers. Nothing is stored.")}</p>
            <label className="check"><input type="checkbox" checked={household.needsHelp} onChange={() => toggle("needsHelp")} />{es("Someone who needs help to leave: young children, an older adult, or a person with a disability")}</label>
            <label className="check"><input type="checkbox" checked={household.noCar} onChange={() => toggle("noCar")} />{es("No car, or we rely on someone else to drive")}</label>
            <label className="check"><input type="checkbox" checked={household.medical} onChange={() => toggle("medical")} />{es("Daily medication or medical equipment that needs power")}</label>
            <label className="check"><input type="checkbox" checked={household.pets} onChange={() => toggle("pets")} />{es("Pets or livestock")}</label>
          </div>
        </div>
      </section>

      {brief && (
        <section style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="small muted">{brief.place.name}</div>
              <div className={`level ${brief.risk.level}`}>{es(brief.risk.level)} {spanish ? "riesgo" : "risk"}</div>
              <div className="risk-track" role="meter" aria-valuenow={brief.risk.score} aria-valuemin={0} aria-valuemax={100}><span className={brief.risk.level} style={{ width: `${brief.risk.score}%` }} /></div>
              <div className="small muted" style={{ marginBottom: 14 }}>
                {spanish ? `Puntuación ${brief.risk.score} de 100. Consultado` : `Score ${brief.risk.score} of 100. Checked`} {new Date(brief.checkedAt).toLocaleString(spanish ? "es" : undefined)}.
              </div>
              <ul className="plain">
                {brief.risk.reasons.map((r, i) => <li key={i}>{es(r)}</li>)}
              </ul>
              {brief.fires.slice(0, 5).map(f => <p key={f.id} className="fire-line"><strong>{spanish ? `Incendio ${f.name.slice(-1)}` : f.name}</strong> · {f.count} {spanish ? "detecciones" : "detections"} · {f.distanceKm.toFixed(1)} km {compass(f.bearing)}{f.heading !== null ? ` · ${spanish ? "dirección" : "heading"} ${compass(f.heading)}` : ` · ${spanish ? "dirección desconocida" : "heading unknown"}`}</p>)}
              {brief.arrival && <div className="arrival"><strong>{spanish ? `Si el viento actual se mantiene, el incendio más cercano podría llegar a esta dirección en ${brief.arrival.label.replace("about", "aproximadamente").replace("hours", "horas")}.` : `If current wind holds, the nearest fire could reach this address in ${brief.arrival.label}.`}</strong><br/><span>{spanish ? `Estimación muy incierta: el modelo simplificado no considera terreno, combustible, control del incendio ni cambios del clima. Rango estimado: ${Math.max(1, Math.round(brief.arrival.low))}–${Math.round(brief.arrival.high)} horas. Sigue las órdenes oficiales de evacuación.` : `${brief.arrival.confidence} Estimate range: ${Math.max(1, Math.round(brief.arrival.low))}–${Math.round(brief.arrival.high)} hours. Follow official evacuation orders.`}</span></div>}
              {brief.route && <p className={brief.route.risky ? "route-warning" : "muted"}>{brief.route.risky ? (spanish ? "Alerta de ruta: la salida sugerida pasa a menos de 3 km de un grupo de calor. Consulta los cierres oficiales." : "Route warning: suggested way out passes within 3 km of a fire cluster. Check official road closures.") : (spanish ? `La línea discontinua muestra la ruta sugerida hacia ${brief.route.destination}. Verifica el estado de las carreteras antes de salir.` : `Dashed map line: suggested route toward ${brief.route.destination}. Verify road conditions before leaving.`)}</p>}
              {brief.alerts.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {brief.alerts.map((a, i) => (
                    <div className="alert" key={i}><strong>{spanish ? ({ "Evacuation Order":"Orden de evacuación", "Evacuation Warning":"Aviso de evacuación", "Red Flag Warning":"Alerta de bandera roja", "Fire Weather Watch":"Vigilancia por condiciones meteorológicas para incendios" } as Record<string,string>)[a.event] ?? a.event : a.event}.</strong> {spanish ? "Aviso oficial para esta zona. Consulta las instrucciones de las autoridades locales." : a.headline}</div>
                  ))}
                </div>
              )}
              <div className="row no-print" style={{ marginTop: 18 }}>
                <button className="btn secondary" type="button" onClick={() => window.print()}>{es("Print")}</button>
                <button className="btn secondary" type="button" onClick={copySummary}>{es(copied ? "Copied" : "Copy as text message")}</button>
                <a className="btn secondary" href={`sms:?body=${encodeURIComponent(`${SITE.name} ${spanish ? "informe de incendio" : "fire brief"}: ${brief.risk.level} ${spanish ? "riesgo" : "risk"}. ${brief.arrival ? `${spanish ? "Estimación del incendio más cercano" : "Nearest fire estimate"} ${brief.arrival.label}. ` : ""}${brief.risk.reasons.map(r => es(r)).join(" ")}`)}`}>{es("Text this to my phone")}</a>
              </div>
            </div>

            <div className="stats" style={{ marginBottom: 20 }}>
              <div className="stat">
                <div className="n">{brief.hotspots.length}</div>
                <div className="l">{spanish ? `Detecciones de calor en ${BRIEF_RADIUS_KM} km, 24 h` : `Heat detections within ${BRIEF_RADIUS_KM} km, 24 h`}</div>
              </div>
              <div className="stat">
                <div className="n">{brief.risk.nearest ? `${brief.risk.nearest.distanceKm.toFixed(1)} km` : "None"}</div>
                <div className="l">{spanish ? "Detección más cercana" : "Nearest detection"}{brief.risk.nearest ? `, ${spanish ? "al" : "to the"} ${compass(brief.risk.nearest.bearing)}` : ""}</div>
              </div>
              <div className="stat">
                <div className="n">{brief.weather ? `${Math.round(brief.weather.windKmh)} km/h` : "n/a"}</div>
                <div className="l">{spanish ? "Viento" : "Wind"}{brief.weather ? ` ${spanish ? "del" : "from the"} ${compass(brief.weather.windFromDeg)}, ${spanish ? "ráfagas de hasta" : "gusts to"} ${Math.round(brief.weather.gustKmh)} km/h` : ""}</div>
              </div>
              <div className="stat">
                <div className="n">{brief.weather ? `${brief.weather.humidity}%` : "n/a"}</div>
                <div className="l">{spanish ? "Humedad relativa" : "Relative humidity"}{brief.weather ? `, ${Math.round(brief.weather.tempC)}°C` : ""}</div>
              </div>
            </div>

            <div className="map-frame" style={{ marginBottom: 20 }}>
              <div className="map">
                <FireMap
                  center={[brief.place.lat, brief.place.lon]}
                  zoom={9}
                  hotspots={brief.hotspots}
                  fires={brief.fires}
                  route={brief.route}
                  home={[brief.place.lat, brief.place.lon]}
                  ringKm={25}
                />
              </div>
            </div>

            <h2>{es("Checklist for this house")}</h2>
            <div className="rule" />
            <div className="grid-3">
              {checklist.map((g) => (
                <div className="card" key={g.title}>
                  <h3>{es(g.title)}</h3>
                  <ul className="tick">
                    {g.items.map((item, i) => <li key={i}>{es(item)}</li>)}
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
