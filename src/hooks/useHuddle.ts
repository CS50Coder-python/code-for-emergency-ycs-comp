"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEMO_ALERTS,
  DEMO_FIRES,
  DEMO_HOUSEHOLD,
  DEMO_VOLUNTEERS,
  DEMO_WEATHER,
  RALLY_CANDIDATES,
} from "@/lib/demo";
import { destination } from "@/lib/geo";
import {
  clearHousehold,
  fetchHuddle,
  fetchPlaces,
  fetchPlan,
  fetchScene,
  geocode,
  loadHousehold,
  locate,
  newMember,
  saveHousehold,
  sendPulse,
  volunteersAround,
  type HuddleResponse,
} from "@/lib/huddle-client";
import { composePlan } from "@/lib/plan";
import { rankCandidates, solveHuddle } from "@/lib/rally-solver";
import {
  householdAround,
  isNearPalisades,
  PALISADES,
  redFlagDrill,
  synthesizeFires,
  syntheticCandidates,
} from "@/lib/scenario";
import { decodeHousehold, encodeHousehold } from "@/lib/share";
import { buildThreatField } from "@/lib/spread";
import { TAPE_LENGTH_MINUTES } from "@/lib/tape";
import type {
  FireHotspot,
  HouseholdMember,
  HouseholdProfile,
  LatLng,
  NwsAlert,
  PulseEvent,
  RallyCandidate,
  Scenario,
  SourceStatus,
  WeatherNow,
} from "@/lib/types";

export type PulseKind = "go" | "here" | "need";

/** Everything the solver input depends on, so async results can be matched to it. */
function signature(
  members: HouseholdMember[],
  weather: WeatherNow,
  fires: FireHotspot[],
  candidates: RallyCandidate[],
) {
  return JSON.stringify([
    members.map((m) => [m.id, m.role, m.status, m.mobilityMinutes, m.location.lat, m.location.lng]),
    [weather.windKph, weather.windDeg, weather.humidity],
    fires.map((f) => [f.id, f.location.lat, f.location.lng, f.frp]),
    candidates.map((c) => c.id),
  ]);
}

