"use client";

import type { HouseholdMember } from "@/lib/types";

const ROLE: Record<string, string> = {
  driver: "WHEEL",
  walker: "FOOT",
  school: "HOLD",
  homebound: "WAIT",
  volunteer: "MESH",
};

export default function HuddleRing({
  members,
  rallyName,
  windowMin,
}: {
  members: HouseholdMember[];
  rallyName: string;
  windowMin: number;
}) {
  const n = members.length || 1;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <div className="absolute inset-[18%] rounded-full border border-tape/40" />
      <div className="absolute inset-[32%] rounded-full border border-ice/25" />
      <div className="absolute inset-[42%] flex flex-col items-center justify-center rounded-full bg-peat-2 text-center ring-2 ring-tape">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-tape">Rally</p>
        <p className="mt-1 max-w-[9rem] font-display text-lg leading-none text-bone">
          {windowMin}
          <span className="font-sans text-[10px] tracking-normal text-ash"> min</span>
        </p>
        <p className="mt-2 px-2 font-serif text-[11px] leading-tight text-ash">{rallyName}</p>
      </div>
      {members.map((m, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(a) * 42;
        const y = 50 + Math.sin(a) * 42;
        return (
          <div
            key={m.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                m.status === "needs-ride"
                  ? "border-tape bg-tape text-peat"
                  : m.status === "at-rally" || m.status === "safe"
                    ? "border-ice bg-ice text-peat"
                    : "border-bone/40 bg-peat-2 text-bone"
              }`}
            >
              {m.name.slice(0, 1)}
            </div>
            <p className="mt-1 text-center font-mono text-[9px] uppercase tracking-wider text-ash">
              {ROLE[m.role]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
