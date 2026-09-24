import { destination } from "./geo";
import type {
  CandidateScore,
  FireHotspot,
  HouseholdMember,
  HouseholdProfile,
  HuddlePlay,
  LatLng,
  NwsAlert,
  RallyCandidate,
  WeatherNow,
} from "./types";
import type { Isochrone } from "./spread";

const STORAGE_KEY = "rally.household.v2";

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type Scene = {
  weather: WeatherNow | null;
  fires: FireHotspot[] | null;
  firesSource: string;
  alerts: NwsAlert[];
  alertsSource: string;
  weatherSource: string;
};

/** Weather, hotspots and alerts for a center, all in parallel. */
export async function fetchScene(center: LatLng): Promise<Scene> {
  const q = `lat=${center.lat.toFixed(4)}&lng=${center.lng.toFixed(4)}`;
  const [w, f, a] = await Promise.all([
    getJson<{ source: string; weather: WeatherNow }>(`/api/weather?${q}`),
    getJson<{ source: string; fires: FireHotspot[] }>(`/api/fires?${q}`),
    getJson<{ source: string; alerts: NwsAlert[] }>(`/api/alerts?${q}`),
  ]);
  return {
    weather: w?.weather ?? null,
    weatherSource: w?.source ?? "offline",
    fires: f?.fires ?? null,
    firesSource: f?.source ?? "offline",
    alerts: a?.alerts ?? [],
    alertsSource: a?.source ?? "offline",
  };
}

export async function fetchPlaces(center: LatLng) {
  const q = `lat=${center.lat.toFixed(4)}&lng=${center.lng.toFixed(4)}`;
  const r = await getJson<{ source: string; candidates: RallyCandidate[] }>(`/api/places?${q}`);
  return { source: r?.source ?? "offline", candidates: r?.candidates ?? [] };
}

export type HuddleResponse = {
  play: HuddlePlay;
  ranked: CandidateScore[];
  routes: "osrm" | "estimate";
  isochrones: Isochrone[];
  downwind: number;
};

export async function fetchHuddle(body: {
  members: HouseholdMember[];
  weather: WeatherNow;
  fires: FireHotspot[];
  candidates: RallyCandidate[];
}) {
  return getJson<HuddleResponse>("/api/huddle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function fetchPlan(body: {
  household: HouseholdProfile;
  play: HuddlePlay;
  weather: WeatherNow;
  alerts: NwsAlert[];
}) {
  return getJson<{ source: string; plan: string }>("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function geocode(q: string) {
  const r = await getJson<{ result: { lat: number; lng: number; name: string } | null }>(
    `/api/geocode?q=${encodeURIComponent(q)}`,
  );
  return r?.result ?? null;
}

export async function sendPulse(to: string, body: string) {
  const r = await getJson<{ status: string; id: string; error?: string }>("/api/sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, body }),
  });
  return r ?? { status: "simulated", id: `local-${Date.now()}` };
}

export function locate(): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}

export function saveHousehold(h: HouseholdProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch {
    /* private mode or quota: the play still works in memory */
  }
}

export function loadHousehold(): HouseholdProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const h = JSON.parse(raw) as HouseholdProfile;
    return Array.isArray(h?.members) && h.members.length ? h : null;
  } catch {
    return null;
  }
}

export function clearHousehold() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Two neighbors with spare seats near a live center, for the mesh page. */
export function volunteersAround(center: LatLng): HouseholdMember[] {
  return [
    {
      id: "vol-a",
      name: "Neighbor A (2 seats)",
      role: "volunteer",
      status: "unaccounted",
      location: destination(center, 200, 1.6),
      mobilityMinutes: 2,
      needs: ["2 empty seats"],
    },
    {
      id: "vol-b",
      name: "Neighbor B (SUV)",
      role: "volunteer",
      status: "unaccounted",
      location: destination(center, 320, 2.2),
      mobilityMinutes: 3,
      needs: ["3 empty seats"],
    },
  ];
}

export function newMember(id: string, location: LatLng): HouseholdMember {
  return {
    id,
    name: "New person",
    role: "walker",
    status: "unaccounted",
    location,
    mobilityMinutes: 0,
    needs: [],
  };
}
