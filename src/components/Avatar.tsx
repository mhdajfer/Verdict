"use client";

const SIZES = { sm: 32, md: 44, lg: 56, xl: 88 } as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase() || "?";
}

// Deterministic soft tint from the name so fallbacks aren't all identical.
function tint(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360} 40% 26%)`;
}

export function Avatar({
  name,
  image,
  size = "md",
  ring,
}: {
  name: string;
  image?: string | null;
  size?: keyof typeof SIZES;
  ring?: string;
}) {
  const px = SIZES[size];
  const style: React.CSSProperties = {
    width: px,
    height: px,
    ...(ring ? { boxShadow: `0 0 0 2px ${ring}` } : {}),
  };
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full flex items-center justify-center font-semibold text-ink/90"
      style={{ ...style, backgroundColor: image ? "transparent" : tint(name) }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: px * 0.36 }}>{initials(name)}</span>
      )}
    </div>
  );
}
