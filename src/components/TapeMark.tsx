"use client";

export default function TapeMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 16"
      className={className}
      aria-hidden
      fill="none"
    >
      <rect width="64" height="16" className="fill-tape" />
      <path d="M-4 0 L12 16 M8 0 L24 16 M20 0 L36 16 M32 0 L48 16 M44 0 L60 16 M56 0 L72 16" stroke="#161310" strokeWidth="3" />
    </svg>
  );
}
