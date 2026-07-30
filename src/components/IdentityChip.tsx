"use client";

import { useEffect, useState } from "react";
import { api, Member } from "@/lib/api";
import { useIdentity } from "./IdentityProvider";
import { Avatar } from "./Avatar";
import { Sheet } from "./ui";

export function IdentityChip() {
  const { meId, ready, setMe } = useIdentity();
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.getMembers().then((r) => setMembers(r.members)).catch(() => {});
  }, []);

  const me = members.find((m) => m.id === meId) || null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="tap flex items-center gap-2 rounded-full border border-line bg-surface pl-1 pr-3 py-1"
      >
        {me ? (
          <>
            <Avatar name={me.name} image={me.image} size="sm" />
            <span className="max-w-[90px] truncate text-sm font-medium">{me.name}</span>
          </>
        ) : (
          <span className="px-2 text-sm font-medium text-muted">
            {ready ? "Who are you?" : "…"}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Who are you?">
        <p className="mb-4 text-sm text-muted">
          Pick yourself so your votes are attributed. Stored on this device only.
        </p>
        {members.length === 0 ? (
          <p className="text-sm text-muted">No members yet — add some in the Circle tab.</p>
        ) : (
          <div className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto">
            {members.map((m) => {
              const active = m.id === meId;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMe(m.id);
                    setOpen(false);
                  }}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                    active ? "border-ink bg-surface2" : "border-line active:bg-surface2"
                  }`}
                >
                  <Avatar name={m.name} image={m.image} size="lg" />
                  <span className="w-full truncate text-center text-xs font-medium">
                    {m.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {meId && (
          <button
            onClick={() => {
              setMe(null);
              setOpen(false);
            }}
            className="btn-ghost mt-4 w-full"
          >
            Sign out of this device
          </button>
        )}
      </Sheet>
    </>
  );
}
