"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { buildChecklist, type Household } from "@/lib/checklist";
import { compass } from "@/lib/geo";
import type { Hotspot } from "@/lib/firms";
import type { Risk, Weather, Alert } from "@/lib/risk";
import { BRIEF_RADIUS_KM, SITE } from "@/lib/site";

const FireMap = dynamic(() => import("@/components/FireMap"), { ssr: false });

type Brief = {
  place: { name: string; lat: number; lon: number };
  hotspots: Hotspot[];
  weather: Weather | null;
  alerts: Alert[];
  risk: Risk;
  checkedAt: string;
};

export default function CheckPage() {
  const [address, setAddress] = useState("");
  const [household, setHousehold] = useState<Household>({ needsHelp: false, noCar: false, medical: false, pets: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [copied, setCopied] = useState(false);

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

  function copySummary() {
    if (!brief) return;
    const lines = [
      `${SITE.name} fire brief for ${brief.place.name}`,
      `Risk: ${brief.risk.level} (${brief.risk.score}/100)`,
      ...brief.risk.reasons.map((r) => `- ${r}`),
      "",
      ...checklist.flatMap((g) => [g.title.toUpperCase(), ...g.items.map((i) => `[ ] ${i}`), ""]),
      `Checked ${new Date(brief.checkedAt).toLocaleString()}`,
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
          <h1>Check an address</h1>
          <div className="rule" />
          <p>The brief uses satellite heat detections from the last 24 hours within {BRIEF_RADIUS_KM} km, live wind and humidity, and official warnings.</p>
        </div>
      </section>

      <section className="no-print" style={{ paddingTop: 0 }}>
        <div className="container grid-2">
          <form className="card" onSubmit={submit}>
            <label htmlFor="address">Address</label>
            <input
              id="address"
              type="text"
              placeholder="123 Main St, Paradise, CA"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
            />
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" type="submit" disabled={loading || !address.trim()}>
                {loading ? "Checking" : "Get my brief"}
              </button>
              <button className="link" type="button" onClick={useMyLocation} disabled={loading}>Use my location</button>
            </div>
            {error && <div className="error">{error}</div>}
          </form>

          <div className="card">
            <label>Who lives here?</label>
            <p className="small muted">The checklist changes based on your answers. Nothing is stored.</p>
            <label className="check"><input type="checkbox" checked={household.needsHelp} onChange={() => toggle("needsHelp")} />Someone who needs help to leave: young children, an older adult, or a person with a disability</label>
            <label className="check"><input type="checkbox" checked={household.noCar} onChange={() => toggle("noCar")} />No car, or we rely on someone else to drive</label>
            <label className="check"><input type="checkbox" checked={household.medical} onChange={() => toggle("medical")} />Daily medication or medical equipment that needs power</label>
            <label className="check"><input type="checkbox" checked={household.pets} onChange={() => toggle("pets")} />Pets or livestock</label>
          </div>
        </div>
      </section>

      {brief && (
        <section style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="small muted">{brief.place.name}</div>
              <div className={`level ${brief.risk.level}`}>{brief.risk.level} risk</div>
              <div className="small muted" style={{ marginBottom: 14 }}>
                Score {brief.risk.score} of 100. Checked {new Date(brief.checkedAt).toLocaleString()}.
              </div>
              <ul className="plain">
                {brief.risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
              {brief.alerts.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {brief.alerts.map((a, i) => (
                    <div className="alert" key={i}><strong>{a.event}.</strong> {a.headline}</div>
                  ))}
                </div>
              )}
              <div className="row no-print" style={{ marginTop: 18 }}>
                <button className="btn secondary" type="button" onClick={() => window.print()}>Print</button>
                <button className="btn secondary" type="button" onClick={copySummary}>{copied ? "Copied" : "Copy as text message"}</button>
              </div>
            </div>

            <div className="stats" style={{ marginBottom: 20 }}>
              <div className="stat">
                <div className="n">{brief.hotspots.length}</div>
                <div className="l">Heat detections within {BRIEF_RADIUS_KM} km, 24 h</div>
              </div>
              <div className="stat">
                <div className="n">{brief.risk.nearest ? `${brief.risk.nearest.distanceKm.toFixed(1)} km` : "None"}</div>
                <div className="l">Nearest detection{brief.risk.nearest ? `, to the ${compass(brief.risk.nearest.bearing)}` : ""}</div>
              </div>
              <div className="stat">
                <div className="n">{brief.weather ? `${Math.round(brief.weather.windKmh)} km/h` : "n/a"}</div>
                <div className="l">Wind{brief.weather ? ` from the ${compass(brief.weather.windFromDeg)}, gusts to ${Math.round(brief.weather.gustKmh)} km/h` : ""}</div>
              </div>
              <div className="stat">
                <div className="n">{brief.weather ? `${brief.weather.humidity}%` : "n/a"}</div>
                <div className="l">Relative humidity{brief.weather ? `, ${Math.round(brief.weather.tempC)}°C` : ""}</div>
              </div>
            </div>

            <div className="map-frame" style={{ marginBottom: 20 }}>
              <div className="map">
                <FireMap
                  center={[brief.place.lat, brief.place.lon]}
                  zoom={9}
                  hotspots={brief.hotspots}
                  home={[brief.place.lat, brief.place.lon]}
                  ringKm={25}
                />
              </div>
            </div>

            <h2>Checklist for this house</h2>
            <div className="rule" />
            <div className="grid-3">
              {checklist.map((g) => (
                <div className="card" key={g.title}>
                  <h3>{g.title}</h3>
                  <ul className="tick">
                    {g.items.map((item, i) => <li key={i}>{item}</li>)}
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
