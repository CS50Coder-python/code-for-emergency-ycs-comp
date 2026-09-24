import type {
  FireHotspot,
  HouseholdMember,
  HouseholdProfile,
  NwsAlert,
  RallyCandidate,
} from "./types";

/** Palisades / Pacific Palisades night-ops scenario for judges. */
export const SCENARIO_CENTER = { lat: 34.0482, lng: -118.5265 };

export const DEMO_HOUSEHOLD: HouseholdProfile = {
  id: "huddle-palisades",
  name: "Reyes household",
  pets: ["Nori the shepherd"],
  vehicles: 1,
  notes: "One sedan. Rosa uses a walker and lives up-canyon. Leon is at after-school.",
  members: [
    {
      id: "maya",
      name: "Maya",
      role: "driver",
      status: "unaccounted",
      location: { lat: 34.0195, lng: -118.4912 },
      mobilityMinutes: 0,
      needs: ["car keys", "work laptop left behind — ignore"],
      phone: "+15551230001",
    },
    {
      id: "leon",
      name: "Leon",
      role: "school",
      status: "unaccounted",
      location: { lat: 34.0458, lng: -118.5088 },
      mobilityMinutes: 8,
      needs: ["pickup", "inhaler"],
      phone: "+15551230002",
    },
    {
      id: "abuela",
      name: "Rosa",
      role: "homebound",
      status: "needs-ride",
      location: { lat: 34.0538, lng: -118.5368 },
      mobilityMinutes: 18,
      needs: ["walker", "meds bag", "Nori"],
      phone: "+15551230003",
    },
    {
      id: "samir",
      name: "Samir",
      role: "walker",
      status: "unaccounted",
      location: { lat: 34.0411, lng: -118.5194 },
      mobilityMinutes: 4,
      needs: ["no car"],
      phone: "+15551230004",
    },
  ],
};

export const DEMO_FIRES: FireHotspot[] = [
  {
    id: "f1",
    location: { lat: 34.079, lng: -118.566 },
    brightness: 367,
    frp: 48,
    observedAt: new Date().toISOString(),
    source: "demo",
  },
  {
    id: "f2",
    location: { lat: 34.074, lng: -118.558 },
    brightness: 341,
    frp: 22,
    observedAt: new Date().toISOString(),
    source: "demo",
  },
  {
    id: "f3",
    location: { lat: 34.085, lng: -118.552 },
    brightness: 329,
    frp: 14,
    observedAt: new Date().toISOString(),
    source: "demo",
  },
];

export const RALLY_CANDIDATES: RallyCandidate[] = [
  {
    id: "will-rogers",
    name: "Will Rogers State Beach lot",
    kind: "lot",
    location: { lat: 34.0397, lng: -118.5362 },
  },
  {
    id: "paul-revere",
    name: "Paul Revere Charter pickup",
    kind: "school",
    location: { lat: 34.0449, lng: -118.5115 },
  },
  {
    id: "temescal",
    name: "Temescal Canyon turnout",
    kind: "turnout",
    location: { lat: 34.0526, lng: -118.5278 },
  },
  {
    id: "civic",
    name: "Santa Monica Civic staging",
    kind: "civic",
    location: { lat: 34.0102, lng: -118.4897 },
  },
  {
    id: "mesh-hub",
    name: "Neighbor mesh hub — San Vicente",
    kind: "mesh",
    location: { lat: 34.0308, lng: -118.5139 },
  },
  {
    id: "pch-south",
    name: "PCH southbound turnout",
    kind: "turnout",
    location: { lat: 34.0268, lng: -118.5184 },
  },
];

export const DEMO_WEATHER = {
  windKph: 38,
  windDeg: 320,
  humidity: 12,
  tempC: 28,
  aqi: 168,
};

/** Neighbors with empty seats. Claiming one adds them to the huddle as a driver. */
export const DEMO_VOLUNTEERS: HouseholdMember[] = [
  {
    id: "vol-dev",
    name: "Dev (San Vicente hub)",
    role: "volunteer",
    status: "unaccounted",
    location: { lat: 34.0308, lng: -118.5139 },
    mobilityMinutes: 2,
    needs: ["3 empty seats", "SUV"],
    phone: "+15551230010",
  },
  {
    id: "vol-priya",
    name: "Priya (Brentwood)",
    role: "volunteer",
    status: "unaccounted",
    location: { lat: 34.0522, lng: -118.4731 },
    mobilityMinutes: 3,
    needs: ["2 empty seats"],
    phone: "+15551230011",
  },
];

/** The scripted red flag warning for the Palisades night. */
export const DEMO_ALERTS: NwsAlert[] = [
  {
    id: "demo-redflag",
    event: "Red Flag Warning",
    headline:
      "Red Flag Warning: Santa Ana winds and critically low humidity across the Los Angeles County mountains and valleys.",
    severity: "Severe",
    instruction:
      "Avoid outdoor burning. Be ready to leave early. Wind-driven ember attack can jump containment.",
  },
];
