"use client";

export default function GoClock({
  minutes,
  threat,
  stranded,
}: {
  minutes: number;
  threat: number;
  stranded: number;
}) {
  const urgent = minutes < 20;
  return (
    <div className="tape-band relative overflow-hidden px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-peat/70">
        Go window · slack vs modeled arrival
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="font-display text-6xl leading-none text-peat">
          {minutes}
          <span className="ml-1 font-sans text-sm tracking-normal">min</span>
        </p>
        <p className="max-w-[10rem] text-right font-serif text-sm text-peat/80">
          {stranded > 0
            ? `${stranded} ${stranded === 1 ? "person has" : "people have"} no car that beats the front. Mesh now.`
            : urgent
              ? "Leave now. Waiting for family at home is the failure mode."
              : "You still have a huddle. Do not spend it packing."}
        </p>
      </div>
      <div className="mt-3 h-1.5 bg-peat/20">
        <div
          className="h-full bg-peat"
          style={{ width: `${Math.min(100, Math.max(8, (1 - threat) * 100))}%` }}
        />
      </div>
    </div>
  );
}
