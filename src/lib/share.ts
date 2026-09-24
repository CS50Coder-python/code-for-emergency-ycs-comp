import type { HouseholdProfile } from "./types";

type Packed = {
  n: string;
  p: string[];
  v: number;
  o: string;
  m: [string, string, string, string, number, number, number, string[], string][];
};

/** Compact, URL-safe encoding of a household so a family can share one link. */
export function encodeHousehold(h: HouseholdProfile): string {
  const compact: Packed = {
    n: h.name,
    p: h.pets,
    v: h.vehicles,
    o: h.notes,
    m: h.members.map((m) => [
      m.id,
      m.name,
      m.role,
      m.status,
      round(m.location.lat),
      round(m.location.lng),
      m.mobilityMinutes,
      m.needs,
      m.phone ?? "",
    ]),
  };
  return toBase64Url(JSON.stringify(compact));
}

export function decodeHousehold(token: string): HouseholdProfile | null {
  try {
    const raw = JSON.parse(fromBase64Url(token)) as Packed;
    if (!raw || !Array.isArray(raw.m) || raw.m.length === 0) return null;
    return {
      id: `shared-${hash(token)}`,
      name: String(raw.n ?? "Household").slice(0, 60),
      pets: (raw.p ?? []).map(String).slice(0, 10),
      vehicles: clampInt(raw.v, 0, 9, 1),
      notes: String(raw.o ?? "").slice(0, 300),
      members: raw.m.slice(0, 12).map((m, i) => ({
        id: String(m[0] || `m${i}`).slice(0, 24),
        name: String(m[1] || `Person ${i + 1}`).slice(0, 40),
        role: pick(m[2], ["driver", "walker", "school", "homebound", "volunteer"], "driver"),
        status: pick(
          m[3],
          ["unaccounted", "moving", "at-rally", "needs-ride", "safe"],
          "unaccounted",
        ),
        location: { lat: clampNum(m[4], -90, 90), lng: clampNum(m[5], -180, 180) },
        mobilityMinutes: clampInt(m[6], 0, 120, 0),
        needs: (m[7] ?? []).map(String).slice(0, 8),
        phone: m[8] ? String(m[8]).slice(0, 20) : undefined,
      })),
    };
  } catch {
    return null;
  }
}

function round(n: number) {
  return Math.round(n * 1e5) / 1e5;
}

function clampInt(v: unknown, lo: number, hi: number, dflt: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function clampNum(v: unknown, lo: number, hi: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(hi, Math.max(lo, n));
}

function pick<T extends string>(v: unknown, allowed: readonly T[], dflt: T): T {
  return allowed.includes(v as T) ? (v as T) : dflt;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function toBase64Url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 =
    typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin =
    typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
