"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Hotspot } from "@/lib/firms";
import { COLORS } from "@/lib/colors";

export type RouteLine = { geometry: [number, number][]; label: string };

type Props = {
  center: [number, number];
  zoom: number;
  hotspots: Hotspot[];
  home?: [number, number];
  ringKm?: number;
  safeRoute?: RouteLine | null;
  riskyRoute?: RouteLine | null;
};

// Dark basemap with orange satellite heat detections. Bigger, brighter dots are hotter.
export default function FireMap({ center, zoom, hotspots, home, ringKm, safeRoute, riskyRoute }: Props) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="map">
      <TileLayer
        attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />
      {home && ringKm && (
        <Circle center={home} radius={ringKm * 1000} pathOptions={{ color: COLORS.home, weight: 1, fillOpacity: 0.04 }} />
      )}
      {hotspots.map((h, i) => (
        <CircleMarker
          key={i}
          center={[h.lat, h.lon]}
          radius={h.frp > 50 ? 7 : h.frp > 10 ? 5 : 4}
          pathOptions={{ color: "#ff7a3d", fillColor: COLORS.hot, fillOpacity: 0.8, weight: 1 }}
        >
          <Tooltip>
            {h.frp.toFixed(1)} MW, {h.confidence} confidence, {h.acquired}
            {h.distanceKm ? `, ${h.distanceKm.toFixed(1)} km away` : ""}
          </Tooltip>
        </CircleMarker>
      ))}
      {riskyRoute && (
        <Polyline positions={riskyRoute.geometry} pathOptions={{ color: COLORS.risky, weight: 4, dashArray: "6 8", opacity: 0.9 }}>
          <Tooltip sticky>{riskyRoute.label}</Tooltip>
        </Polyline>
      )}
      {safeRoute && (
        <>
          <Polyline positions={safeRoute.geometry} pathOptions={{ color: COLORS.safe, weight: 5, opacity: 0.95 }}>
            <Tooltip sticky>{safeRoute.label}</Tooltip>
          </Polyline>
          <CircleMarker
            center={safeRoute.geometry[safeRoute.geometry.length - 1]}
            radius={6}
            pathOptions={{ color: "#fff", fillColor: COLORS.safe, fillOpacity: 1, weight: 2 }}
          >
            <Tooltip permanent direction="right" offset={[8, 0]}>{safeRoute.label}</Tooltip>
          </CircleMarker>
        </>
      )}
      {home && (
        <CircleMarker center={home} radius={8} pathOptions={{ color: "#fff", fillColor: COLORS.home, fillOpacity: 1, weight: 2 }}>
          <Tooltip permanent direction="top" offset={[0, -8]}>Your address</Tooltip>
        </CircleMarker>
      )}
      <Fit home={home} ringKm={ringKm} routes={[safeRoute, riskyRoute]} />
    </MapContainer>
  );
}

// Zoom to show the house, the 25 km ring, and any routes once they arrive.
function Fit({ home, ringKm, routes }: { home?: [number, number]; ringKm?: number; routes: (RouteLine | null | undefined)[] }) {
  const map = useMap();
  const key = routes.map((r) => (r ? r.geometry.length : 0)).join(",");
  useEffect(() => {
    if (!home) return;
    const pts: [number, number][] = [home];
    for (const r of routes) if (r) pts.push(...r.geometry);
    let bounds = L.latLngBounds(pts);
    if (ringKm) bounds = bounds.extend(L.latLng(home).toBounds(ringKm * 2 * 1000));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, home?.[0], home?.[1]]);
  return null;
}
