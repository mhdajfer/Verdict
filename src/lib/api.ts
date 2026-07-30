// Client-safe types (mirror the server serializers) and fetch helpers.
// No Prisma import here so this can be used in client components.

export interface Member {
  id: string;
  groupId: string;
  name: string;
  image: string | null;
  joinedAt: string;
}

export interface Sentiment {
  id: string;
  groupId: string;
  label: string;
  color: string;
  emoji: string | null;
  createdAt: string;
}

export interface OptionResult {
  optionId: string;
  memberId: string;
  name: string;
  image: string | null;
  votes: number;
  percent: number;
  isWinner: boolean;
}

export interface SerializedPoll {
  id: string;
  question: string;
  status: string;
  anonymous: boolean;
  showLiveResults: boolean;
  createdAt: string;
  closesAt: string | null;
  createdBy: { id: string; name: string } | null;
  sentiment: { id: string; label: string; color: string; emoji: string | null };
  totalVotes: number;
  results: OptionResult[];
  voterChoices: Record<string, string> | null;
  winnerNames: string[];
  isEffectivelyClosed: boolean;
}

export interface LeaderboardRow {
  rank: number;
  memberId: string;
  name: string;
  image: string | null;
  points: number;
  wins: number;
  appearances: number;
  lastVoteAt: string | null;
}

export interface HallOfFameCard {
  sentiment: Sentiment;
  leader: LeaderboardRow | null;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

export const api = {
  // members
  getMembers: () =>
    jsonFetch<{ groupId: string; groupName: string; members: Member[] }>("/api/members"),
  createMember: (name: string, image: string | null) =>
    jsonFetch<{ member: Member }>("/api/members", {
      method: "POST",
      body: JSON.stringify({ name, image }),
    }),
  updateMember: (id: string, patch: { name?: string; image?: string | null }) =>
    jsonFetch<{ member: Member }>(`/api/members/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteMember: (id: string) =>
    jsonFetch<{ ok: true }>(`/api/members/${id}`, { method: "DELETE" }),
  getDossier: (id: string, window: string) =>
    jsonFetch<{
      member: Member;
      window: string;
      records: {
        sentiment: Sentiment;
        rank: number;
        totalMembers: number;
        points: number;
        wins: number;
        appearances: number;
      }[];
    }>(`/api/members/${id}/dossier?window=${window}`),

  // sentiments
  getSentiments: () => jsonFetch<{ sentiments: Sentiment[] }>("/api/sentiments"),
  createSentiment: (label: string, emoji: string | null) =>
    jsonFetch<{ sentiment: Sentiment }>("/api/sentiments", {
      method: "POST",
      body: JSON.stringify({ label, emoji }),
    }),

  // polls
  getPolls: (params: { sentimentId?: string; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.sentimentId) qs.set("sentimentId", params.sentimentId);
    if (params.status) qs.set("status", params.status);
    const q = qs.toString();
    return jsonFetch<{ polls: SerializedPoll[] }>(`/api/polls${q ? `?${q}` : ""}`);
  },
  getPoll: (id: string) => jsonFetch<{ poll: SerializedPoll }>(`/api/polls/${id}`),
  createPoll: (body: {
    question: string;
    sentimentId: string;
    memberIds: string[];
    createdById: string | null;
    anonymous: boolean;
    showLiveResults: boolean;
    closesAt: string | null;
  }) =>
    jsonFetch<{ poll: SerializedPoll }>("/api/polls", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setPollStatus: (id: string, status: "open" | "closed") =>
    jsonFetch<{ poll: SerializedPoll }>(`/api/polls/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // votes
  vote: (pollId: string, optionId: string, voterMemberId: string) =>
    jsonFetch<{ poll: SerializedPoll }>("/api/votes", {
      method: "POST",
      body: JSON.stringify({ pollId, optionId, voterMemberId }),
    }),

  // leaderboard
  getLeaderboard: (params: { sentimentId?: string; window?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.sentimentId) qs.set("sentimentId", params.sentimentId);
    if (params.window) qs.set("window", params.window);
    const q = qs.toString();
    return jsonFetch<{
      sentiments: Sentiment[];
      activeSentimentId: string | null;
      window: string;
      rows: LeaderboardRow[];
      hallOfFame: HallOfFameCard[];
    }>(`/api/leaderboard${q ? `?${q}` : ""}`);
  },

  // "upload" — serverless-friendly: downscale client-side and return a base64
  // data-URL stored directly in Member.image (no disk write, no cloud storage).
  upload: (file: File): Promise<string> => fileToDataUrl(file),
};

const MAX_EDGE = 400; // px on the long edge — keeps the base64 row/payload small
const MAX_BYTES = 300 * 1024; // ~300KB cap after resize

/** Load an image file, downscale it onto a canvas, and export a JPEG data-URL. */
async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("That image couldn't be loaded"));
    el.src = dataUrl;
  });

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing not supported on this device");
  ctx.drawImage(img, 0, 0, w, h);

  const out = canvas.toDataURL("image/jpeg", 0.8);
  if (out.length > MAX_BYTES) {
    throw new Error("Image is too detailed to store — try a simpler/smaller photo");
  }
  return out;
}
