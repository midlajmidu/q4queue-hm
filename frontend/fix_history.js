const fs = require('fs');
const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/history/page.tsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Fix AVATAR_PALETTES
const oldAvatars = `const AVATAR_PALETTES = [
  { bg: "#eef2ff", color: "#4f46e5" },
  { bg: "#eff6ff", color: "#3b82f6" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fff7ed", color: "#ea580c" },
  { bg: "#fdf4ff", color: "#9333ea" },
  { bg: "#fdf2f8", color: "#db2777" },
  { bg: "#ecfdf5", color: "#059669" },
  { bg: "#fefce8", color: "#ca8a04" },
];

function getPalette(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

// ─── Components ─────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const { bg, color } = getPalette(name);
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%", background: bg, color, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, letterSpacing: "-.01em",
    }}>
      {initials || "U"}
    </div>
  );
}`;

const newAvatars = `const AVATAR_PALETTES = [
  "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
];

function getPalette(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

// ─── Components ─────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const className = getPalette(name);
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className={"shrink-0 flex items-center justify-center w-[34px] h-[34px] rounded-full text-xs font-bold tracking-tight " + className}>
      {initials || "U"}
    </div>
  );
}`;

content = content.replace(oldAvatars, newAvatars);

// 2. Fix clear filter button
content = content.replace(
  'style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#4f46e5", background: "#eef2ff", border: "none", borderRadius: 8, cursor: "pointer", transition: "background .15s" }}',
  'className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"\n                                              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, cursor: "pointer", transition: "background .15s" }}'
);

// 3. Fix Token string coloring (e.g. A9, A8)
content = content.replace(
  '<td style={{ ...tdStyle, color: "#4f46e5", fontWeight: 700 }}>{item.queue_prefix}{item.token_number}</td>',
  '<td className="text-indigo-600 dark:text-indigo-400" style={{ ...tdStyle, fontWeight: 700 }}>{item.queue_prefix}{item.token_number}</td>'
);

fs.writeFileSync(p, content, 'utf8');
