"use client";

import { withAlpha } from "@/lib/colors";

export function SentimentBadge({
  label,
  color,
  emoji,
  size = "md",
}: {
  label: string;
  color: string;
  emoji?: string | null;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${pad}`}
      style={{
        color,
        backgroundColor: withAlpha(color, 0.14),
        boxShadow: `inset 0 0 0 1px ${withAlpha(color, 0.35)}`,
      }}
    >
      {emoji ? <span className="leading-none">{emoji}</span> : null}
      {label}
    </span>
  );
}
