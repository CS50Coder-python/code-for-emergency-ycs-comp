import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { centroid, destination, windOffset } from "@/lib/geo";
import { contour, type ThreatField } from "@/lib/spread";
import { isBurningAt, positionAt } from "@/lib/tape";
import type {
  FireHotspot,
  HouseholdMember,
  HuddlePlay,
  LatLng,
  RallyCandidate,
  WeatherNow,
} from "@/lib/types";

const TAPE = "#F4C430";
const ICE = "#5EEAD4";
const EMBER = "#E11D74";
const BONE = "#EFE7D6";

type Props = {
  members: HouseholdMember[];
  fires: FireHotspot[];
  play: HuddlePlay;
  weather: WeatherNow;
  threat: ThreatField;
  candidates: RallyCandidate[];
  forcedRallyId: string | null;
  onPickRally: (id: string | null) => void;
  tapeT: number;
  editing: boolean;
  placing: string | null;
  onPlace: (id: string, p: LatLng) => void;
  onDrag: (id: string, p: LatLng) => void;
  fitKey: string;
};

function Fit({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), {
      padding: [40, 40],
      maxZoom: 13,
    });
    // Fit once per scenario; the parent remounts this with a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function ClickToPlace({ placing, onPlace }: { placing: string | null; onPlace: Props["onPlace"] }) {
  const map = useMapEvents({
    click(e) {
      if (placing) onPlace(placing, { lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  useEffect(() => {
    map.getContainer().style.cursor = placing ? "crosshair" : "";
  }, [map, placing]);
  return null;
}

function pin(letter: string, tone: "ice" | "tape" | "ember" | "hollow" | "ash", burning: boolean) {
  const bg =
    tone === "ice" ? ICE : tone === "tape" ? TAPE : tone === "ember" ? EMBER : tone === "ash" ? "#6b6258" : "#1f1b16";
  const fg = tone === "hollow" ? BONE : "#161310";
  const ring = burning ? `box-shadow:0 0 0 3px ${EMBER}, 0 0 18px ${EMBER};` : "";
  return L.divIcon({
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: `<div class="member-pin${burning ? " member-pin--burn" : ""}" style="background:${bg};color:${fg};${ring}">${letter}</div>`,
  });
}

export default function PlayboardMap(props: Props) {
  const {
    members,
    fires,
    play,
    weather,
    threat,
    candidates,
    forcedRallyId,
    onPickRally,
    tapeT,
    editing,
    placing,
    onPlace,
    onDrag,
    fitKey,
  } = props;
  const first = members[0]?.location;
  const center = useMemo(() => first ?? { lat: 34.05, lng: -118.53 }, [first]);
  const seed = useMemo(
    () => (fires.length ? centroid(fires.map((f) => f.location)) : center),
    [fires, center],
  );
  const downwind = windOffset(weather.windDeg);

  const fitPoints = useMemo(
    () => [...members.map((m) => m.location), ...fires.map((f) => f.location), ...candidates.map((c) => c.location)],
    [members, fires, candidates],
  );

  const tMin = Math.round(tapeT);
  const front = useMemo(
    () => (tMin >= 9 ? contour(seed, tMin, threat.impactMinutesAt, 5) : []),
    [seed, tMin, threat],
  );

  const streamlines = useMemo(() => {
    const lines: LatLng[][] = [];
    for (let off = -2.8; off <= 2.8; off += 0.8) {
      const start = destination(destination(seed, downwind + 180, 3.2), downwind + 90, off);
      const end = destination(start, downwind, 12);
      lines.push([start, destination(start, downwind, 6), end]);
    }
    return lines;
  }, [seed, downwind]);

  const positions = useMemo(
    () =>
      Object.fromEntries(
        members.map((m) => [m.id, editing ? m.location : positionAt(play.routes, members, m.id, tapeT)]),
      ) as Record<string, LatLng>,
    [members, play.routes, tapeT, editing],
  );

  const name = (id?: string) => members.find((m) => m.id === id)?.name.split(" ")[0] ?? "";

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      className="h-full w-full bg-peat"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={16}
        maxZoom={18}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxNativeZoom={16}
        maxZoom={18}
        opacity={0.8}
      />
      <Fit key={fitKey} points={fitPoints} />
      <ClickToPlace placing={placing} onPlace={onPlace} />

      {streamlines.map((line, i) => (
        <Polyline
          key={`s${i}`}
          positions={line.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: TAPE, weight: 1.2, opacity: 0.35, dashArray: "2 16", className: "ember-flow" }}
        />
      ))}

      {threat.isochrones.map((iso, i) => (
        <Polygon
          key={iso.minutes}
          positions={iso.ring.map((p) => [p.lat, p.lng])}
          pathOptions={{
            color: EMBER,
            weight: i === 0 ? 1.5 : 1,
            opacity: 0.55 - i * 0.08,
            fillColor: EMBER,
            fillOpacity: 0.035,
            dashArray: i === 0 ? undefined : "4 8",
          }}
        />
      ))}
      {threat.isochrones.map((iso) => {
        const p = iso.ring[Math.round(iso.ring.length * 0.42) % iso.ring.length];
        return (
          <Tooltip key={`l${iso.minutes}`} permanent direction="right" offset={[4, 0]} className="iso-label" position={[p.lat, p.lng]}>
            {iso.minutes} min
          </Tooltip>
        );
      })}

      {front.length > 2 && (
        <Polygon
          positions={front.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: EMBER, weight: 2, fillColor: EMBER, fillOpacity: 0.28, className: "front-pulse" }}
        />
      )}

      {fires.map((f) => (
        <CircleMarker
          key={f.id}
          center={[f.location.lat, f.location.lng]}
          radius={7 + Math.min(f.frp, 40) / 6}
          pathOptions={{ color: EMBER, fillColor: EMBER, fillOpacity: 0.7, weight: 1 }}
        >
          <Popup>
            <p className="font-mono text-xs">
              Hotspot {f.source.toUpperCase()} · FRP {f.frp} · {f.brightness} K
            </p>
          </Popup>
        </CircleMarker>
      ))}

      {candidates.map((c) => {
        const chosen = c.id === play.rally.id;
        if (chosen) return null;
        return (
          <CircleMarker
            key={c.id}
            center={[c.location.lat, c.location.lng]}
            radius={5}
            eventHandlers={{ click: () => onPickRally(forcedRallyId === c.id ? null : c.id) }}
            pathOptions={{ color: BONE, fillColor: "#161310", fillOpacity: 0.9, weight: 1.2, opacity: 0.6 }}
          >
            <Tooltip direction="top" offset={[0, -6]} className="iso-label">
              {c.name} · click to force
            </Tooltip>
          </CircleMarker>
        );
      })}

      {play.routes.map((route) => {
        if (route.mode !== "drive" && route.mode !== "walk") return null;
        return (
          <Polyline
            key={route.memberId}
            positions={route.geometry.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: ICE,
              weight: route.mode === "drive" ? 3 : 2,
              opacity: 0.85,
              dashArray: route.mode === "walk" ? "6 8" : undefined,
            }}
          />
        );
      })}

      {play.routes.flatMap((route) =>
        (route.pickups ?? []).map((p) => {
          const rider = members.find((m) => m.id === p.memberId);
          if (!rider) return null;
          const done = tapeT >= p.atMinute;
          return (
            <CircleMarker
              key={`${route.memberId}-${p.memberId}`}
              center={[rider.location.lat, rider.location.lng]}
              radius={10}
              pathOptions={{ color: TAPE, fillColor: TAPE, fillOpacity: done ? 0.15 : 0, weight: 1.5, dashArray: "3 4" }}
            >
              <Tooltip direction="bottom" offset={[0, 8]} className="iso-label">
                {name(route.memberId)} picks up {rider.name.split(" ")[0]} @ {Math.round(p.atMinute)} min
              </Tooltip>
            </CircleMarker>
          );
        }),
      )}

      <CircleMarker
        center={[play.rally.location.lat, play.rally.location.lng]}
        radius={14}
        eventHandlers={{ click: () => onPickRally(forcedRallyId === play.rally.id ? null : play.rally.id) }}
        pathOptions={{
          color: forcedRallyId ? BONE : TAPE,
          fillColor: TAPE,
          fillOpacity: 0.95,
          weight: 3,
          className: isBurningAt(threat, play.rally.location, tapeT) ? "front-pulse" : undefined,
        }}
      >
        <Tooltip permanent direction="top" offset={[0, -12]} className="rally-label">
          MEET · {play.rally.name}
        </Tooltip>
      </CircleMarker>

      {members.map((m) => {
        const route = play.routes.find((r) => r.memberId === m.id);
        const pos = positions[m.id] ?? m.location;
        const atRally =
          route && route.mode !== "stranded" && Number.isFinite(route.minutes) && tapeT >= route.minutes && !editing;
        const waiting = route?.mode === "ride" && route.boardAtMinute !== undefined && tapeT < route.boardAtMinute;
        const burning = !editing && !atRally && isBurningAt(threat, pos, tapeT);
        const tone =
          route?.mode === "stranded"
            ? "ember"
            : atRally || m.status === "at-rally" || m.status === "safe"
              ? "tape"
              : waiting
                ? "hollow"
                : m.role === "volunteer"
                  ? "ash"
                  : "ice";
        return (
          <Marker
            key={m.id}
            position={[pos.lat, pos.lng]}
            icon={pin(m.name.slice(0, 1).toUpperCase(), tone, burning)}
            draggable={editing}
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                onDrag(m.id, { lat: ll.lat, lng: ll.lng });
              },
            }}
          >
            <Tooltip direction="right" offset={[14, 0]} className="iso-label">
              {m.name} · {route?.mode ?? m.role}
              {route?.mode === "ride" ? ` with ${name(route.driverId)}` : ""}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
