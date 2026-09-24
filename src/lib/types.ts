export type LatLng = { lat: number; lng: number };

export type MemberRole =
  | "driver"
  | "walker"
  | "school"
  | "homebound"
  | "volunteer";

export type MemberStatus =
  | "unaccounted"
  | "moving"
  | "at-rally"
  | "needs-ride"
  | "safe";

export type HouseholdMember = {
  id: string;
  name: string;
  role: MemberRole;
  status: MemberStatus;
  location: LatLng;
  mobilityMinutes: number;
  needs: string[];
  phone?: string;
};

export type FireHotspot = {
  id: string;
  location: LatLng;
  brightness: number;
  frp: number;
  observedAt: string;
  source: "firms" | "demo";
};

export type WeatherNow = {
  windKph: number;
  windDeg: number;
  gustKph?: number | null;
  humidity: number;
  tempC: number;
  aqi: number | null;
};

export type NwsAlert = {
  id: string;
  event: string;
  headline: string;
  severity: string;
  instruction: string;
};

export type RallyCandidate = {
  id: string;
  name: string;
  kind: "school" | "lot" | "civic" | "turnout" | "mesh";
  location: LatLng;
};

export type RouteMode = "drive" | "walk" | "ride" | "stranded" | "arrived";

export type PlayRoute = {
  memberId: string;
  geometry: LatLng[];
  /** Minutes until this member is at the rally point. */
  minutes: number;
  distanceKm: number;
  source: "osrm" | "estimate";
  mode: RouteMode;
  /** For riders: who collects them and when the car reaches their door. */
  driverId?: string;
  boardAtMinute?: number;
  /** For drivers: the doors they stop at, in order. */
  pickups?: { memberId: string; atMinute: number }[];
};

export type HuddlePlay = {
  rally: RallyCandidate;
  goWindowMinutes: number;
  slackMinutes: number;
  routes: PlayRoute[];
  threat: number;
  rationale: string;
};

export type HouseholdProfile = {
  id: string;
  name: string;
  pets: string[];
  vehicles: number;
  notes: string;
  members: HouseholdMember[];
};

export type MeshRequest = {
  id: string;
  memberId: string;
  memberName: string;
  need: string;
  location: LatLng;
  claimedBy: string | null;
};

export type PulseEvent = {
  id: string;
  at: string;
  channel: "sms" | "app";
  to: string;
  body: string;
  status: "sent" | "simulated";
};

export type CandidateScore = {
  rally: RallyCandidate;
  impactMinutes: number;
  slowestMinutes: number;
  slowestMemberId: string | null;
  slackMinutes: number;
  score: number;
  /** The reason this candidate lost, empty for the winner. */
  verdict: string;
};

export type Scenario = {
  id: string;
  name: string;
  center: LatLng;
  /** "demo" = Palisades night ops; "live" = user location or search. */
  kind: "demo" | "live";
};

export type TapeOutcome = {
  memberId: string;
  name: string;
  arrivesAtMinute: number;
  fireAtRallyMinute: number;
  marginMinutes: number;
  makesIt: boolean;
};

export type SourceStatus = {
  fires: string;
  weather: string;
  alerts: string;
  routes: string;
  places: string;
};
