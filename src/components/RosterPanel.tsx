"use client";

import { Crosshair, Pencil, Plus, Trash2 } from "lucide-react";
import type { Huddle } from "@/hooks/useHuddle";
import type { HouseholdMember, MemberRole, MemberStatus } from "@/lib/types";
import HuddleRing from "./HuddleRing";

const ROLES: { v: MemberRole; label: string }[] = [
  { v: "driver", label: "driver" },
  { v: "walker", label: "walker" },
  { v: "school", label: "at school" },
  { v: "homebound", label: "homebound" },
  { v: "volunteer", label: "volunteer" },
];

const STATUSES: MemberStatus[] = ["unaccounted", "moving", "needs-ride", "at-rally", "safe"];

const MODE_LABEL: Record<string, string> = {
  drive: "drives",
  walk: "walks",
  ride: "rides",
  stranded: "stranded",
  arrived: "in",
};

/** The huddle ring plus one card per person, with edit mode. */
export default function RosterPanel({ h }: { h: Huddle }) {
  const { members, play, household, editing, setEditing, placing, setPlacing, actions } = h;
  const rideNames = (id: string) => members.find((m) => m.id === id)?.name ?? "";

  return (
    <div className="space-y-3">
      <HuddleRing members={members} rallyName={play.rally.name} windowMin={play.goWindowMinutes} />

      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-tape">
          {household.name}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            className={`flex cursor-pointer items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase tracking-wider ring-1 ${
              editing ? "bg-tape text-peat ring-tape" : "text-ash ring-bone/15 hover:text-bone"
            }`}
          >
            <Pencil size={11} /> {editing ? "done" : "edit"}
          </button>
          <button
            type="button"
            onClick={actions.addMember}
            className="flex cursor-pointer items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ash ring-1 ring-bone/15 hover:text-bone"
          >
            <Plus size={11} /> person
          </button>
        </div>
      </div>

      {editing && (
        <div className="space-y-2 border border-tape/40 bg-peat p-2">
          <label className="block font-mono text-[10px] uppercase tracking-wider text-ash">
            Household name
            <input
              value={household.name}
              onChange={(e) => actions.setHousehold((x) => ({ ...x, name: e.target.value.slice(0, 60) }))}
              className="mt-1 w-full border border-bone/15 bg-peat-2 px-2 py-1 font-sans text-sm text-bone outline-none focus:ring-2 focus:ring-tape"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-ash">
              Cars
              <input
                type="number"
                min={0}
                max={9}
                value={household.vehicles}
                onChange={(e) =>
                  actions.setHousehold((x) => ({ ...x, vehicles: Math.max(0, Math.min(9, Number(e.target.value) || 0)) }))
                }
                className="mt-1 w-full border border-bone/15 bg-peat-2 px-2 py-1 font-sans text-sm text-bone outline-none focus:ring-2 focus:ring-tape"
              />
            </label>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-ash">
              Pets
              <input
                value={household.pets.join(", ")}
                onChange={(e) =>
                  actions.setHousehold((x) => ({
                    ...x,
                    pets: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10),
                  }))
                }
                className="mt-1 w-full border border-bone/15 bg-peat-2 px-2 py-1 font-sans text-sm text-bone outline-none focus:ring-2 focus:ring-tape"
              />
            </label>
          </div>
          <p className="font-serif text-xs text-ash">
            Drag anyone on the map to move their start point, or use the crosshair to place them with a click.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {members.map((m) => {
          const route = play.routes.find((r) => r.memberId === m.id);
          return (
            <li
              key={m.id}
              className={`border bg-peat-2 px-3 py-2 ${
                route?.mode === "stranded" ? "border-ember/60" : "border-bone/10"
              }`}
            >
              {editing ? (
                <MemberEditor
                  m={m}
                  placing={placing === m.id}
                  onPlace={() => setPlacing(placing === m.id ? null : m.id)}
                  onChange={(patch) => actions.updateMember(m.id, patch)}
                  onRemove={() => actions.removeMember(m.id)}
                  removable={members.length > 1 && !h.claimed.some((c) => c.id === m.id)}
                />
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-ash">
                      {m.role} · {m.status.replace("-", " ")}
                      {route && (
                        <span className={route.mode === "stranded" ? "text-ember" : "text-ice"}>
                          {" "}
                          · {MODE_LABEL[route.mode]}
                          {route.mode === "ride" && route.driverId ? ` w/ ${rideNames(route.driverId).split(" ")[0]}` : ""}
                          {route.pickups?.length ? ` · picks up ${route.pickups.map((p) => rideNames(p.memberId).split(" ")[0]).join(", ")}` : ""}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => void actions.pulse(m, "go")}
                      className="cursor-pointer px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-tape ring-1 ring-tape/40 hover:bg-tape hover:text-peat"
                    >
                      Go
                    </button>
                    <button
                      type="button"
                      onClick={() => void actions.pulse(m, "here")}
                      className="cursor-pointer px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ice ring-1 ring-ice/40 hover:bg-ice hover:text-peat"
                    >
                      In
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MemberEditor({
  m,
  placing,
  onPlace,
  onChange,
  onRemove,
  removable,
}: {
  m: HouseholdMember;
  placing: boolean;
  onPlace: () => void;
  onChange: (patch: Partial<HouseholdMember>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const field =
    "border border-bone/15 bg-peat px-2 py-1 font-sans text-xs text-bone outline-none focus:ring-2 focus:ring-tape";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <input
          value={m.name}
          aria-label="Name"
          onChange={(e) => onChange({ name: e.target.value.slice(0, 40) })}
          className={`${field} min-w-0 flex-1`}
        />
        <button
          type="button"
          aria-label="Place on map"
          onClick={onPlace}
          className={`flex h-7 w-7 cursor-pointer items-center justify-center ring-1 ${
            placing ? "bg-tape text-peat ring-tape" : "text-ash ring-bone/15 hover:text-bone"
          }`}
        >
          <Crosshair size={12} />
        </button>
        {removable && (
          <button
            type="button"
            aria-label="Remove"
            onClick={onRemove}
            className="flex h-7 w-7 cursor-pointer items-center justify-center text-ash ring-1 ring-bone/15 hover:text-ember"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1">
        <select
          value={m.role}
          aria-label="Role"
          onChange={(e) => onChange({ role: e.target.value as MemberRole })}
          className={field}
        >
          {ROLES.map((r) => (
            <option key={r.v} value={r.v}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={m.status}
          aria-label="Status"
          onChange={(e) => onChange({ status: e.target.value as MemberStatus })}
          className={field}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("-", " ")}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 font-mono text-[10px] uppercase text-ash">
          <input
            type="number"
            min={0}
            max={120}
            value={m.mobilityMinutes}
            aria-label="Minutes to get moving"
            onChange={(e) => onChange({ mobilityMinutes: Math.max(0, Math.min(120, Number(e.target.value) || 0)) })}
            className={`${field} w-full`}
          />
          m
        </label>
      </div>
      <input
        value={m.needs.join(", ")}
        aria-label="Needs"
        placeholder="needs: meds, inhaler, dog…"
        onChange={(e) =>
          onChange({ needs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8) })
        }
        className={`${field} w-full`}
      />
    </div>
  );
}
