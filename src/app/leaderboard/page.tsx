"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api, Sentiment, LeaderboardRow, HallOfFameCard } from "@/lib/api";
import { PageHeader, Skeleton, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { SentimentBadge } from "@/components/SentimentBadge";
import { IdentityChip } from "@/components/IdentityChip";
import { withAlpha } from "@/lib/colors";

type Win = "all" | "month" | "week";
const WINDOWS: { key: Win; label: string }[] = [
  { key: "all", label: "All-time" },
  { key: "month", label: "This month" },
  { key: "week", label: "This week" },
];

export default function LeaderboardPage() {
  const [sentiments, setSentiments] = useState<Sentiment[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [window, setWindow] = useState<Win>("all");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [hall, setHall] = useState<HallOfFameCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);

  const load = useCallback(
    async (sentimentId: string | null, win: Win) => {
      setLoading(true);
      try {
        const r = await api.getLeaderboard({
          sentimentId: sentimentId || undefined,
          window: win,
        });
        setSentiments(r.sentiments);
        setActiveId(r.activeSentimentId);
        setRows(r.rows);
        setHall(r.hallOfFame);
      } finally {
        setLoading(false);
        setFirstLoad(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(activeId, window);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, window]);

  const active = sentiments.find((s) => s.id === activeId) || null;
  const maxPoints = Math.max(1, ...rows.map((r) => r.points));

  return (
    <div className="px-4">
      <PageHeader title="Leaderboard" subtitle="The all-time record" right={<IdentityChip />} />

      {firstLoad ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sentiments.length === 0 ? (
        <EmptyState
          title="No sentiments yet"
          hint="Create a poll with a tag like “Cringe” and the rankings begin."
          action={
            <Link href="/create" className="btn-primary">
              Create a poll
            </Link>
          }
        />
      ) : (
        <>
          {/* Hall of Fame */}
          {hall.some((c) => c.leader) && (
            <div className="no-scrollbar mb-4 flex gap-3 overflow-x-auto pb-1">
              {hall
                .filter((c) => c.leader)
                .map((c) => (
                  <div
                    key={c.sentiment.id}
                    className="card min-w-[220px] shrink-0 p-4"
                    style={{ borderLeft: `3px solid ${c.sentiment.color}` }}
                  >
                    <SentimentBadge
                      label={`Reigning ${c.sentiment.label}`}
                      color={c.sentiment.color}
                      emoji={c.sentiment.emoji}
                      size="sm"
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <Avatar name={c.leader!.name} image={c.leader!.image} size="lg" ring="#ffd76b" />
                      <div>
                        <p className="text-lg font-bold leading-tight">👑 {c.leader!.name}</p>
                        <p className="text-xs text-muted">
                          {c.leader!.points} pts · {c.leader!.wins} win
                          {c.leader!.wins === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Sentiment tabs */}
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
            {sentiments.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`tap shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  activeId === s.id ? "border-transparent" : "border-line text-muted"
                }`}
                style={activeId === s.id ? { backgroundColor: s.color, color: "#0b0b0f" } : {}}
              >
                {s.emoji ? `${s.emoji} ` : ""}
                {s.label}
              </button>
            ))}
          </div>

          {/* Window toggle */}
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-full border border-line p-1">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                onClick={() => setWindow(w.key)}
                className={`tap rounded-full py-2 text-xs font-semibold transition ${
                  window === w.key ? "bg-ink text-bg" : "text-muted"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Ranked list — every member always shown */}
          <motion.ol layout className="space-y-2">
            <AnimatePresence>
              {rows.map((row) => (
                <LeaderboardRowItem
                  key={row.memberId}
                  row={row}
                  color={active?.color ?? "#8b7bff"}
                  maxPoints={maxPoints}
                  dim={loading}
                />
              ))}
            </AnimatePresence>
          </motion.ol>
          <p className="mt-4 text-center text-[11px] text-faint">
            1 point per vote received · every member always ranked
          </p>
        </>
      )}
    </div>
  );
}

function LeaderboardRowItem({
  row,
  color,
  maxPoints,
  dim,
}: {
  row: LeaderboardRow;
  color: string;
  maxPoints: number;
  dim: boolean;
}) {
  const isTop = row.rank === 1 && row.points > 0;
  return (
    <motion.li
      layout
      layoutId={row.memberId}
      initial={{ opacity: 0 }}
      animate={{ opacity: dim ? 0.6 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
    >
      <Link
        href={`/profile/${row.memberId}`}
        className="card relative flex items-center gap-3 overflow-hidden p-3"
        style={isTop ? { boxShadow: "inset 3px 0 0 #ffd76b" } : {}}
      >
        {/* subtle points bar */}
        <div
          className="absolute inset-y-0 left-0 z-0"
          style={{
            width: `${(row.points / maxPoints) * 100}%`,
            backgroundColor: withAlpha(color, 0.08),
          }}
        />
        <span
          className={`relative z-10 w-6 text-center text-sm font-bold ${
            isTop ? "text-[#ffd76b]" : "text-muted"
          }`}
        >
          {row.rank}
        </span>
        <div className="relative z-10">
          <Avatar
            name={row.name}
            image={row.image}
            size={isTop ? "lg" : "md"}
            ring={isTop ? "#ffd76b" : undefined}
          />
        </div>
        <div className="relative z-10 min-w-0 flex-1">
          <p className="truncate font-semibold">{row.name}</p>
          <p className="text-xs text-muted">
            {row.wins} win{row.wins === 1 ? "" : "s"} · {row.appearances} poll
            {row.appearances === 1 ? "" : "s"}
          </p>
        </div>
        <div className="relative z-10 text-right">
          <p className="text-lg font-bold tabular-nums">{row.points}</p>
          <p className="text-[10px] uppercase tracking-wide text-faint">pts</p>
        </div>
      </Link>
    </motion.li>
  );
}