export function useHuddle() {
  const [scenario, setScenario] = useState<Scenario>(PALISADES);
  const [household, setHouseholdState] = useState<HouseholdProfile>(DEMO_HOUSEHOLD);
  const [volunteers, setVolunteers] = useState<HouseholdMember[]>(DEMO_VOLUNTEERS);
  const [claimed, setClaimed] = useState<HouseholdMember[]>([]);
  const [fires, setFires] = useState<FireHotspot[]>(DEMO_FIRES);
  const [weather, setWeather] = useState<WeatherNow>(DEMO_WEATHER);
  const [alerts, setAlerts] = useState<NwsAlert[]>([]);
  const [candidates, setCandidates] = useState<RallyCandidate[]>(RALLY_CANDIDATES);
  const [forcedRallyId, setForcedRallyId] = useState<string | null>(null);
  const [server, setServer] = useState<{ sig: string; res: HuddleResponse } | null>(null);
  const [llmPlan, setLlmPlan] = useState<{ sig: string; text: string } | null>(null);
  const [sources, setSources] = useState<SourceStatus>({
    fires: "demo",
    weather: "demo",
    alerts: "demo",
    routes: "estimate",
    places: "demo",
  });
  const [busy, setBusy] = useState<"scene" | "routes" | null>(null);
  const [pulses, setPulses] = useState<PulseEvent[]>([]);
  const [tape, setTape] = useState({ t: 0, playing: false, speed: 3 });
  const [editing, setEditing] = useState(false);
  const [placing, setPlacing] = useState<string | null>(null);
  const [you, setYou] = useState("Volunteer");
  const [notice, setNotice] = useState<string | null>(null);
  const [sceneVersion, setSceneVersion] = useState(0);
  const hydrated = useRef(false);

  const members = useMemo(() => [...household.members, ...claimed], [household.members, claimed]);

  const threat = useMemo(
    () => buildThreatField(fires, weather, members[0]?.location ?? scenario.center),
    [fires, weather, members, scenario.center],
  );

  const activeCandidates = useMemo(
    () => (forcedRallyId ? candidates.filter((c) => c.id === forcedRallyId) : candidates),
    [candidates, forcedRallyId],
  );

  const sig = useMemo(
    () => signature(members, weather, fires, activeCandidates),
    [members, weather, fires, activeCandidates],
  );

  const localPlay = useMemo(
    () => solveHuddle({ members, candidates: activeCandidates, threat }),
    [members, activeCandidates, threat],
  );
  const localRanked = useMemo(
    () => rankCandidates({ members, candidates, threat }),
    [members, candidates, threat],
  );

  const fresh = server && server.sig === sig ? server.res : null;
  const play = fresh?.play ?? localPlay;
  const ranked = fresh?.ranked ?? localRanked;

  const rulesPlan = useMemo(
    () => composePlan({ household: { ...household, members }, play, weather, alerts }),
    [household, members, play, weather, alerts],
  );
  const planSig = `${sig}|${play.rally.id}|${household.name}`;
  const plan =
    llmPlan && llmPlan.sig === planSig
      ? { text: llmPlan.text, source: "llm" }
      : { text: rulesPlan, source: "rules" };

  const loadScene = useCallback(async (sc: Scenario, keepHousehold?: HouseholdProfile) => {
    setBusy("scene");
    setForcedRallyId(null);
    setClaimed([]);
    setTape({ t: 0, playing: false, speed: 3 });
    const live = sc.kind === "live";
    const scene = await fetchScene(sc.center);
    // The Palisades scene is a scripted Santa Ana night. Live scenes take today's
    // wind direction; without a real detection they become a red-flag drill.
    let f = live ? (scene.fires ?? []) : DEMO_FIRES;
    let firesSource = live ? scene.firesSource : "scripted";
    const drill = live && !f.length;
    const liveWeather = scene.weather ?? DEMO_WEATHER;
    const w = !live ? DEMO_WEATHER : drill ? redFlagDrill(liveWeather) : liveWeather;
    const weatherSource = !live
      ? "scripted"
      : drill
        ? `${scene.weatherSource} · red flag drill`
        : scene.weatherSource;
    if (drill) {
      f = synthesizeFires(sc.center, w);
      firesSource = "drill";
    }
    const alerts = live ? scene.alerts : DEMO_ALERTS;
    const alertsSource = live ? scene.alertsSource : "scripted";

    let places: RallyCandidate[] = RALLY_CANDIDATES;
    let placesSource = "demo";
    if (live) {
      const p = await fetchPlaces(sc.center);
      placesSource = p.candidates.length ? p.source : "synthetic";
      places =
        p.candidates.length >= 3
          ? p.candidates
          : [...p.candidates, ...syntheticCandidates(sc.center, w)];
    }

    setWeather(w);
    setAlerts(alerts);
    setFires(f);
    setCandidates(places);
    setVolunteers(live ? volunteersAround(sc.center) : DEMO_VOLUNTEERS);
    setSources({
      fires: firesSource,
      weather: weatherSource,
      alerts: alertsSource,
      routes: "estimate",
      places: placesSource,
    });
    setHouseholdState(keepHousehold ?? (live ? householdAround(sc.center) : DEMO_HOUSEHOLD));
    setSceneVersion((v) => v + 1);
    setBusy(null);
  }, []);

  const goLive = useCallback(
    async (center: LatLng, name: string, keep?: HouseholdProfile) => {
      const sc: Scenario = {
        id: `live-${center.lat.toFixed(3)}-${center.lng.toFixed(3)}`,
        name,
        center,
        kind: isNearPalisades(center) ? "demo" : "live",
      };
      setScenario(sc);
      const nearby = keep?.members.some((m) => Math.abs(m.location.lat - center.lat) < 0.5);
      await loadScene(sc, nearby ? keep : undefined);
    },
    [loadScene],
  );

  /* Hydrate once: a shared household from the URL, else the saved one. */
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    // Deferred so the first scene load is not a synchronous state cascade.
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("h");
      const saved = (token ? decodeHousehold(token) : null) ?? loadHousehold() ?? undefined;
      const at = params.get("at");
      if (at) {
        const [lat, lng] = at.split(",").map(Number);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          void goLive({ lat, lng }, params.get("name") ?? "Shared location", saved);
          return;
        }
      }
      void loadScene(PALISADES, saved);
    }, 0);
  }, [goLive, loadScene]);

  const useMyLocation = useCallback(async () => {
    setNotice("Asking your browser for a location…");
    const here = await locate();
    if (!here) {
      setNotice("Location blocked. Try searching a place instead.");
      return;
    }
    setNotice(null);
    await goLive(here, "Your location");
  }, [goLive]);

  const searchPlace = useCallback(
    async (q: string) => {
      setNotice(`Searching “${q}”…`);
      const hit = await geocode(q);
      if (!hit) {
        setNotice("No match. Try a city or a street address.");
        return;
      }
      setNotice(null);
      await goLive({ lat: hit.lat, lng: hit.lng }, hit.name);
    },
    [goLive],
  );

  const resetDemo = useCallback(async () => {
    clearHousehold();
    setScenario(PALISADES);
    await loadScene(PALISADES);
  }, [loadScene]);

  /* Real roads: debounce, then ask the server to route the current play. */
  useEffect(() => {
    if (busy === "scene") return;
    const mySig = sig;
    const handle = setTimeout(async () => {
      setBusy((b) => b ?? "routes");
      const res = await fetchHuddle({ members, weather, fires, candidates: activeCandidates });
      if (res) {
        setServer({ sig: mySig, res });
        setSources((s) => ({ ...s, routes: res.routes }));
      }
      setBusy((b) => (b === "routes" ? null : b));
    }, 500);
    return () => clearTimeout(handle);
  }, [sig, busy, members, weather, fires, activeCandidates]);

  /* Model rewrite of the plan, when the server has a key. */
  useEffect(() => {
    const mySig = planSig;
    const full: HouseholdProfile = { ...household, members };
    const handle = setTimeout(async () => {
      const res = await fetchPlan({ household: full, play, weather, alerts });
      if (res?.source === "llm") setLlmPlan({ sig: mySig, text: res.plan });
    }, 900);
    return () => clearTimeout(handle);
  }, [planSig, household, members, play, weather, alerts]);

  /* Tape transport. One real second = `speed` play minutes. */
  useEffect(() => {
    if (!tape.playing) return;
    const id = setInterval(() => {
      setTape((s) => {
        const next = s.t + s.speed / 10;
        if (next >= TAPE_LENGTH_MINUTES) return { ...s, t: TAPE_LENGTH_MINUTES, playing: false };
        return { ...s, t: next };
      });
    }, 100);
    return () => clearInterval(id);
  }, [tape.playing]);

  const setHousehold = useCallback((update: (h: HouseholdProfile) => HouseholdProfile) => {
    setHouseholdState((h) => {
      const next = update(h);
      saveHousehold(next);
      return next;
    });
  }, []);

  const updateMember = useCallback(
    (id: string, patch: Partial<HouseholdMember>) => {
      if (claimed.some((c) => c.id === id)) {
        setClaimed((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
        return;
      }
      setHousehold((h) => ({
        ...h,
        members: h.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }));
    },
    [claimed, setHousehold],
  );

  const addMember = useCallback(() => {
    const id = `p${Date.now().toString(36)}`;
    const anchor = members[0]?.location ?? scenario.center;
    setHousehold((h) => ({
      ...h,
      members: [...h.members, newMember(id, destination(anchor, Math.random() * 360, 0.6))],
    }));
    setEditing(true);
    setPlacing(id);
  }, [members, scenario.center, setHousehold]);

  const removeMember = useCallback(
    (id: string) => {
      setHousehold((h) => ({ ...h, members: h.members.filter((m) => m.id !== id) }));
    },
    [setHousehold],
  );

  const placeMember = useCallback(
    (id: string, location: LatLng) => {
      updateMember(id, { location });
      setPlacing(null);
    },
    [updateMember],
  );

  const claim = useCallback(
    (volunteerId: string) => {
      const v = volunteers.find((x) => x.id === volunteerId);
      if (!v) return;
      setVolunteers((vs) => vs.filter((x) => x.id !== volunteerId));
      setClaimed((cs) => [...cs, { ...v, name: `${v.name} · ${you || "claimed"}` }]);
    },
    [volunteers, you],
  );

  const release = useCallback(
    (id: string) => {
      const v = claimed.find((x) => x.id === id);
      if (!v) return;
      setClaimed((cs) => cs.filter((x) => x.id !== id));
      setVolunteers((vs) => [...vs, { ...v, name: v.name.split(" · ")[0] }]);
    },
    [claimed],
  );

  const pulse = useCallback(
    async (member: HouseholdMember, kind: PulseKind) => {
      const body =
        kind === "go"
          ? `RALLY GO: Meet at ${play.rally.name} in ${play.goWindowMinutes} min. Do not wait at home.`
          : kind === "here"
            ? `${member.name} is AT RALLY — ${play.rally.name}. Stop hunting.`
            : `${member.name} needs a ride near ${scenario.name}. Claim a seat in Rally.`;
      const res = await sendPulse(member.phone ?? "+15550000000", body);
      setPulses((p) =>
        [
          {
            id: res.id ?? `${Date.now()}`,
            at: new Date().toISOString(),
            channel: "sms" as const,
            to: member.name,
            body,
            status: res.status === "sent" ? ("sent" as const) : ("simulated" as const),
          },
          ...p,
        ].slice(0, 30),
      );
      if (kind === "here") updateMember(member.id, { status: "at-rally" });
      if (kind === "go" && member.status === "unaccounted") {
        updateMember(member.id, { status: "moving" });
      }
      if (kind === "need") updateMember(member.id, { status: "needs-ride" });
    },
    [play, scenario.name, updateMember],
  );

  /** Path only, so server and client render the same links; add the origin when copying. */
  const sharePath = useMemo(() => {
    const q = new URLSearchParams();
    q.set("h", encodeHousehold(household));
    if (scenario.kind === "live") {
      q.set("at", `${scenario.center.lat.toFixed(4)},${scenario.center.lng.toFixed(4)}`);
      q.set("name", scenario.name);
    }
    return `?${q.toString()}`;
  }, [household, scenario]);

  return {
    scenario,
    sceneVersion,
    household,
    members,
    claimed,
    volunteers,
    fires,
    weather,
    alerts,
    candidates,
    forcedRallyId,
    setForcedRallyId,
    threat,
    play,
    ranked,
    plan,
    sources,
    busy,
    pulses,
    tape,
    setTape,
    editing,
    setEditing,
    placing,
    setPlacing,
    you,
    setYou,
    notice,
    setNotice,
    sharePath,
    actions: {
      useMyLocation,
      searchPlace,
      resetDemo,
      reload: () => loadScene(scenario, household),
      updateMember,
      addMember,
      removeMember,
      placeMember,
      setHousehold,
      claim,
      release,
      pulse,
    },
  };
}

export type Huddle = ReturnType<typeof useHuddle>;
