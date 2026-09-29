"use client";

import { MapContainer, TileLayer, CircleMarker, Circle, Tooltip, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Hotspot } from "@/lib/firms";
import type { FireCluster } from "@/lib/firms";

type Props = {
  center: [number, number];
  zoom: number;
  hotspots: Hotspot[];
  home?: [number, number];
  ringKm?: number;
  route?: { coordinates: [number, number][]; risky: boolean } | null;
  fires?: FireCluster[];
};

// Dark basemap with orange satellite heat detections. Bigger, brighter dots are hotter.
export default function FireMap({ center, zoom, hotspots, home, ringKm, route, fires = [] }: Props) {
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} className="map">
      <TileLayer
        attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxZoom={16}
      />
      {home && ringKm && (
        <Circle center={home} radius={ringKm * 1000} pathOptions={{ color: "#a9d6a0", weight: 1, fillOpacity: 0.04 }} />
      )}
      {route?.coordinates.length ? <Polyline positions={route.coordinates} pathOptions={{ color: route.risky ? "#ff604f" : "#a9d6a0", weight: 4, dashArray: "8 7" }} /> : null}
      {fires.length ? fires.map((f) => <CircleMarker key={f.id} center={[f.lat, f.lon]} radius={Math.min(16, 7 + Math.log2(f.count + 1) * 2)} pathOptions={{ color: "#ffd18b", fillColor: "#ff5a1f", fillOpacity: 0.85, weight: 2 }}><Tooltip>{f.name}: {f.count} detections · {f.distanceKm.toFixed(1)} km away</Tooltip></CircleMarker>) : hotspots.map((h, i) => (
        <CircleMarker
          key={i}
          center={[h.lat, h.lon]}
          radius={h.frp > 50 ? 7 : h.frp > 10 ? 5 : 4}
          pathOptions={{ color: "#ff7a3d", fillColor: "#ff5a1f", fillOpacity: 0.8, weight: 1 }}
        >
          <Tooltip>
            {h.frp.toFixed(1)} MW, {h.confidence} confidence, {h.acquired}
            {h.distanceKm ? `, ${h.distanceKm.toFixed(1)} km away` : ""}
          </Tooltip>
        </CircleMarker>
      ))}
      {home && (
        <CircleMarker center={home} radius={8} pathOptions={{ color: "#fff", fillColor: "#a9d6a0", fillOpacity: 1, weight: 2 }}>
          <Tooltip permanent direction="top" offset={[0, -8]}>Your address</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
