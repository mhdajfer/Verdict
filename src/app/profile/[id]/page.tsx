"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api, Member, Sentiment } from "@/lib/api";
import { Skeleton, EmptyState } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { SentimentBadge } from "@/components/SentimentBadge";
import { useIdentity } from "@/components/IdentityProvider";

type Win = "all" | "month" | "week";
const WINDOWS: { key: Win; label: string }[] = [
  { key: "all", label: "All-time" },
  { key: "month", label: "This month" },
  { key: "week", label: "This week" },
];

interface Record {
  sentiment: Sentiment;
  rank: number;
  totalMembers: number;
  points: number;
  wins: number;
  appearances: number;
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { meId } = useIdentity();

  const [member, setMember] = useState<Member | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [window, setWindow] = useState<Win>("all");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(
    async (win: Win) => {
      setLoading(true);
      try {
        const r = await api.getDossier(id, win);
        setMember(r.member);
        setRecords(r.records);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    load(window);
  }, [load, window]);

  const totalPoints = records.reduce((s, r) => s + r.points, 0);
  const totalWins = records.reduce((s, r) => s + r.wins, 0);
  const active = records.filter((r) => r.points > 0);

  if (notFound) {
    return (
      <div className="px-4 pt-16 text-center">
        <p className="font-semibold">Member not found</p>
        <button className="btn-ghost mt-4" onClick={() => router.push("/members")}>
          Back to the Circle
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-5">
      <button onClick={() => router.back()} className="tap -ml-2 mb-3 flex items-center gap-1 text-muted">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span className="text-sm">Back</span>
      </button>

      {loading && !member ? (
        <>
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-[88px] w-[88px] rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="mt-6 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </>
      ) : member ? (
        <>
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar name={member.name} image={member.image} size="xl" ring={member.id === meId ? "#8b7bff" : undefined} />
            <div>
              <h1 className="text-2xl font-bold">{member.name}</h1>
              <p className="text-sm text-muted">
                {totalPoints} total pts · {totalWins} win{totalWins === 1 ? "" : "s"} ·{" "}
                {active.length} leaderboard{active.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {/* Window toggle */}
          <div className="mx-auto mt-5 grid max-w-xs grid-cols-3 gap-1 rounded-full border border-line p-1">
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

          {/* Roast record */}
          <p className="label mt-6 mb-2">Roast record</p>
          {records.length === 0 ? (
            <EmptyState title="No record yet" hint="This one's been running polls, not losing them." />
          ) : (
            <div className={`space-y-2 transition-opacity ${loading ? "opacity-60" : ""}`}>
              {records.map((rec) => (
                <motion.div
                  key={rec.sentiment.id}
                  layout
                  className="card flex items-center gap-3 p-3"
                  style={{ borderLeft: `3px solid ${rec.sentiment.color}` }}
                >
                  <div className="min-w-0 flex-1">
                    <SentimentBadge
                      label={rec.sentiment.label}
                      color={rec.sentiment.color}
                      emoji={rec.sentiment.emoji}
                      size="sm"
                    />
                    <p className="mt-1 text-xs text-muted">
                      {rec.appearances} appearance{rec.appearances === 1 ? "" : "s"} · {rec.wins} win
                      {rec.wins === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      #{rec.rank}
                      <span className="text-xs font-normal text-faint"> / {rec.totalMembers}</span>
                    </p>
                    <p className="text-xs text-muted">{rec.points} pts</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <div className="h-4" />
        </>
      ) : null}
    </div>
  );
}
