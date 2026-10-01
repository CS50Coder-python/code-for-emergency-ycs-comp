import type { Level } from "@/lib/risk";

const COLOR: Record<Level, string> = {
  Low: "var(--low)",
  Moderate: "var(--moderate)",
  High: "var(--high)",
  Extreme: "var(--extreme)",
};

// A half-circle gauge. The arc fills from 0 to 100.
export default function Gauge({ score, level, label }: { score: number; level: Level; label: string }) {
  const r = 54;
  const length = Math.PI * r; // half circumference
  const filled = (Math.min(100, Math.max(0, score)) / 100) * length;
  return (
    <svg className="gauge" viewBox="0 0 140 84" role="img" aria-label={`${label}, ${score} of 100`}>
      <path d="M16 70 A54 54 0 0 1 124 70" fill="none" stroke="var(--line)" strokeWidth="12" strokeLinecap="round" />
      <path
        d="M16 70 A54 54 0 0 1 124 70"
        fill="none"
        stroke={COLOR[level]}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${length}`}
      />
      <text x="70" y="62" textAnchor="middle" className="gauge-n">{score}</text>
      <text x="70" y="80" textAnchor="middle" className="gauge-l">{label}</text>
    </svg>
  );
}
