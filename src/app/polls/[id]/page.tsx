"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { api, SerializedPoll, Member } from "@/lib/api";
import { Skeleton, Toast, Sheet } from "@/components/ui";
import { SentimentBadge } from "@/components/SentimentBadge";
import { Avatar } from "@/components/Avatar";
import { useIdentity } from "@/components/IdentityProvider";
import { withAlpha } from "@/lib/colors";

export default function VotingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { meId, ready, setMe } = useIdentity();

  const [poll, setPoll] = useState<SerializedPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [myOptionId, setMyOptionId] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pickMe, setPickMe] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  const localKey = `verdict:vote:${id}`;

  const load = useCallback(async () => {
    try {
      const { poll } = await api.getPoll(id);
      setPoll(poll);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    api.getMembers().then((r) => setMembers(r.members)).catch(() => {});
  }, [load]);

  // Determine my current vote: server truth (visible polls) or local memory.
  useEffect(() => {
    if (!poll || !ready) return;
    let mine: string | null = null;
    if (meId && poll.voterChoices && poll.voterChoices[meId]) {
      mine = poll.voterChoices[meId];
    } else {
      try {
        mine = localStorage.getItem(localKey);
      } catch {
        /* ignore */
      }
    }
    // Make sure it's still a valid option.
    if (mine && !poll.results.find((r) => r.optionId === mine)) mine = null;
    setMyOptionId(mine);
  }, [poll, meId, ready, localKey]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  }

  const closed = poll?.isEffectivelyClosed ?? false;
  const hasVoted = !!myOptionId;
  const resultsVisible = poll
    ? closed || (poll.showLiveResults && hasVoted)
    : false;

  async function castVote(optionId: string) {
    if (!poll) return;
    if (closed) {
      flash("This poll is closed");
      return;
    }
    if (!meId) {
      setPickMe(true);
      return;
    }
    // optimistic UI
    const prev = myOptionId;
    setMyOptionId(optionId);
    setJustVoted(true);
    setTimeout(() => setJustVoted(false), 500);
    try {
      const { poll: updated } = await api.vote(poll.id, optionId, meId);
      setPoll(updated);
      try {
        localStorage.setItem(localKey, optionId);
      } catch {
        /* ignore */
      }
    } catch (e) {
      setMyOptionId(prev);
      flash((e as Error).message);
    }
  }

  async function toggleClose() {
    if (!poll) return;
    try {
      const { poll: updated } = await api.setPollStatus(
        poll.id,
        poll.status === "closed" ? "open" : "closed",
      );
      setPoll(updated);
      flash(updated.status === "closed" ? "Poll closed" : "Poll reopened");
    } catch (e) {
      flash((e as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-3 h-16 w-full" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !poll) {
    return (
      <div className="px-4 pt-16 text-center">
        <p className="font-semibold">Poll not found</p>
        <button className="btn-ghost mt-4" onClick={() => router.push("/")}>
          Back to polls
        </button>
      </div>
    );
  }

  const me = members.find((m) => m.id === meId) || null;

  return (
    <div className="px-4 pt-5">
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="tap -ml-2 flex items-center gap-1 text-muted">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="text-sm">Back</span>
        </button>
        <button onClick={toggleClose} className="tap text-sm font-medium text-muted underline">
          {poll.status === "closed" ? "Reopen" : "Close poll"}
        </button>
      </div>

      {/* Question */}
      <SentimentBadge
        label={poll.sentiment.label}
        color={poll.sentiment.color}
        emoji={poll.sentiment.emoji}
      />
      <h1 className="mt-3 text-2xl font-bold leading-tight">{poll.question}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className={closed ? "text-faint" : "text-emerald"}>{closed ? "Closed" : "Live"}</span>
        <span>·</span>
        <span>{poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}</span>
        <span>·</span>
        <span>{poll.anonymous ? "Anonymous" : "Votes visible"}</span>
        {poll.closesAt && !closed && (
          <>
            <span>·</span>
            <Countdown iso={poll.closesAt} onExpire={load} />
          </>
        )}
      </div>

      {/* Identity nudge */}
      {ready && !meId && (
        <button
          onClick={() => setPickMe(true)}
          className="card mt-4 flex w-full items-center justify-between p-3 text-left"
        >
          <span className="text-sm font-medium">Tell us who you are to vote →</span>
          <span className="text-sm text-muted">Select</span>
        </button>
      )}
      {me && !closed && (
        <p className="mt-3 text-xs text-muted">
          Voting as <span className="font-medium text-ink">{me.name}</span> ·{" "}
          <button className="underline" onClick={() => setPickMe(true)}>change</button>
        </p>
      )}

      {/* Options grid */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {poll.results.map((r) => {
          const mine = myOptionId === r.optionId;
          return (
            <motion.button
              key={r.optionId}
              layout
              whileTap={{ scale: closed ? 1 : 0.94 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              onClick={() => castVote(r.optionId)}
              disabled={closed}
              className="relative overflow-hidden rounded-2xl border p-3 text-left"
              style={{
                borderColor: mine ? poll.sentiment.color : "#2a2a36",
                backgroundColor: mine ? withAlpha(poll.sentiment.color, 0.12) : "#15151c",
              }}
            >
              {/* result fill bar */}
              {resultsVisible && (
                <motion.div
                  className="absolute inset-x-0 bottom-0 z-0"
                  initial={{ height: 0 }}
                  animate={{ height: `${r.percent}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ backgroundColor: withAlpha(poll.sentiment.color, 0.14) }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <Avatar
                  name={r.name}
                  image={r.image}
                  size="md"
                  ring={resultsVisible && r.isWinner ? "#ffd76b" : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.name}</p>
                  {resultsVisible ? (
                    <p className="text-xs text-muted">
                      {r.votes} · {r.percent}%
                    </p>
                  ) : mine ? (
                    <p className="text-xs" style={{ color: poll.sentiment.color }}>
                      Your pick
                    </p>
                  ) : (
                    <p className="text-xs text-faint">Tap to vote</p>
                  )}
                </div>
                <AnimatePresence>
                  {mine && (
                    <motion.span
                      key="check"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: justVoted ? [1, 1.3, 1] : 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="grid h-6 w-6 place-items-center rounded-full"
                      style={{ backgroundColor: poll.sentiment.color, color: "#0b0b0f" }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Results-hidden hint */}
      {!resultsVisible && (
        <p className="mt-4 text-center text-sm text-muted">
          {poll.showLiveResults
            ? "Cast your vote to reveal the results."
            : "Results are hidden until the poll closes."}
        </p>
      )}

      {/* Who voted for whom */}
      {!poll.anonymous && poll.totalVotes > 0 && resultsVisible && (
        <VoterBreakdown poll={poll} members={members} />
      )}

      <div className="h-4" />

      {/* Identity picker */}
      <Sheet open={pickMe} onClose={() => setPickMe(false)} title="Who are you?">
        <div className="grid grid-cols-3 gap-3">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMe(m.id);
                setPickMe(false);
              }}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 ${
                m.id === meId ? "border-ink bg-surface2" : "border-line"
              }`}
            >
              <Avatar name={m.name} image={m.image} size="lg" />
              <span className="w-full truncate text-center text-xs font-medium">{m.name}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Toast message={toast} />
    </div>
  );
}

function VoterBreakdown({ poll, members }: { poll: SerializedPoll; members: Member[] }) {
  if (!poll.voterChoices) return null;
  // optionId -> list of voter names
  const byOption = new Map<string, string[]>();
  for (const [voterId, optionId] of Object.entries(poll.voterChoices)) {
    const voter = members.find((m) => m.id === voterId);
    const list = byOption.get(optionId) ?? [];
    list.push(voter?.name ?? "Someone");
    byOption.set(optionId, list);
  }
  const rows = poll.results.filter((r) => (byOption.get(r.optionId)?.length ?? 0) > 0);

  return (
    <div className="mt-6">
      <p className="label mb-2">Who voted for whom</p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.optionId} className="card flex items-center gap-3 p-3">
            <Avatar name={r.name} image={r.image} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{r.name}</p>
              <p className="truncate text-xs text-muted">
                {(byOption.get(r.optionId) ?? []).join(", ")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Countdown({ iso, onExpire }: { iso: string; onExpire: () => void }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function tick() {
      const diff = new Date(iso).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("closing…");
        onExpire();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(h > 0 ? `closes in ${h}h ${m}m` : `closes in ${m}m`);
    }
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [iso, onExpire]);
  return <span>{label}</span>;
}
