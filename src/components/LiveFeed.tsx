"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Hotspot } from "@/lib/firms";

const FireMap = dynamic(() => import("./FireMap"), { ssr: false });

// Landing-page map: every satellite heat detection in the contiguous US from the last 24 hours.
export default function LiveFeed() {
  const [hotspots, setHotspots] = useState<Hotspot[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/fires?lat=39.5&lon=-98.4&radius=2600")
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : setHotspots(j.hotspots)))
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
        <FireMap center={[38.5, -97]} zoom={4} hotspots={hotspots ?? []} />
      </div>
    </div>
  );
}
