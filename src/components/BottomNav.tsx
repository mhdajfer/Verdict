"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const TABS = [
  { href: "/", label: "Polls", match: (p: string) => p === "/" || p.startsWith("/polls"), icon: PollIcon },
  { href: "/create", label: "Create", match: (p: string) => p.startsWith("/create"), icon: CreateIcon },
  { href: "/leaderboard", label: "Ranks", match: (p: string) => p.startsWith("/leaderboard"), icon: RankIcon },
  { href: "/members", label: "Circle", match: (p: string) => p.startsWith("/members") || p.startsWith("/profile"), icon: PeopleIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-app -translate-x-1/2">
      <div
        className="mx-3 mb-3 flex items-stretch justify-around rounded-2xl border border-line bg-surface/90 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="tap relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-x-3 top-1 h-0.5 rounded-full bg-ink"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <Icon active={active} />
              <span
                className={`text-[10px] font-medium ${active ? "text-ink" : "text-faint"}`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function base(active: boolean) {
  return {
    width: 22,
    height: 22,
    fill: "none",
    stroke: active ? "#f4f4f6" : "#61616f",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function PollIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <rect x="4" y="10" width="4" height="10" rx="1" />
      <rect x="10" y="4" width="4" height="16" rx="1" />
      <rect x="16" y="13" width="4" height="7" rx="1" />
    </svg>
  );
}
function CreateIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function RankIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <path d="M6 9a6 6 0 0 0 12 0V4H6v5Z" />
      <path d="M9 20h6M12 15v5M4 4h2v3a3 3 0 0 1-3-3Zm16 0h-2v3a3 3 0 0 0 3-3Z" />
    </svg>
  );
}
function PeopleIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19a5 5 0 0 1 10 0" />
      <path d="M16 6a3 3 0 0 1 0 6M20 19a5 5 0 0 0-4-4.9" />
    </svg>
  );
}
