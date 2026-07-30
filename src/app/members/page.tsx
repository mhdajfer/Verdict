"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { api, Member } from "@/lib/api";
import { PageHeader, Skeleton, EmptyState, Sheet, Toast } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { IdentityChip } from "@/components/IdentityChip";
import { useIdentity } from "@/components/IdentityProvider";

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Member | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { meId } = useIdentity();

  async function load() {
    setLoading(true);
    try {
      const r = await api.getMembers();
      setMembers(r.members);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  return (
    <div className="px-4">
      <PageHeader
        title="The Circle"
        subtitle={`${members.length} member${members.length === 1 ? "" : "s"}`}
        right={<IdentityChip />}
      />

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          title="No one here yet"
          hint="Add your friends — they become the choices in every poll."
          action={
            <button className="btn-primary" onClick={() => setCreating(true)}>
              Add member
            </button>
          }
        />
      ) : (
        <motion.div layout className="grid grid-cols-3 gap-3">
          <AnimatePresence>
            {members.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card relative flex flex-col items-center gap-2 p-3"
              >
                <Link href={`/profile/${m.id}`} className="flex flex-col items-center gap-2">
                  <Avatar name={m.name} image={m.image} size="xl" ring={m.id === meId ? "#8b7bff" : undefined} />
                  <span className="w-full truncate text-center text-sm font-medium">{m.name}</span>
                </Link>
                <button
                  onClick={() => setEditing(m)}
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-surface2 text-muted active:bg-line"
                  aria-label={`Edit ${m.name}`}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* clearance so the last row isn't hidden behind the fixed CTA */}
      {!loading && members.length > 0 && <div className="h-24" />}

      {/* Bottom-reachable primary action */}
      {!loading && members.length > 0 && (
        <div className="fixed bottom-24 left-1/2 z-30 w-full max-w-app -translate-x-1/2 px-4">
          <button className="btn-primary w-full shadow-lg" onClick={() => setCreating(true)}>
            + Add member
          </button>
        </div>
      )}

      <MemberEditor
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={() => {
          setCreating(false);
          flash("Member added");
          load();
        }}
      />
      <MemberEditor
        open={!!editing}
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          flash("Saved");
          load();
        }}
        onDeleted={() => {
          setEditing(null);
          flash("Removed");
          load();
        }}
      />

      <Toast message={toast} />
    </div>
  );
}

function MemberEditor({
  open,
  member,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  member?: Member | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [name, setName] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setImage(member?.image ?? null);
      setUrlMode(false);
      setErr(null);
    }
  }, [open, member]);

  async function pickFile(f: File) {
    setBusy(true);
    setErr(null);
    try {
      const url = await api.upload(f);
      setImage(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (member) await api.updateMember(member.id, { name: name.trim(), image });
      else await api.createMember(name.trim(), image);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!member) return;
    if (!confirm(`Remove ${member.name}? Their polls and votes go too.`)) return;
    setBusy(true);
    try {
      await api.deleteMember(member.id);
      onDeleted?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={member ? "Edit member" : "Add member"}>
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => !urlMode && fileRef.current?.click()}
          className="relative"
          aria-label="Choose photo"
        >
          <Avatar name={name || "?"} image={image} size="xl" />
          <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-ink text-bg">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
          }}
        />
        <button
          className="text-xs font-medium text-muted underline"
          onClick={() => setUrlMode((v) => !v)}
        >
          {urlMode ? "Upload a file instead" : "Paste an image URL instead"}
        </button>
      </div>

      {urlMode && (
        <input
          className="input mt-3"
          placeholder="https://…/photo.jpg"
          value={image ?? ""}
          onChange={(e) => setImage(e.target.value || null)}
        />
      )}

      <div className="mt-4">
        <label className="label">Name</label>
        <input
          className="input mt-1"
          placeholder="e.g. Arjun"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}

      <div className="mt-5 flex gap-2">
        {member && (
          <button className="btn-ghost text-rose-400" onClick={remove} disabled={busy}>
            Remove
          </button>
        )}
        <button className="btn-primary flex-1" onClick={save} disabled={busy}>
          {busy ? "Saving…" : member ? "Save" : "Add member"}
        </button>
      </div>
    </Sheet>
  );
}
