"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api, Member, Sentiment } from "@/lib/api";
import { PageHeader, Skeleton, Toast, Sheet } from "@/components/ui";
import { SentimentBadge } from "@/components/SentimentBadge";
import { Avatar } from "@/components/Avatar";
import { IdentityChip } from "@/components/IdentityChip";
import { useIdentity } from "@/components/IdentityProvider";

const PLACEHOLDERS = [
  "Who's most likely to cry at a wedding?",
  "Who would survive a zombie apocalypse?",
  "Who's texting their ex tonight?",
  "Who peaked in high school?",
];

export default function CreatePollPage() {
  const router = useRouter();
  const { meId } = useIdentity();

  const [members, setMembers] = useState<Member[]>([]);
  const [sentiments, setSentiments] = useState<Sentiment[]>([]);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [sentimentId, setSentimentId] = useState<string>("");
  const [newTag, setNewTag] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anonymous, setAnonymous] = useState(false);
  const [showLiveResults, setShowLiveResults] = useState(true);
  const [useTimer, setUseTimer] = useState(false);
  const [hours, setHours] = useState(24);

  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const placeholder = useMemo(
    () => PLACEHOLDERS[Math.floor((question.length * 7) % PLACEHOLDERS.length)],
    [question.length],
  );

  useEffect(() => {
    Promise.all([api.getMembers(), api.getSentiments()])
      .then(([m, s]) => {
        setMembers(m.members);
        setSentiments(s.sentiments);
        // default: everyone selected
        setSelected(new Set(m.members.map((x) => x.id)));
        if (s.sentiments[0]) setSentimentId(s.sentiments[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeSentiment = sentiments.find((s) => s.id === sentimentId) || null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addTag() {
    const label = newTag.trim();
    if (!label) return;
    setCreatingTag(true);
    try {
      const { sentiment } = await api.createSentiment(label, newEmoji.trim() || null);
      setSentiments((prev) =>
        prev.find((s) => s.id === sentiment.id) ? prev : [...prev, sentiment],
      );
      setSentimentId(sentiment.id);
      setNewTag("");
      setNewEmoji("");
    } catch {
      flash("Couldn't create tag");
    } finally {
      setCreatingTag(false);
    }
  }

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  }

  const memberIds = [...selected];
  const canPublish = question.trim() && sentimentId && memberIds.length >= 2;

  async function publish() {
    if (!canPublish) return;
    setBusy(true);
    try {
      const closesAt = useTimer
        ? new Date(Date.now() + hours * 3600 * 1000).toISOString()
        : null;
      const { poll } = await api.createPoll({
        question: question.trim(),
        sentimentId,
        memberIds,
        createdById: meId,
        anonymous,
        showLiveResults,
        closesAt,
      });
      router.push(`/polls/${poll.id}`);
    } catch (e) {
      flash((e as Error).message);
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4">
        <PageHeader title="Create" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (members.length < 2) {
    return (
      <div className="px-4">
        <PageHeader title="Create" right={<IdentityChip />} />
        <div className="card p-6 text-center">
          <p className="font-semibold">You need at least 2 members</p>
          <p className="mt-1 text-sm text-muted">
            Polls choose between people, so add a few friends first.
          </p>
          <button className="btn-primary mt-4" onClick={() => router.push("/members")}>
            Go to the Circle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <PageHeader title="Create" subtitle="Ask the group" right={<IdentityChip />} />

      {/* Question */}
      <section className="mb-5">
        <label className="label">The question</label>
        <textarea
          className="input mt-1 min-h-[76px] resize-none text-lg font-semibold leading-snug"
          placeholder={placeholder}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={140}
        />
        <p className="mt-1 text-right text-[11px] text-faint">{question.length}/140</p>
      </section>

      {/* Sentiment */}
      <section className="mb-5">
        <label className="label">Sentiment tag</label>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
          {sentiments.map((s) => (
            <button
              key={s.id}
              onClick={() => setSentimentId(s.id)}
              className={`tap shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                sentimentId === s.id ? "border-transparent" : "border-line text-muted"
              }`}
              style={
                sentimentId === s.id
                  ? { backgroundColor: s.color, color: "#0b0b0f" }
                  : {}
              }
            >
              {s.emoji ? `${s.emoji} ` : ""}
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="input"
            placeholder="+ New tag (e.g. Cringe)"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
          />
          <input
            className="input w-16 text-center"
            placeholder="🔥"
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value.slice(0, 2))}
          />
          <button className="btn-ghost" onClick={addTag} disabled={creatingTag || !newTag.trim()}>
            Add
          </button>
        </div>
      </section>

      {/* Member picker */}
      <section className="mb-5">
        <div className="flex items-center justify-between">
          <label className="label">Who's in the running ({selected.size})</label>
          <div className="flex gap-2 text-xs">
            <button className="text-muted underline" onClick={() => setSelected(new Set(members.map((m) => m.id)))}>
              All
            </button>
            <button className="text-muted underline" onClick={() => setSelected(new Set())}>
              None
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2.5">
          {members.map((m) => {
            const on = selected.has(m.id);
            return (
              <motion.button
                key={m.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => toggle(m.id)}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                  on ? "border-ink bg-surface2" : "border-line opacity-55"
                }`}
              >
                <Avatar name={m.name} image={m.image} size="lg" />
                <span className="w-full truncate text-center text-[11px] font-medium">{m.name}</span>
                {on && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-bg">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Options */}
      <section className="mb-5 space-y-2">
        <ToggleRow
          label="Anonymous voting"
          hint="Hide who voted for whom"
          value={anonymous}
          onChange={setAnonymous}
        />
        <ToggleRow
          label="Show live results"
          hint={showLiveResults ? "Results update as votes come in" : "Results hidden until poll closes"}
          value={showLiveResults}
          onChange={setShowLiveResults}
        />
        <ToggleRow
          label="Auto-close timer"
          hint={useTimer ? `Closes in ${hours}h` : "Poll stays open until you close it"}
          value={useTimer}
          onChange={setUseTimer}
        />
        {useTimer && (
          <div className="flex gap-2 px-1">
            {[6, 12, 24, 48].map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`tap flex-1 rounded-lg border py-2 text-sm font-medium ${
                  hours === h ? "border-ink bg-ink text-bg" : "border-line text-muted"
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Publish bar */}
      <div className="fixed bottom-24 left-1/2 z-30 w-full max-w-app -translate-x-1/2 px-4">
        <button
          className="btn-primary w-full shadow-lg"
          disabled={!canPublish}
          onClick={() => setPreview(true)}
        >
          Preview & publish
        </button>
      </div>
      {/* clearance so the last toggle isn't hidden behind the fixed CTA */}
      <div className="h-36" />

      {/* Preview sheet */}
      {preview && activeSentiment && (
        <PreviewSheet
          open={preview}
          onClose={() => setPreview(false)}
          question={question}
          sentiment={activeSentiment}
          members={members.filter((m) => selected.has(m.id))}
          anonymous={anonymous}
          showLiveResults={showLiveResults}
          onConfirm={publish}
          busy={busy}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="card flex w-full items-center justify-between p-3 text-left"
    >
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          value ? "bg-emerald" : "bg-line"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white"
          style={{ left: value ? 22 : 2 }}
        />
      </span>
    </button>
  );
}

function PreviewSheet({
  open,
  onClose,
  question,
  sentiment,
  members,
  anonymous,
  showLiveResults,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  question: string;
  sentiment: Sentiment;
  members: Member[];
  anonymous: boolean;
  showLiveResults: boolean;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Preview">
      <div className="card p-4" style={{ borderLeft: `3px solid ${sentiment.color}` }}>
        <SentimentBadge label={sentiment.label} color={sentiment.color} emoji={sentiment.emoji} size="sm" />
        <p className="mt-2 text-lg font-bold leading-snug">{question}</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {members.map((m) => (
            <div key={m.id} className="flex flex-col items-center gap-1">
              <Avatar name={m.name} image={m.image} size="md" />
              <span className="w-full truncate text-center text-[10px] text-muted">{m.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        <span className="rounded-full border border-line px-2 py-1">
          {anonymous ? "Anonymous" : "Visible votes"}
        </span>
        <span className="rounded-full border border-line px-2 py-1">
          {showLiveResults ? "Live results" : "Results after close"}
        </span>
        <span className="rounded-full border border-line px-2 py-1">{members.length} options</span>
      </div>
      <button className="btn-primary mt-5 w-full" onClick={onConfirm} disabled={busy}>
        {busy ? "Publishing…" : "Publish poll"}
      </button>
    </Sheet>
  );
}
