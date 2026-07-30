"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SerializedPoll } from "@/lib/api";
import { SentimentBadge } from "./SentimentBadge";
import { Avatar } from "./Avatar";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function PollCard({ poll }: { poll: SerializedPoll }) {
  const closed = poll.isEffectivelyClosed;
  const top = poll.results.slice(0, 4);

  return (
    <motion.div layout>
      <Link href={`/polls/${poll.id}`} className="block">
        <div
          className="card p-4 active:bg-surface2 transition"
          style={{ borderLeft: `3px solid ${poll.sentiment.color}` }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <SentimentBadge
              label={poll.sentiment.label}
              color={poll.sentiment.color}
              emoji={poll.sentiment.emoji}
              size="sm"
            />
            <span className={`text-[11px] font-medium ${closed ? "text-faint" : "text-emerald"}`}>
              {closed ? "Closed" : "Live"}
            </span>
          </div>

          <p className="text-base font-semibold leading-snug">{poll.question}</p>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2">
              {top.map((r) => (
                <div key={r.optionId} className="rounded-full ring-2 ring-surface">
                  <Avatar
                    name={r.name}
                    image={r.image}
                    size="sm"
                    ring={r.isWinner && closed ? "#ffd76b" : undefined}
                  />
                </div>
              ))}
            </div>
            <div className="ml-auto text-right">
              {closed && poll.winnerNames.length > 0 ? (
                <p className="text-xs">
                  <span className="text-faint">👑 </span>
                  <span className="font-semibold">{poll.winnerNames.join(", ")}</span>
                </p>
              ) : null}
              <p className="text-[11px] text-muted">
                {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"} · {timeAgo(poll.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
