"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ActiveFire = { id: number; lat: number; lon: number; count: number; frpTotal: number; spanKm: number; ageHours: number };

// The biggest fires in the US right now, each a one-click brief.
export default function ActiveFires() {
  const [fires, setFires] = useState<ActiveFire[] | null>(null);
  const [names, setNames] = useState<Record<number, string | null>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/active")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) { setError(j.error); return; }
        setFires(j.fires);
        for (const f of j.fires as ActiveFire[]) {
          fetch(`/api/placename?lat=${f.lat}&lon=${f.lon}`)
            .then((r) => r.json())
            .then((p) => setNames((n) => ({ ...n, [f.id]: p.name })))
            .catch(() => setNames((n) => ({ ...n, [f.id]: null })));
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p className="muted">Live fire list unavailable right now ({error}).</p>;
  if (!fires) return <p className="muted">Finding the largest fires in the last 24 hours.</p>;
  if (!fires.length) return <p className="muted">No fire clusters of five or more detections in the US right now.</p>;

  return (
    <div className="fire-grid">
      {fires.map((f, i) => {
        const name = names[f.id];
        return (
          <div className="card fire-card" key={f.id}>
            <div className="step">Fire {i + 1}</div>
            <h3>{name === undefined ? "Locating" : name ?? `${f.lat.toFixed(2)}, ${f.lon.toFixed(2)}`}</h3>
            <p className="small muted">
              {f.count} detections, {f.spanKm.toFixed(0)} km across, {Math.round(f.frpTotal).toLocaleString()} MW, seen {f.ageHours.toFixed(0)} h ago
            </p>
            <Link href={`/check?lat=${f.lat.toFixed(4)}&lon=${f.lon.toFixed(4)}`} className="btn secondary small-btn">
              Check this area
            </Link>
          </div>
        );
      })}
    </div>
  );
}
