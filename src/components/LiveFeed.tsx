"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Hotspot } from "@/lib/firms";
import type { FireCluster } from "@/lib/firms";
import Link from "next/link";

const FireMap = dynamic(() => import("./FireMap"), { ssr: false });

// Landing-page map: every satellite heat detection in the contiguous US from the last 24 hours.
export default function LiveFeed() {
  const [hotspots, setHotspots] = useState<Hotspot[] | null>(null);
  const [error, setError] = useState("");
  const [fires, setFires] = useState<FireCluster[]>([]);

  useEffect(() => {
    fetch("/api/fires?lat=39.5&lon=-98.4&radius=2600")
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : (setHotspots(j.hotspots), setFires(j.fires ?? []))))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="map-frame">
      <div className="map-head">
        <h3>United States live feed</h3>
        <span className="pill">NASA FIRMS</span>
        <span className="pill">VIIRS satellite</span>
        <span className="pill">Last 24 hours</span>
        <span className="pill">{hotspots ? `${hotspots.length.toLocaleString()} detections` : error ? "Feed unavailable" : "Loading"}</span>
      </div>
      <div className="map">
        <FireMap center={[38.5, -97]} zoom={4} hotspots={hotspots ?? []} fires={fires} />
        <div className="map-legend" aria-label="Map legend">
          <div className="map-legend-title">Satellite heat detections</div>
          <p>VIIRS thermal anomalies from the last 24 hours. Not confirmed wildfires. Larger dots are hotter.</p>
          <ul>
            <li><span className="swatch swatch-lg" aria-hidden="true" />Over 50 MW</li>
            <li><span className="swatch swatch-md" aria-hidden="true" />10 to 50 MW</li>
            <li><span className="swatch swatch-sm" aria-hidden="true" />Under 10 MW</li>
          </ul>
        </div>
      </div>
      <div className="active-fires"><h3>Active fires right now</h3><p className="small muted">Clusters of recent satellite heat detections; not official incident boundaries.</p>{fires.filter(f => f.count >= 2).slice(0, 8).map(f => <Link key={f.id} href={`/check?lat=${f.lat}&lon=${f.lon}`} className="active-fire"><span><strong>{f.name}</strong> · {f.count} detections · {f.distanceKm.toFixed(0)} km from feed center</span><span>Open brief →</span></Link>)}{!fires.some(f=>f.count>=2) && <p className="muted">{error || "No multi-detection clusters in this feed right now."}</p>}</div>
    </div>
  );
}
