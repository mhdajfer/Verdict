"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { api, SerializedPoll, Sentiment } from "@/lib/api";
import { PageHeader, Skeleton, EmptyState } from "@/components/ui";
import { IdentityChip } from "@/components/IdentityChip";
import { PollCard } from "@/components/PollCard";

type StatusFilter = "" | "open" | "closed";

export default function PollsFeedPage() {
  const [polls, setPolls] = useState<SerializedPoll[]>([]);
  const [sentiments, setSentiments] = useState<Sentiment[]>([]);
  const [sentimentId, setSentimentId] = useState<string>("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        api.getPolls({ sentimentId: sentimentId || undefined, status: status || undefined }),
        api.getSentiments(),
      ]);
      setPolls(p.polls);
      setSentiments(s.sentiments);
    } finally {
      setLoading(false);
    }
  }, [sentimentId, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="px-4">
      <PageHeader title="Polls" subtitle="The verdict is in" right={<IdentityChip />} />

      {/* Filters */}
      <div className="mb-4 space-y-2">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Chip active={status === ""} onClick={() => setStatus("")}>All</Chip>
          <Chip active={status === "open"} onClick={() => setStatus("open")}>Live</Chip>
          <Chip active={status === "closed"} onClick={() => setStatus("closed")}>Closed</Chip>
        </div>
        {sentiments.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            <Chip active={sentimentId === ""} onClick={() => setSentimentId("")}>
              Every tag
            </Chip>
            {sentiments.map((s) => (
              <Chip
                key={s.id}
                active={sentimentId === s.id}
                onClick={() => setSentimentId(s.id)}
                color={s.color}
              >
                {s.emoji ? `${s.emoji} ` : ""}
                {s.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : polls.length === 0 ? (
        <EmptyState
          title="No polls yet"
          hint="Start the chaos — create the first poll for your circle."
          action={
            <Link href="/create" className="btn-primary">
              Create a poll
            </Link>
          }
        />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence>
            {polls.map((p) => (
              <PollCard key={p.id} poll={p} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`tap shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active ? "border-ink bg-ink text-bg" : "border-line text-muted active:bg-surface2"
      }`}
      style={active && color ? { backgroundColor: color, borderColor: color, color: "#0b0b0f" } : {}}
    >
      {children}
    </button>
  );
}
