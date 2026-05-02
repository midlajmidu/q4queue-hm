
"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import type { AnalyticsOverview, SessionResponse, QueueResponse } from "@/types/api";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAlert } from "@/context/AlertContext";

// ─── Helpers ─────────────────────────────────────────────────────
function timeToSeconds(t: string): number {
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] || 0;
}
function formatDuration(s: number): string {
  if (!s || s < 0) return "—";

  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.round(s % 60);

  if (days >= 1) return `${days} day${days > 1 ? 's' : ''} ${hours}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  if (minutes >= 1) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function statusLabel(act: { number: number; status: string; queue: string }): string {
  const map: Record<string, string> = {
    waiting: `#${act.number} joined ${act.queue}`,
    serving: `#${act.number} called to service`,
    done: `#${act.number} service completed`,
    skipped: `#${act.number} cancelled`,
    deleted: `#${act.number} cancelled`,
  };
  return map[act.status] ?? `#${act.number} — ${act.status}`;
}

// ─── SVG Icon primitives ──────────────────────────────────────────
type IconProps = { size?: number; color?: string; strokeWidth?: number };

const Icons = {
  BarChart3: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  ),
  Users: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Clock: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  CheckCircle2: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
    </svg>
  ),
  XCircle: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
    </svg>
  ),
  Play: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  ),
  PlusCircle: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" />
    </svg>
  ),
  UserPlus: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  ),
  QrCode: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" />
    </svg>
  ),
  Download: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  ),
  ArrowRight: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  ),
  ArrowLeft: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
    </svg>
  ),
  ChevronDown: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  ChevronRight: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  Megaphone: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 19-9-9 19-2-8-8-2z" />
    </svg>
  ),
  Zap: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  ),
  Activity: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  TrendingUp: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  TrendingDown: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" />
    </svg>
  ),
  AlertTriangle: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  AlertCircle: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
  Clipboard: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  ),
  Radio: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" /><circle cx="12" cy="12" r="2" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </svg>
  ),
  RefreshCw: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
    </svg>
  ),
  Info: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  ),
  Settings2: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
    </svg>
  ),
  Wifi: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" x2="12.01" y1="20" y2="20" />
    </svg>
  ),
  BarChart2: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  ),
  CheckSquare: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Filter: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  X: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  ),
  Table2: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
    </svg>
  ),
  Layers: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Hash: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  ),
  Bell: ({ size = 16, color = "currentColor", strokeWidth = 1.75 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
};

// ─── Design Tokens ────────────────────────────────────────────────
const C = {
  // bg
  pageBg: "#f7f8fa",
  cardBg: "#ffffff",
  cardBgAlt: "#fbfcfd",
  // borders
  border: "#e8eaef",
  borderHov: "#c4ccd8",
  borderLight: "#f1f2f5",
  // text
  text: "#0f1729",
  textSub: "#475569",
  textMuted: "#8b95a9",
  // brand
  brand: "#4f46e5",
  brandDark: "#4338ca",
  brandLight: "#eef2ff",
  brandBorder: "#c7d2fe",
  brandGlow: "rgba(79,70,229,.10)",
  // semantic – slightly muted for calm feel
  blue: "#3b82f6", blueBg: "#eff6ff", blueBorder: "#bfdbfe",
  green: "#10b981", greenBg: "#ecfdf5", greenBorder: "#a7f3d0",
  amber: "#f59e0b", amberBg: "#fffbeb", amberBorder: "#fde68a",
  red: "#ef4444", redBg: "#fef2f2", redBorder: "#fecaca",
  violet: "#7c3aed", violetBg: "#f5f3ff",
  slate: "#64748b", slateBg: "#f8fafc",
};

// ─── Global Styles ────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  .ov {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: ${C.text};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* ── Card ── */
  .card {
    background: ${C.cardBg};
    border: 1px solid ${C.border};
    border-radius: 14px;
    box-shadow:
      0 0 0 1px rgba(0,0,0,.02),
      0 1px 2px rgba(0,0,0,.03),
      0 2px 8px rgba(0,0,0,.025);
    transition: box-shadow .25s cubic-bezier(.4,0,.2,1), border-color .25s ease;
  }
  .card:hover {
    box-shadow:
      0 0 0 1px rgba(0,0,0,.03),
      0 4px 12px rgba(0,0,0,.06),
      0 8px 28px rgba(0,0,0,.04);
    border-color: ${C.borderHov};
  }

  /* ── Metric card lift ── */
  .metric-card { position: relative; }
  .metric-card::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: 14px;
    opacity: 0;
    transition: opacity .25s cubic-bezier(.4,0,.2,1);
    box-shadow: 0 8px 32px rgba(79,70,229,.10);
    pointer-events: none;
  }
  .metric-card:hover { transform: none; }
  .metric-card:hover::before { opacity: 1; }

  /* ── Select ── */
  .ov-sel {
    appearance: none;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    color: #0f172a;
    border-radius: 8px;
    padding: 9px 34px 9px 12px;
    font-size: 13px; font-weight: 500;
    font-family: 'Inter', sans-serif;
    cursor: pointer; min-width: 172px;
    box-shadow: 0 1px 2px rgba(0,0,0,.03);
    transition: all .2s cubic-bezier(.4,0,.2,1);
  }
  .ov-sel:hover:not(:disabled) {
    border-color: #cbd5e1;
    background: #f8fafc;
    box-shadow: 0 2px 4px rgba(0,0,0,.04);
  }
  .ov-sel:focus {
    outline: none;
    border-color: #818cf8;
    box-shadow: 0 0 0 3px rgba(129,140,248,.15), 0 1px 2px rgba(0,0,0,.03);
    background: #ffffff;
  }
  .ov-sel:disabled { opacity: .4; cursor: not-allowed; }

  /* ── Quick Action btn ── */
  .qa-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 16px; font-size: 12.5px; font-weight: 500;
    font-family: 'Inter', sans-serif; color: ${C.textSub};
    background: ${C.cardBg}; border: 1px solid ${C.border};
    border-radius: 10px; cursor: pointer; text-decoration: none;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    transition: all .22s ease;
  }
  .qa-btn:hover {
    border-color: ${C.brandBorder}; color: ${C.brand};
    background: ${C.brandLight};
    box-shadow: 0 2px 8px ${C.brandGlow};
  }

  /* ── Icon badge ── */
  .icon-badge {
    display: flex; align-items: center; justify-content: center;
    border-radius: 11px; flex-shrink: 0;
  }

  /* ── Badge chip ── */
  .chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 8px;
    font-size: 10.5px; font-weight: 600; letter-spacing: .03em; text-transform: uppercase;
    font-family: 'Inter', sans-serif;
  }

  /* ── Pill ── */
  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 99px;
    font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  }

  /* ── Table row ── */
  .trow { transition: background .2s ease, transform .2s ease, box-shadow .2s ease; }
  .trow:hover { background: linear-gradient(90deg, #f8f9ff, #fbfcfe); }

  /* ── Pagination btn ── */
  .pg-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; font-size: 12.5px; font-weight: 500;
    font-family: 'Inter', sans-serif; color: ${C.textSub};
    background: ${C.cardBg}; border: 1px solid ${C.border};
    border-radius: 10px; cursor: pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    transition: all .22s ease;
  }
  .pg-btn:hover:not(:disabled) {
    border-color: ${C.brandBorder}; color: ${C.brand};
    background: ${C.brandLight};
    box-shadow: 0 2px 6px ${C.brandGlow};
  }
  .pg-btn:disabled { opacity: .3; cursor: not-allowed; }

  /* ── Mono ── */
  .mono { font-family: 'JetBrains Mono', 'Geist Mono', monospace; }

  /* ── Label ── */
  .lbl {
    font-size: 10.5px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
    color: ${C.textMuted};
    font-family: 'Inter', sans-serif;
  }

  /* ── Progress bar ── */
  .bar-fill {
    height: 100%; border-radius: 99px;
    transition: width .85s cubic-bezier(.4,0,.2,1);
    background-image: linear-gradient(90deg, currentColor 0%, currentColor 100%);
  }

  /* ── Shimmer ── */
  .shimmer {
    border-radius: 10px;
    background: linear-gradient(90deg, #f3f5f8 0%, #eaecf1 40%, #f3f5f8 60%, #eaecf1 100%);
    background-size: 300% 100%;
    animation: sh 2s ease-in-out infinite;
  }
  @keyframes sh { 0%{background-position:300% 0} 100%{background-position:-300% 0} }

  /* ── Live pulse ── */
  .live-dot { animation: ldot 2.4s ease-in-out infinite; }
  @keyframes ldot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.2;transform:scale(.6)} }

  /* ── Fade in ── */
  .fade-in { animation: fin .4s cubic-bezier(.16,1,.3,1) both; }
  @keyframes fin { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

  /* ── Section separator ── */
  .section-label {
    font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    color: ${C.textMuted}; display: flex; align-items: center; gap: 12px;
  }
  .section-label::after {
    content:''; flex:1; height:1px;
    background: linear-gradient(90deg, ${C.border}80, transparent);
  }

  /* ── View more link arrow anim ── */
  .view-more:hover .arr { transform: translateX(3px); }
  .view-more:hover { opacity: .9; }
  .arr { transition: transform .18s cubic-bezier(.4,0,.2,1); display: inline-flex; }

  /* ── Refresh spin ── */
  .spin { animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Auto-refresh bar ── */
  .refresh-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 14px;
    background: ${C.cardBg}; border: 1px solid ${C.border};
    border-radius: 10px; font-size: 12px; color: ${C.textMuted};
    box-shadow: 0 1px 2px rgba(0,0,0,.03);
  }

  /* ── Hourly bar ── */
  .hbar { transition: opacity .15s; }
  .hbar:hover { opacity: .75; cursor: default; }

  /* ── Tabular Nums ── */
  .tnum { font-variant-numeric: tabular-nums; }

  /* ── Feed Filter Tabs ── */
  .feed-tabs {
    display: flex; gap: 3px; padding: 3px;
    background: ${C.slateBg};
    border: 1px solid ${C.border}; border-radius: 12px; width: fit-content;
  }

  /* ── Activity Legend ── */
  .activity-legend {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 18px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border: 1px solid ${C.border};
    border-radius: 99px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    position: sticky;
    top: 15px;
    z-index: 20;
    margin-left: auto;
    width: fit-content;
    transition: all 0.3s ease;
  }
  @media (max-width: 640px) {
    .activity-legend {
      position: relative;
      top: 0;
      width: 100%;
      margin: 12px 0;
      border-radius: 12px;
      justify-content: space-between;
      padding: 10px 20px;
      background: ${C.slateBg};
    }
  }
  .leg-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: ${C.textSub};
    letter-spacing: -0.01em;
  }
  .leg-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(255,255,255,1), 0 0 0 3px currentColor;
    opacity: 0.8;
  }
  .leg-badge {
    background: rgba(0,0,0,0.05);
    color: inherit;
    padding: 1px 6px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
    margin-left: 2px;
  }
  .feed-tab {
    display: flex; align-items: center; gap: 6px; padding: 8px 16px;
    font-size: 13px; font-weight: 500; color: ${C.textMuted};
    border: none; background: transparent; border-radius: 10px; cursor: pointer;
    transition: all .25s cubic-bezier(.4,0,.2,1);
    font-family: inherit;
  }
  .feed-tab:hover { color: ${C.textSub}; background: rgba(255,255,255,.6); }
  .feed-tab.active {
    background: #fff; color: ${C.text};
    box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.02);
    font-weight: 600;
  }
  .feed-tab .badge {
    background: ${C.borderLight}; color: ${C.textMuted}; font-size: 11px; font-weight: 600;
    padding: 2px 7px; border-radius: 99px;
    transition: all .2s;
  }
  .feed-tab.active .badge {
    background: ${C.brandLight};
    color: ${C.brand};
  }

  /* ── Activity Drawer ── */
  .drawer-backdrop {
    position: fixed; inset: 0;
    background: rgba(15,23,42,.18);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 100;
    animation: fadeIn .3s cubic-bezier(.16,1,.3,1) forwards;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .drawer-panel {
    position: fixed; top: 0; right: 0; bottom: 0; width: 440px;
    background: ${C.cardBg};
    box-shadow: -12px 0 48px rgba(0,0,0,.10), -4px 0 12px rgba(0,0,0,.03);
    z-index: 101; display: flex; flex-direction: column;
    animation: slideLeft .35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .drawer-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 24px 28px; border-bottom: 1px solid ${C.border};
    background: linear-gradient(180deg, #fafbfd 0%, ${C.cardBg} 100%);
  }
  .drawer-body { flex: 1; overflow-y: auto; padding: 28px; }

  /* ── Per-Queue Table ── */
  .qtable { width: 100%; border-collapse: collapse; text-align: left; }
  .qtable th {
    padding: 12px 16px; font-size: 11px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    color: ${C.textMuted}; border-bottom: 1px solid ${C.border};
    background: linear-gradient(180deg, #fafbfd, ${C.slateBg});
    font-family: 'Inter', sans-serif;
  }
  .qtable td { padding: 14px 16px; font-size: 13px; font-weight: 500; color: ${C.text}; border-bottom: 1px solid ${C.borderLight}; }
  .qtable tbody tr { transition: background .12s ease; }
  .qtable tbody tr:hover td { background: #f8f9ff; }

  /* ── Metric Skeleton ── */
  .card-skeleton .shim {
    background: linear-gradient(90deg, #edf0f4, #f4f6f9);
    border-radius: 8px; overflow: hidden; position: relative;
  }
  .card-skeleton .shim::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%);
    animation: shimmer 2s ease infinite;
  }
  @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

  /* ── Card header strip ── */
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 24px; border-bottom: 1px solid ${C.border};
    background: linear-gradient(180deg, #fafbfd 0%, ${C.cardBg} 100%);
    border-radius: 14px 14px 0 0;
  }

  /* ── Notification System ── */
  .notif-btn {
    position: relative;
    border: 1px solid ${C.border};
    background: #fff;
    width: 40px; height: 40px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
  }
  .notif-btn:hover {
    border-color: ${C.brandBorder};
    background: ${C.brandLight};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${C.brandGlow};
  }
  .notif-btn.active {
    background: ${C.brand};
    border-color: ${C.brand};
    color: #fff;
  }
  .notif-badge {
    position: absolute;
    top: -4px; right: -4px;
    background: ${C.red};
    color: #fff;
    font-size: 10px; font-weight: 800;
    min-width: 18px; height: 18px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid #fff;
    padding: 0 4px;
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
  }
  .notif-dropdown {
    position: absolute;
    bottom: calc(100% + 12px);
    right: 0;
    width: 360px;
    background: #fff;
    border: 1px solid ${C.border};
    border-radius: 16px;
    box-shadow: 0 -10px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02);
    z-index: 1000;
    overflow: hidden;
    animation: dropInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    transform-origin: bottom right;
  }
  @keyframes dropInUp { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .notif-item {
    padding: 16px 20px;
    display: flex; gap: 14px;
    border-bottom: 1px solid ${C.borderLight};
    transition: background 0.15s ease;
    cursor: pointer;
  }
  .notif-item:hover { background: ${C.slateBg}; }
  .notif-item.unread { background: ${C.brandLight}44; }
  .unread-dot {
    width: 8px; height: 8px;
    background: ${C.blue};
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 6px;
  }
  .bell-shake { animation: shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
  @keyframes shake {
    10%, 90% { transform: rotate(-8deg); }
    20%, 80% { transform: rotate(12deg); }
    30%, 50%, 70% { transform: rotate(-16deg); }
    40%, 60% { transform: rotate(16deg); }
  }
`;

// ════════════════════════════════════════════════════════════════
export default function OverviewPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [prevOverview, setPrevOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";

  const [sessions, setSessions] = useState<SessionResponse[]>([]);
  const [queues, setQueues] = useState<QueueResponse[]>([]);
  const [liveQueues, setLiveQueues] = useState<QueueResponse[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const { addAlert } = useAlert();

  // ── Demo Alerts ──────────────────────────────────────
  useEffect(() => {
    // Show maintenance info on load
    addAlert({
      type: "info",
      message: "Scheduled maintenance tonight at 10 PM. System updates will be performed.",
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Monitor for high wait times
    if (overview?.timings?.max_waiting_time) {
      const waitSec = timeToSeconds(overview.timings.max_waiting_time);
      if (waitSec > 1800) { // 30 mins
        addAlert({
          type: "warning",
          message: "⚠️ High wait times detected in queues! Consider adding more staff now.",
          action: { label: "Manage Staff", onClick: () => window.location.href = `${dashBase}/staff` },
          persist: true // Persistence for critical warnings
        });
      }
    }
  }, [overview?.timings?.max_waiting_time, dashBase]); // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedQueue, setSelectedQueue] = useState("");
  const [recentPage, setRecentPage] = useState(1);
  const LIMIT = 10;

  // ── New State ─────────────────────────────────────────────────
  const [feedFilter, setFeedFilter] = useState<"all" | "waiting" | "serving" | "done">("all");
  const [drawerAct, setDrawerAct] = useState<any | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = async () => {
    try {
      setIsDownloading(true);
      
      let allItems: any[] = [];
      let offset = 0;
      const limit = 100;
      let total = 1; // Start with > 0 to enter the loop
      
      while (offset < total) {
        const res = await api.getHistory({ sessionId: selectedSession || undefined, limit, offset });
        if (!res.items || res.items.length === 0) break;
        
        allItems = allItems.concat(res.items);
        total = res.total || 0;
        offset += limit;
      }

      if (allItems.length === 0) {
        addAlert({ type: "info", message: "No history found to download." });
        return;
      }
      
      const headers = ["Token Number", "Queue Name", "Prefix", "Status", "Customer Name", "Customer Phone", "Created At", "Served At", "Completed At"];
      const rows = allItems.map(item => [
        item.token_number,
        item.queue_name,
        item.queue_prefix,
        item.status,
        item.customer_name || "-",
        item.customer_phone || "-",
        item.created_at ? new Date(item.created_at).toLocaleString() : "-",
        item.served_at ? new Date(item.served_at).toLocaleString() : "-",
        item.completed_at ? new Date(item.completed_at).toLocaleString() : "-"
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(e => e.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `queue_report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addAlert({ type: "success", message: "Report downloaded successfully." });
    } catch (err) {
      addAlert({ type: "error", message: "Failed to download report." });
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Auto-refresh & abort ──────────────────────────────────────
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const REFRESH_SECS = 20;
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false); // silent background refresh

  const loadData = useCallback(async (silent = false) => {
    // Cancel any previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await api.getOverview(
        selectedSession || undefined, selectedQueue || undefined,
        LIMIT, (recentPage - 1) * LIMIT
      );
      // Ignore if this request was aborted (a newer one is in flight)
      if (controller.signal.aborted) return;
      setOverview(data);
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load overview data");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [selectedSession, selectedQueue, recentPage]);

  useEffect(() => {
    api.listSessions(100, 0).then(res => {
      setSessions(res.items);
      if (res.items.length >= 2)
        api.getOverview(res.items[1].id, undefined, 0, 0).then(setPrevOverview).catch(() => { });
      if (res.items.length >= 1)
        api.listSessionQueues(res.items[0].id, 100, 0).then(r => setLiveQueues(r.items)).catch(() => { });
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedSession) {
      api.listSessionQueues(selectedSession, 100, 0).then(r => setQueues(r.items)).catch(() => setQueues([]));
    } else { setQueues([]); setSelectedQueue(""); }
    setRecentPage(1);
  }, [selectedSession]);

  useEffect(() => { loadData(); }, [loadData, recentPage]);

  // ── Auto-refresh interval ─────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!autoRefresh) return;
    intervalRef.current = setInterval(() => loadData(true), REFRESH_SECS * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadData]);

  // ── "Updated Ns ago" ticker ───────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const insights = useMemo(() => {
    if (!overview) return null;

    const formatAmPm = (hourStr: string) => {
      const h = parseInt(hourStr.split(':')[0], 10);
      if (isNaN(h)) return hourStr;
      const ampm = h >= 12 ? 'pm' : 'am';
      const h12 = h % 12 || 12;
      return `${h12}${ampm}`;
    };

    const rawHourly = overview.charts?.hourly || [];
    const hourly = rawHourly.map(h => ({ ...h, hour: formatAmPm(h.hour) }));

    const busiestHour = hourly.length ? hourly.reduce((mx, h) => h.visits > mx.visits ? h : mx, hourly[0]) : null;
    const maxVisits = hourly.length ? Math.max(...hourly.map(h => h.visits)) : 0;
    const totalVisitsToday = overview.status_counts?.total ?? 0;
    const busiestPct = totalVisitsToday > 0 ? Math.round(((busiestHour?.visits ?? 0) / totalVisitsToday) * 100) : 0;

    const waitSec = timeToSeconds(overview.timings?.max_waiting_time || "0");
    const avgWaitSec = timeToSeconds(overview.timings?.avg_waiting_time || "0");
    const waitRatio = avgWaitSec > 0 ? Math.round((waitSec / avgWaitSec) * 10) / 10 : 0;

    const servSec = timeToSeconds(overview.timings?.avg_served_time || "0");
    const servTarget = 300; // 5 mins target
    const servEfficiency = servSec > 0 ? Math.round((servTarget / servSec) * 100) : 0;

    return {
      busiestHour: busiestHour?.hour ?? "—",
      busiestVisits: busiestHour?.visits ?? 0,
      busiestAnalysis: `${busiestPct}% of daily traffic occurs now.`,
      busiestRec: "Consider adding 1-2 staff members during this peak window.",

      longestWait: overview.timings?.max_waiting_time || "00:00:00",
      waitAnalysis: waitRatio > 2 ? `Waiting is ${waitRatio}x longer than average.` : "Wait times are currently stable.",
      waitRec: waitSec > 1800 ? "Opening one more counter could reduce this by ~15m." : "Maintain current counter distribution.",

      avgService: overview.timings?.avg_served_time || "00:00:00",
      servAnalysis: servEfficiency < 100 ? `${100 - servEfficiency}% below speed target.` : "Operating at peak efficiency.",
      servRec: servSec > 600 ? "Review service steps to identify bottlenecks." : "Excellent speed! Maintain current workflow.",

      peakWaiting: overview.status_counts?.waiting ?? 0,
      distAnalysis: (overview.status_counts?.waiting ?? 0) > 5 ? "Load is increasing across active queues." : "Queue distribution is manageable.",
      distRec: (overview.status_counts?.waiting ?? 0) > 10 ? "Consider redirecting new arrivals to less busy lines." : "Keep monitoring for sudden influxes.",

      hourly,
      maxVisits,
    };
  }, [overview]);

  const updatedLabel = lastUpdated
    ? secondsAgo < 10 ? "Just now"
      : secondsAgo < 60 ? "moments ago"
        : `${Math.floor(secondsAgo / 60)}m ago`
    : null;

  const mkTrend = (cur: number, prev?: number) => {
    if (!prev) return null;
    const d = cur - prev; if (!d) return null;
    return { up: d > 0, pct: Math.abs(Math.round((d / prev) * 100)) };
  };

  const wAvg = timeToSeconds(overview?.timings?.avg_waiting_time || "0");
  const wMax = timeToSeconds(overview?.timings?.max_waiting_time || "0");
  const sAvg = timeToSeconds(overview?.timings?.avg_served_time || "0");
  const sMax = timeToSeconds(overview?.timings?.max_served_time || "0");
  const wPct = wMax ? Math.round((wAvg / wMax) * 100) : 0;
  const sPct = sMax ? Math.round((sAvg / sMax) * 100) : 0;

  const queueStats = useMemo(() => {
    if (!overview?.recent_activity) return [];
    const map = new Map<string, { queue: string; waiting: number; served: number; total: number }>();
    for (const act of overview.recent_activity) {
      if (!map.has(act.queue)) map.set(act.queue, { queue: act.queue, waiting: 0, served: 0, total: 0 });
      const entry = map.get(act.queue)!;
      entry.total++;
      if (act.status === "waiting") entry.waiting++;
      if (act.status === "done" || act.status === "serving") entry.served++;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [overview]);

  const totalV = overview?.status_counts?.total ?? 0;
  const servedV = overview?.status_counts?.served ?? 0;
  const completionRate = totalV > 0 ? Math.round((servedV / totalV) * 100) : 0;
  const crColor = completionRate >= 90 ? C.green : (completionRate >= 75 ? C.amber : C.red);
  const crBg = completionRate >= 90 ? C.greenBg : (completionRate >= 75 ? C.amberBg : C.redBg);
  const crBorder = completionRate >= 90 ? "#a7f3d0" : (completionRate >= 75 ? "#fde68a" : "#fecaca");
  const wWarn = wMax >= wAvg * 2 && wAvg > 0;
  const sWarn = sMax >= sAvg * 2 && sAvg > 0;
  const activeQueues = liveQueues.filter(q => q.is_active);

  // ── Global drawer escape ──────────────────────────────
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerAct(null); };
    if (drawerAct) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [drawerAct]);

  return (
    <>
      <style>{STYLES}</style>
      <div className="ov">
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          {/* ══ HEADER CARD ═════════════════════════════════════════════════ */}
          <div className="card fade-in" style={{
            padding: "40px 44px", position: "relative", overflow: "hidden",
            background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
            boxShadow: "0 1px 3px rgba(0,0,0,.02), 0 1px 2px rgba(0,0,0,.01), inset 0 1px 0 rgba(255,255,255,1)",
            border: "1px solid #e5e7eb"
          }}>
            <div aria-hidden style={{
              position: "absolute", top: -40, right: -40, width: 300, height: 300,
              background: `radial-gradient(circle at 100% 0%, rgba(99,102,241,.03) 0%, transparent 60%)`,
              pointerEvents: "none",
            }} />

            <div aria-hidden style={{
              position: "absolute", top: -40, right: -40, width: 300, height: 300,
              background: `radial-gradient(circle at 100% 0%, rgba(99,102,241,.03) 0%, transparent 60%)`,
              pointerEvents: "none",
            }} />

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 32 }}>
              {/* Left: title */}
              <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  {/* brand icon */}
                  <div className="icon-badge" style={{
                    width: 42, height: 42,
                    background: `linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)`,
                    border: "1px solid #e2e8f0",
                    boxShadow: `0 2px 8px rgba(0,0,0,.03), inset 0 2px 0 rgba(255,255,255,.5)`,
                    borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <Icons.BarChart3 size={20} color="#6366f1" strokeWidth={2.5} />
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    letterSpacing: '.06em', textTransform: 'uppercase',
                    color: "#64748b",
                    fontFamily: "'Inter', sans-serif",
                  }}>Analytics Dashboard</span>
                </div>
                <h1 style={{
                  fontSize: "clamp(26px,2.8vw,32px)", fontWeight: 800,
                  color: "#0f172a", letterSpacing: "-.02em",
                  lineHeight: 1.1, margin: 0,
                }}>
                  Organization Overview
                </h1>
                <p style={{
                  marginTop: 10, fontSize: 14.5, color: "#64748b",
                  lineHeight: 1.6, marginBottom: 0, fontWeight: 400,
                }}>
                  Real time performance metrics across all queues and sessions.
                </p>
              </div>

              {/* Right: filters */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", position: "relative", zIndex: 1 }}>
                {[
                  {
                    id: "filter-session", lbl: "Session", val: selectedSession, set: setSelectedSession, dis: false,
                    opts: <>
                      <option value="">All Sessions</option>
                      {sessions.map(s => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {s.title ? ` — ${s.title}` : ""}
                        </option>
                      ))}
                    </>,
                  },
                  {
                    id: "filter-queue", lbl: "Queue", val: selectedQueue, set: setSelectedQueue, dis: !selectedSession,
                    opts: <>
                      <option value="">All Queues</option>
                      {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                    </>,
                  },
                ].map(f => (
                  <div key={f.lbl} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label htmlFor={f.id} className="lbl" style={{ fontSize: 11, letterSpacing: '.04em', color: "#64748b", fontWeight: 500 }}>{f.lbl}</label>
                    <div style={{ position: "relative", transition: "transform .2s ease", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                      <select id={f.id} name={f.id} value={f.val} onChange={e => f.set(e.target.value)} disabled={f.dis} className="ov-sel">
                        {f.opts}
                      </select>
                      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.4 }}>
                        <Icons.ChevronDown size={14} color="#0f172a" strokeWidth={2.5} />
                      </span>
                    </div>
                  </div>
                ))}

                {/* ── BOTTOM UTILITY BAR (Notifs + Profile) ── */}
                <div style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 14 }}>
                  <NotificationSystem />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px", background: "rgba(255,255,255,0.6)", border: `1px solid ${C.border}`, borderRadius: 12 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: `linear-gradient(135deg, ${C.brand}, ${C.brand}dd)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 800, fontSize: 13
                    }}>
                      {user?.email?.[0].toUpperCase() || "A"}
                    </div>
                    <div className="hide-mobile">
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.text, lineHeight: 1 }}>{user?.email?.split("@")[0] || "Admin"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══ QUICK ACTIONS ════════════════════════════════════ */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="section-label" style={{ flex: 1 }}>Quick Actions</div>

              {/* ── Auto-refresh bar ── */}
              <div className="refresh-bar" style={{ marginLeft: 16, flexShrink: 0 }}>
                {/* live indicator */}
                {autoRefresh && !isRefreshing && (
                  <span className="live-dot" style={{ display: "block", width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                )}
                {isRefreshing && (
                  <span className="spin" style={{ display: "inline-flex" }}>
                    <Icons.RefreshCw size={12} color={C.brand} />
                  </span>
                )}
                {/* updated label */}
                {updatedLabel && (
                  <span style={{ color: C.textMuted, fontSize: 11.5 }}>
                    Updated <strong style={{ color: C.textSub, fontWeight: 600 }}>{updatedLabel}</strong>
                  </span>
                )}
                {/* divider */}
                <span style={{ width: 1, height: 12, background: C.border, flexShrink: 0 }} />
                {/* manual refresh */}
                <button
                  onClick={() => loadData(false)}
                  disabled={isLoading}
                  title="Refresh now"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", fontSize: 11.5, fontWeight: 600, color: C.textSub, background: "transparent", border: "none", borderRadius: 6, cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? .4 : 1, transition: "color .15s", fontFamily: "'Geist',sans-serif" }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.brand)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.textSub)}
                >
                  <span className={isLoading ? "spin" : ""} style={{ display: "inline-flex" }}>
                    <Icons.RefreshCw size={11} color="currentColor" />
                  </span>
                  Refresh
                </button>
                {/* divider */}
                <span style={{ width: 1, height: 12, background: C.border, flexShrink: 0 }} />
                {/* auto-refresh toggle */}
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
                  <span
                    role="switch"
                    aria-checked={autoRefresh}
                    onClick={() => setAutoRefresh(v => !v)}
                    style={{
                      display: "inline-block", width: 28, height: 16, borderRadius: 99,
                      background: autoRefresh ? C.brand : C.border,
                      position: "relative", transition: "background .2s", flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 2, left: autoRefresh ? 14 : 2,
                      width: 12, height: 12, borderRadius: "50%", background: "#fff",
                      transition: "left .2s", boxShadow: "0 1px 2px rgba(0,0,0,.2)",
                    }} />
                  </span>
                  <span style={{ fontSize: 11.5, color: C.textMuted, whiteSpace: "nowrap" }}>
                    Auto ({REFRESH_SECS}s)
                  </span>
                </label>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[
                { label: "Start Session", Icon: Icons.Play, href: `${dashBase}/sessions` },
                { label: "Create Queue", Icon: Icons.PlusCircle, href: `${dashBase}/queues?action=create` },
                { label: "Add Staff", Icon: Icons.UserPlus, href: `${dashBase}/staff` },
                { label: "Generate QR", Icon: Icons.QrCode, href: `${dashBase}/queues?action=qr` },
                { label: "Download Report", Icon: Icons.Download, onClick: handleDownloadReport },
              ].map(a => 
                a.onClick ? (
                  <button key={a.label} onClick={a.onClick} className="qa-btn" disabled={isDownloading} style={{ fontFamily: "inherit", cursor: isDownloading ? "not-allowed" : "pointer" }}>
                    {isDownloading && a.label === "Download Report" ? (
                      <span className="spin" style={{ display: "inline-flex" }}>
                        <Icons.RefreshCw size={13} color="currentColor" />
                      </span>
                    ) : (
                      <a.Icon size={13} color="currentColor" />
                    )}
                    {a.label}
                  </button>
                ) : (
                  <Link key={a.label} href={a.href!} className="qa-btn">
                    <a.Icon size={13} color="currentColor" />
                    {a.label}
                  </Link>
                )
              )}
            </div>
          </div>

          {/* ══ ERROR ════════════════════════════════════════════ */}
          {error && (
            <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: C.redBg, border: `1px solid #fecaca`, color: "#b91c1c", padding: "12px 18px", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: 500 }}>
                <Icons.AlertCircle size={16} color="#ef4444" /> {error}
              </div>
              <button onClick={() => loadData(false)} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "6px 12px", background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 7, cursor: "pointer", fontFamily: "'Geist',sans-serif" }}>
                <Icons.RefreshCw size={12} color="currentColor" /> Retry
              </button>
            </div>
          )}

          {/* ══ METRIC CARDS ═════════════════════════════════════ */}
          <div>
            <div className="section-label" style={{ marginBottom: 14 }}>Key Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
              <MetricCard
                label="Visitors Today" value={overview?.status_counts?.total ?? 0}
                Icon={Icons.Users} trend={mkTrend(overview?.status_counts?.total ?? 0, prevOverview?.status_counts?.total)}
                color={C.brand} bg={C.brandLight} border={C.brandBorder}
                valueColor={C.brand} isLoading={isLoading}
              />
              <MetricCard
                label="Waiting Now" value={overview?.status_counts?.waiting ?? 0}
                Icon={Icons.Clock} trend={mkTrend(overview?.status_counts?.waiting ?? 0, prevOverview?.status_counts?.waiting)}
                color={C.blue} bg={C.blueBg} border="#bfdbfe"
                valueColor={C.blue} pulse isLoading={isLoading}
                subtext="in all queues" comparisonLabel={!prevOverview ? "vs yesterday" : undefined}
              />
              <MetricCard
                label="Served Today" value={overview?.status_counts?.served ?? 0}
                Icon={Icons.CheckCircle2} trend={mkTrend(overview?.status_counts?.served ?? 0, prevOverview?.status_counts?.served)}
                color={C.green} bg={C.greenBg} border="#a7f3d0"
                valueColor={C.green} isLoading={isLoading}
              />
              <MetricCard
                label="Cancelled / No-show" value={overview?.status_counts?.cancelled ?? 0}
                Icon={Icons.XCircle} trend={mkTrend(overview?.status_counts?.cancelled ?? 0, prevOverview?.status_counts?.cancelled)}
                color={C.slate} bg={C.slateBg} border={C.border}
                valueColor={C.textSub} muted isLoading={isLoading}
                subtext={overview?.status_counts?.total ? `(${Math.round((overview.status_counts.cancelled / overview.status_counts.total) * 100)}% of visitors)` : undefined}
              />
              <MetricCard
                label="Completion Rate" value={completionRate} suffix="%"
                Icon={Icons.CheckSquare} trend={null}
                color={crColor} bg={crBg} border={crBorder}
                valueColor={crColor} isLoading={isLoading}
                subtext={completionRate < 75 ? "vs 75% target" : undefined}
                comparisonLabel={!prevOverview ? "vs target" : undefined}
              />

            </div>
          </div>

          {/* ══ HOURLY TRAFFIC CHART ═════════════════════════════ */}
          {insights && insights.hourly.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="icon-badge" style={{ width: 34, height: 34, background: C.brandLight, border: `1px solid ${C.brandBorder}` }}>
                    <Icons.BarChart2 size={15} color={C.brand} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>Hourly Traffic</span>
                  <span className="chip" style={{ background: C.amberBg, color: "#92400e", border: "1px solid #fde68a" }}>
                    <Icons.Zap size={9} color={C.amber} />
                    Peak {insights.busiestHour}
                  </span>
                </div>
                <span className="lbl">{insights.hourly.length} hours · {insights.hourly.reduce((s, h) => s + h.visits, 0)} total visits</span>
              </div>
              <HourlyChart hourly={insights.hourly} maxVisits={insights.maxVisits} accentColor={C.brand} peakHour={insights.busiestHour} />
            </div>
          )}

          {/* ══ LIVE QUEUES ══════════════════════════════════════ */}
          {activeQueues.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              {/* header — matches Hourly Traffic / Per-Queue Breakdown pattern */}
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="icon-badge" style={{ width: 34, height: 34, background: C.greenBg, border: `1px solid ${C.greenBorder}` }}>
                    <Icons.Radio size={15} color={C.green} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>Live Queue Status</span>
                  <span className="live-dot" style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: C.green }} />
                  <span className="chip" style={{ background: C.greenBg, color: "#15803d", border: `1px solid ${C.greenBorder}` }}>
                    {activeQueues.length} active
                  </span>
                </div>
                <Link href={`${dashBase}/queues`} className="view-more" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: C.brand, background: C.brandLight, border: `1px solid ${C.brandBorder}`, padding: "6px 14px", borderRadius: 10, textDecoration: "none", transition: "all .2s ease" }}>
                  Manage <span className="arr"><Icons.ArrowRight size={12} color="currentColor" /></span>
                </Link>
              </div>

              {/* queue cards */}
              <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
                {activeQueues.map(q => {
                  const serving = q.current_token_number ? `${q.prefix}${q.current_token_number}` : "—";
                  const next = q.current_token_number ? `${q.prefix}${q.current_token_number + 1}` : "—";
                  return (
                    <div key={q.id} style={{
                      background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 14,
                      padding: 0, overflow: "hidden",
                      boxShadow: "0 1px 4px rgba(0,0,0,.03)",
                      transition: "box-shadow .2s, border-color .2s",
                    }}>
                      {/* Queue header strip */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 18px",
                        background: "linear-gradient(180deg, #fafbfd 0%, #fff 100%)",
                        borderBottom: `1px solid ${C.borderLight}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: C.greenBg, border: `1px solid ${C.greenBorder}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Icons.Layers size={13} color={C.green} />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.name}</span>
                        </div>
                        <span className="pill" style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0",
                        }}>
                          <span className="live-dot" style={{ display: "block", width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
                          Active
                        </span>
                      </div>

                      {/* Stats */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                        {[
                          { lbl: "Serving", val: serving, col: C.brand, icon: <Icons.Play size={11} color={C.brand} /> },
                          { lbl: "Next", val: next, col: C.text, icon: <Icons.ArrowRight size={11} color={C.amber} /> },
                          { lbl: "Prefix", val: q.prefix || "—", col: C.textMuted, icon: <Icons.Hash size={11} color={C.textMuted} /> },
                        ].map((item, i) => (
                          <div key={item.lbl} style={{
                            padding: "18px 16px", textAlign: "center" as const,
                            borderRight: i < 2 ? `1px solid ${C.borderLight}` : "none",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 10 }}>
                              {item.icon}
                              <span className="lbl">{item.lbl}</span>
                            </div>
                            <span className="mono tnum" style={{ fontSize: 24, fontWeight: 700, color: item.col, letterSpacing: "-.03em" }}>{item.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ TIMING PANELS ════════════════════════════════════ */}
          <div>
            <div className="section-label" style={{ marginBottom: 14 }}>Timing Analysis</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
              <TimingPanel
                title="Wait Times" warning={wWarn}
                avg={wAvg}
                max={wMax}
                barPct={wPct}
                iconBg={C.blueBg} iconColor={C.blue} barColor={wWarn ? C.amber : C.blue}
                Icon={Icons.Clock}
              />
              <TimingPanel
                title="Service Times" warning={sWarn}
                avg={sAvg}
                max={sMax}
                barPct={sPct}
                iconBg={C.greenBg} iconColor={C.green} barColor={sWarn ? C.amber : C.green}
                Icon={Icons.CheckCircle2}
              />
            </div>
          </div>

          {/* ══ INSIGHTS ═════════════════════════════════════════ */}
          {insights && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="icon-badge" style={{ width: 34, height: 34, background: C.violetBg, border: `1px solid ${C.violet}22` }}>
                    <Icons.Activity size={15} color={C.violet} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>Performance Insights</span>
                </div>
                <span className="lbl">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
                <SmartInsightCard
                  title="Peak Hour" data={insights.busiestHour} dataSub={`${insights.busiestVisits} visitors`}
                  analysis={insights.busiestAnalysis} recommendation={insights.busiestRec}
                  Icon={Icons.Zap} iconBg={C.amberBg} iconColor={C.amber}
                />
                <SmartInsightCard
                  title="Wait Alert" data={formatDuration(timeToSeconds(insights.longestWait))} dataSub="Max Wait"
                  analysis={insights.waitAnalysis} recommendation={insights.waitRec}
                  Icon={Icons.Clock} iconBg={C.redBg} iconColor={C.red}
                />
                <SmartInsightCard
                  title="Service Speed" data={formatDuration(timeToSeconds(insights.avgService))} dataSub="Avg Session"
                  analysis={insights.servAnalysis} recommendation={insights.servRec}
                  Icon={Icons.Activity} iconBg={C.violetBg} iconColor={C.violet}
                />
                <SmartInsightCard
                  title="Queue Balance" data={String(insights.peakWaiting)} dataSub="Waiting Now"
                  analysis={insights.distAnalysis} recommendation={insights.distRec}
                  Icon={Icons.Users} iconBg={C.blueBg} iconColor={C.blue}
                />
              </div>
            </div>
          )}

          {/* ══ QUEUE BREAKDOWN TABLE ═════════════════════════════ */}
          {queueStats.length > 0 && (() => {
            const totalServed = queueStats.reduce((s, q) => s + q.served, 0);
            const totalWaiting = queueStats.reduce((s, q) => s + q.waiting, 0);
            const grandTotal = queueStats.reduce((s, q) => s + q.total, 0);
            return (
              <div className="card" style={{ overflow: "hidden" }}>
                <div className="card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="icon-badge" style={{ width: 34, height: 34, background: C.brandLight, border: `1px solid ${C.brandBorder}` }}>
                      <Icons.Table2 size={15} color={C.brand} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>Queue Breakdown</span>
                    <span className="chip" style={{ background: C.brandLight, color: C.brand, border: `1px solid ${C.brandBorder}` }}>
                      {queueStats.length} queue{queueStats.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="lbl">{grandTotal} total tokens</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="qtable">
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: 24 }}>Queue Name</th>
                        <th style={{ textAlign: "center", width: 100 }}>Served</th>
                        <th style={{ textAlign: "center", width: 100 }}>Waiting</th>
                        <th style={{ textAlign: "center", width: 120 }}>Progress</th>
                        <th style={{ textAlign: "right", width: 90, paddingRight: 24 }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queueStats.map(qs => {
                        const pct = qs.total > 0 ? Math.round((qs.served / qs.total) * 100) : 0;
                        return (
                          <tr key={qs.queue} className="fade-in">
                            <td style={{ paddingLeft: 24 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: 8,
                                  background: C.brandLight, border: `1px solid ${C.brandBorder}`,
                                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                }}>
                                  <Icons.Layers size={12} color={C.brand} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{qs.queue}</span>
                              </div>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 10px", borderRadius: 99,
                                background: C.greenBg, color: "#15803d", border: `1px solid ${C.greenBorder}`,
                                fontSize: 12, fontWeight: 700,
                              }}>
                                <Icons.CheckCircle2 size={10} color={C.green} />
                                {qs.served}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "3px 10px", borderRadius: 99,
                                background: C.amberBg, color: "#92400e", border: "1px solid #fde68a",
                                fontSize: 12, fontWeight: 700,
                              }}>
                                <Icons.Clock size={10} color={C.amber} />
                                {qs.waiting}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 6, borderRadius: 99, background: "#f0f2f5", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${C.green}, ${C.green}cc)`, transition: "width .4s ease" }} />
                                </div>
                                <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, minWidth: 30, textAlign: "right" }}>{pct}%</span>
                              </div>
                            </td>
                            <td className="tnum" style={{ textAlign: "right", paddingRight: 24 }}>
                              <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{qs.total}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Summary footer */}
                    <tfoot>
                      <tr>
                        <td style={{ paddingLeft: 24, borderTop: `1px solid ${C.border}`, background: "linear-gradient(180deg, #f9fafb, #fafbfd)" }}>
                          <span style={{ fontWeight: 700, fontSize: 12, color: C.textSub, letterSpacing: ".04em", textTransform: "uppercase" }}>Total</span>
                        </td>
                        <td style={{ textAlign: "center", borderTop: `1px solid ${C.border}`, background: "linear-gradient(180deg, #f9fafb, #fafbfd)" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 10px", borderRadius: 99,
                            background: C.greenBg, color: "#15803d", border: `1px solid ${C.greenBorder}`,
                            fontSize: 12, fontWeight: 700,
                          }}>
                            {totalServed}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", borderTop: `1px solid ${C.border}`, background: "linear-gradient(180deg, #f9fafb, #fafbfd)" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 10px", borderRadius: 99,
                            background: C.amberBg, color: "#92400e", border: "1px solid #fde68a",
                            fontSize: 12, fontWeight: 700,
                          }}>
                            {totalWaiting}
                          </span>
                        </td>
                        <td style={{ borderTop: `1px solid ${C.border}`, background: "linear-gradient(180deg, #f9fafb, #fafbfd)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 99, background: "#f0f2f5", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${grandTotal > 0 ? Math.round((totalServed / grandTotal) * 100) : 0}%`, borderRadius: 99, background: `linear-gradient(90deg, ${C.brand}, ${C.brand}bb)` }} />
                            </div>
                            <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, minWidth: 30, textAlign: "right" }}>{grandTotal > 0 ? Math.round((totalServed / grandTotal) * 100) : 0}%</span>
                          </div>
                        </td>
                        <td className="tnum" style={{ textAlign: "right", paddingRight: 24, borderTop: `1px solid ${C.border}`, background: "linear-gradient(180deg, #f9fafb, #fafbfd)" }}>
                          <span className="mono" style={{ fontSize: 15, fontWeight: 800, color: C.brand }}>{grandTotal}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ══ ACTIVITY FEED ════════════════════════════════════ */}
          <div className="card" style={{ overflow: "hidden" }}>
            {/* header */}
            <div className="card-header" style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <div className="icon-badge" style={{ width: 34, height: 34, background: C.brandLight, border: `1px solid ${C.brandBorder}` }}>
                  <Icons.Activity size={15} color={C.brand} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>Recent Activity</span>
                    <span className="live-dot" style={{ display: "block", width: 7, height: 7, borderRadius: "50%", background: C.green }} />
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textMuted, fontWeight: 500 }}>Live session feed</p>
                </div>
              </div>

              {!isLoading && overview?.recent_activity && (
                <div className="activity-legend" style={{ position: "absolute", top: 18, right: 34 }}>
                  <ActivityLegend
                    waiting={overview.recent_activity.filter(a => a.status === "waiting").length}
                    serving={overview.recent_activity.filter(a => a.status === "serving").length}
                    done={overview.recent_activity.filter(a => a.status === "done").length}
                  />
                </div>
              )}

              <Link href={`${dashBase}/history`} className="view-more" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: C.brand, background: C.brandLight, border: `1px solid ${C.brandBorder}`, padding: "6px 14px", borderRadius: 10, textDecoration: "none", transition: "all .2s ease", marginLeft: 20 }}>
                View all <span className="arr"><Icons.ArrowRight size={12} color="currentColor" /></span>
              </Link>
            </div>

            {isLoading ? (
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 12 }}>
                {[88, 70, 79, 63, 75].map((w, i) => (
                  <div key={i} className="shimmer" style={{ height: 58, width: `${w}%`, borderRadius: 12 }} />
                ))}
              </div>
            ) : overview?.recent_activity?.length ? (
              <>
                {/* feed filters */}
                <div style={{ padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: "#fff" }}>
                  <div className="feed-tabs">
                    {[
                      { id: "all", lbl: "All", icon: Icons.Filter, count: overview.recent_activity.length },
                      { id: "waiting", lbl: "Waiting", icon: Icons.Clock, count: overview.recent_activity.filter(a => a.status === "waiting").length },
                      { id: "serving", lbl: "Serving", icon: Icons.Megaphone, count: overview.recent_activity.filter(a => a.status === "serving").length },
                      { id: "done", lbl: "Done", icon: Icons.CheckCircle2, count: overview.recent_activity.filter(a => a.status === "done").length },
                    ].map(t => (
                      <button
                        key={t.id}
                        className={`feed-tab ${feedFilter === t.id ? "active" : ""}`}
                        onClick={() => setFeedFilter(t.id as any)}
                      >
                        <t.icon size={13} color="currentColor" />
                        {t.lbl}
                        <span className="badge tnum">{t.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: "0 18px", padding: "10px 24px", borderBottom: `1px solid ${C.border}`, background: "linear-gradient(180deg, #fafbfc, #f8f9fb)" }}>
                  {["Event", "Details", "Status", "Time"].map((h, i) => (
                    <span key={h} className="lbl" style={{ textAlign: i >= 2 ? "center" : "left", fontSize: 11, letterSpacing: ".08em" }}>{h}</span>
                  ))}
                </div>

                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {overview.recent_activity.filter(a => feedFilter === "all" || a.status === feedFilter).map((act, idx) => {
                    const cfgMap: Record<string, { Icon: (p: IconProps) => React.ReactNode; iconBg: string; iconColor: string; chipBg: string; chipColor: string; chipBorder: string; dot: string }> = {
                      waiting: { Icon: Icons.Clock, iconBg: C.amberBg, iconColor: C.amber, chipBg: C.amberBg, chipColor: "#92400e", chipBorder: "#fde68a", dot: C.amber },
                      serving: { Icon: Icons.Megaphone, iconBg: C.blueBg, iconColor: C.blue, chipBg: C.blueBg, chipColor: "#1e40af", chipBorder: "#bfdbfe", dot: C.blue },
                      done: { Icon: Icons.CheckCircle2, iconBg: C.greenBg, iconColor: C.green, chipBg: C.greenBg, chipColor: "#065f46", chipBorder: "#a7f3d0", dot: C.green },
                    };
                    const cfg = cfgMap[act.status] ?? { Icon: Icons.XCircle, iconBg: C.slateBg, iconColor: C.slate, chipBg: C.slateBg, chipColor: C.textSub, chipBorder: C.border, dot: C.textMuted };

                    return (
                      <li
                        key={idx}
                        className="trow fade-in"
                        onClick={() => setDrawerAct(act)}
                        style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: "0 18px", alignItems: "center", padding: "14px 24px", borderBottom: `1px solid ${C.borderLight}`, animationDelay: `${idx * 20}ms`, cursor: "pointer" }}
                      >
                        {/* icon */}
                        <div className="icon-badge" style={{ width: 38, height: 38, background: cfg.iconBg, border: `1px solid ${cfg.chipBorder}` }}>
                          <cfg.Icon size={15} color={cfg.iconColor} />
                        </div>
                        {/* message */}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>
                            {statusLabel(act)}
                          </p>
                          <p style={{ margin: "3px 0 0", fontSize: 11.5, color: C.textMuted, lineHeight: 1.3 }}>{act.queue}</p>
                        </div>
                        {/* status chip */}
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <span className="chip" style={{ background: cfg.chipBg, color: cfg.chipColor, border: `1px solid ${cfg.chipBorder}`, padding: "4px 11px", borderRadius: 8 }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                            {act.status}
                          </span>
                        </div>
                        {/* time */}
                        <span className="mono tnum" style={{ fontSize: 12, color: C.textMuted, textAlign: "right", minWidth: 48, fontWeight: 500 }}>
                          {new Date(act.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* pagination */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderTop: `1px solid ${C.border}`, background: "linear-gradient(180deg, #f9fafb, #fafbfc)" }}>
                  <button onClick={() => setRecentPage(p => Math.max(1, p - 1))} disabled={recentPage === 1 || isLoading} className="pg-btn">
                    <Icons.ArrowLeft size={13} color="currentColor" /> Previous
                  </button>
                  <span className="mono tnum" style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: ".04em" }}>
                    Page {recentPage}
                  </span>
                  <button onClick={() => setRecentPage(p => p + 1)} disabled={(overview?.recent_activity?.length || 0) < LIMIT || isLoading} className="pg-btn">
                    Next <Icons.ArrowRight size={13} color="currentColor" />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "64px 0" }}>
                <div className="icon-badge" style={{ width: 56, height: 56, background: C.slateBg, border: `1px solid ${C.border}` }}>
                  <Icons.Clipboard size={24} color={C.textMuted} />
                </div>
                <p style={{ margin: 0, fontSize: 14, color: C.textSub, fontWeight: 600 }}>No recent activity detected</p>
                <p style={{ margin: 0, fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>Activity will appear here once your session begins.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ══ ACTIVITY DRAWER ════════════════════════════════════════ */}
      {drawerAct && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawerAct(null)} />
          <div className="drawer-panel" role="dialog" aria-modal="true">
            <div className="drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Interaction Details</h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textSub }}>{drawerAct.queue}</p>
              </div>
              <button
                onClick={() => setDrawerAct(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}
                onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
              >
                <Icons.X size={20} color="currentColor" />
              </button>
            </div>

            <div className="drawer-body">
              {/* Top Banner */}
              <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 22, background: C.slateBg, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 28 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: C.brandLight, border: `1px solid ${C.brandBorder}`, color: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
                  {drawerAct.token_number}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>Current Status</div>
                  <span className="chip" style={{ background: "#fff", border: `1px solid ${C.border}`, fontSize: 13, padding: "5px 12px", borderRadius: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: drawerAct.status === "serving" ? C.blue : (drawerAct.status === "waiting" ? C.amber : C.green), display: "inline-block" }} />
                    <span style={{ textTransform: "capitalize" }}>{drawerAct.status}</span>
                  </span>
                </div>
              </div>

              {/* Vertical Timeline */}
              <div className="section-label" style={{ marginBottom: 16 }}>Timeline</div>

              <div style={{ position: "relative", paddingLeft: 14 }}>
                {/* Connector line */}
                <div style={{ position: "absolute", left: 18, top: 14, bottom: 14, width: 2, background: `linear-gradient(180deg, ${C.brand}33, ${C.border})`, borderRadius: 99 }} />

                {[
                  { lbl: "Token Issued", time: drawerAct.time, active: true },
                  { lbl: "Waiting in Queue", time: drawerAct.time, active: ["waiting", "serving", "done"].includes(drawerAct.status) },
                  { lbl: "Currently Serving", time: drawerAct.status === "serving" || drawerAct.status === "done" ? drawerAct.time : null, active: ["serving", "done"].includes(drawerAct.status) },
                  { lbl: "Service Completed", time: drawerAct.status === "done" ? drawerAct.time : null, active: drawerAct.status === "done" }
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 18, position: "relative", marginBottom: 28, opacity: step.active ? 1 : 0.35, transition: "opacity .3s ease" }}>
                    {/* Dot */}
                    <div style={{ position: "relative", zIndex: 2, width: 12, height: 12, borderRadius: "50%", background: step.active ? C.brand : C.pageBg, border: `2px solid ${step.active ? "#fff" : C.border}`, outline: `2px solid ${step.active ? C.brandBorder : "transparent"}`, marginTop: 4, boxShadow: step.active ? `0 0 8px ${C.brandGlow}` : "none", transition: "all .3s ease" }} />

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{step.lbl}</div>
                      <div className="mono tnum" style={{ fontSize: 12, color: C.textMuted, marginTop: 5, fontWeight: 500 }}>
                        {step.time ? new Date(step.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </>
      )}

    </>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

function MetricCard({
  label, value, Icon, trend, color, bg, border, valueColor,
  pulse, muted, isLoading, suffix = "", subtext, comparisonLabel
}: {
  label: string; value: number;
  Icon: (p: IconProps) => React.ReactNode;
  trend: { up: boolean; pct: number } | null;
  color: string; bg: string; border: string; valueColor: string;
  pulse?: boolean; muted?: boolean; isLoading?: boolean; suffix?: string;
  subtext?: string; comparisonLabel?: string;
}) {

  if (isLoading) {
    return (
      <div className="card card-skeleton" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div className="shim" style={{ width: "60%", height: 16 }} />
          <div className="shim" style={{ width: 36, height: 36, borderRadius: 12 }} />
        </div>
        <div className="shim" style={{ width: "45%", height: 36, marginTop: 4 }} />
        <div className="shim" style={{ width: "80%", height: 12, marginTop: 8 }} />
      </div>
    );
  }

  return (
    <div className="card metric-card" style={{ padding: "24px 26px", position: "relative", overflow: "hidden", cursor: "default" }}>
      {/* corner tint */}
      <div aria-hidden style={{ position: "absolute", top: 0, right: 0, width: 110, height: 110, background: `radial-gradient(circle at 100% 0%, ${bg}, transparent 70%)`, pointerEvents: "none", borderRadius: "0 14px 0 0" }} />

      {/* label + icon row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span className="lbl" style={{ color: muted ? C.textMuted : C.textSub, fontSize: 11, letterSpacing: ".07em" }}>{label}</span>
        <div className="icon-badge" style={{ width: 38, height: 38, background: bg, border: `1px solid ${border}`, position: "relative" }}>
          {pulse && (
            <span className="live-dot" style={{ position: "absolute", inset: -3, borderRadius: 13, border: `2px solid ${color}`, opacity: .25 }} />
          )}
          <Icon size={16} color={color} />
        </div>
      </div>

      {/* value */}
      <span className="mono tnum" style={{ display: "block", fontSize: 40, fontWeight: 700, color: muted ? C.textMuted : valueColor, letterSpacing: "-.045em", lineHeight: 1 }}>
        {value.toLocaleString()}{suffix}
      </span>

      {/* colored bottom bar */}
      <div style={{ marginTop: 20, height: 3, borderRadius: 99, background: bg, overflow: "hidden", opacity: value === 0 ? 0 : 1, transition: "opacity 0.3s ease" }}>
        <div style={{ height: "100%", width: muted ? "18%" : "65%", background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 99, opacity: muted ? .4 : .75 }} />
      </div>

      {/* trend & subtext footer */}
      <div style={{ marginTop: 12, minHeight: 20 }}>
        {trend ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: trend.up ? C.green : C.red }}>
            {trend.up ? "↑" : "↓"}
            <span className="tnum" style={{ marginLeft: 2 }}>{trend.pct}%</span>
            <span style={{ color: C.textMuted, fontWeight: 400, marginLeft: 4 }}>{comparisonLabel || "vs last session"}</span>
          </div>
        ) : (
          comparisonLabel && (
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>
              {comparisonLabel}
            </div>
          )
        )}
        {subtext && (
          <div style={{ marginTop: (trend || comparisonLabel) ? 4 : 0, fontSize: 11.5, color: C.textMuted, fontWeight: 500 }}>
            {subtext}
          </div>
        )}
      </div>

    </div>
  );
}

function ActivityLegend({ waiting, serving, done }: { waiting: number; serving: number; done: number }) {
  return (
    <>
      <div className="leg-item" style={{ color: C.amber }}>
        <span className="leg-dot" style={{ color: C.amber }} />
        Waiting <span className="leg-badge">{waiting}</span>
      </div>
      <div style={{ width: 1, height: 12, background: C.border }} />
      <div className="leg-item" style={{ color: C.blue }}>
        <span className="leg-dot" style={{ color: C.blue }} />
        Serving <span className="leg-badge">{serving}</span>
      </div>
      <div style={{ width: 1, height: 12, background: C.border }} />
      <div className="leg-item" style={{ color: C.green }}>
        <span className="leg-dot" style={{ color: C.green }} />
        Done <span className="leg-badge">{done}</span>
      </div>
    </>
  );
}

function NotificationSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState([
    { id: 1, type: "warning", text: "Wait time exceeded 30 min - Doctor Ambedhkar queue", time: "2 minutes ago", isRead: false, icon: "⚠️" },
    { id: 2, type: "success", text: "Session started successfully", time: "1 hour ago", isRead: false, icon: "✅" },
    { id: 3, type: "info", text: "5 customers joined Doctor Imbu queue", time: "2 hours ago", isRead: true, icon: "ℹ️" },
  ]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        className={`notif-btn ${isOpen ? "active" : ""} ${unreadCount > 0 ? "bell-shake" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <Icons.Bell size={20} color={isOpen ? "#fff" : C.textSub} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: C.text, letterSpacing: "-0.01em" }}>Notifications</span>
            <button
              onClick={markAllAsRead}
              style={{ background: "none", border: "none", color: C.brand, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "4px 8px", borderRadius: "6px" }}
              onMouseEnter={e => (e.currentTarget.style.background = C.brandLight)}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              Mark all as read
            </button>
          </div>

          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div key={n.id} className={`notif-item ${!n.isRead ? "unread" : ""}`}>
                  <div style={{ fontSize: 18, width: 24, flexShrink: 0, display: "flex", justifyContent: "center" }}>{n.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: C.text, lineHeight: 1.5 }}>
                      {n.text}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 11.5, color: C.textMuted, fontWeight: 500 }}>
                      {n.time}
                    </p>
                  </div>
                  {!n.isRead && <div className="unread-dot" />}
                </div>
              ))
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center", color: C.textMuted }}>
                <div style={{ marginBottom: 16, opacity: 0.5 }}><Icons.Bell size={32} color={C.textMuted} /></div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>All caught up!</p>
              </div>
            )}
          </div>

          <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.border}`, background: "#fafafa", textAlign: "center" }}>
            <Link
              href="/notifications"
              style={{ fontSize: 12, fontWeight: 700, color: C.brand, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              View All Notifications
              <Icons.ArrowRight size={14} color="currentColor" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function TimingPanel({ title, avg, max, barPct, warning, iconBg, iconColor, barColor, Icon }: {
  title: string; avg: number; max: number; barPct: number; warning: boolean;
  iconBg: string; iconColor: string; barColor: string;
  Icon: (p: IconProps) => React.ReactNode;
}) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* panel header */}
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="icon-badge" style={{ width: 34, height: 34, background: iconBg, border: `1px solid ${iconColor}22` }}>
            <Icon size={15} color={iconColor} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>{title}</span>
        </div>
        {warning && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "#92400e", background: C.amberBg, border: "1px solid #fde68a", padding: "4px 10px", borderRadius: 99 }}>
            <Icons.AlertTriangle size={11} color={C.amber} /> High variance
          </div>
        )}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {/* avg / max stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
          {/* Average */}
          <div style={{
            background: `${iconBg}`, border: `1px solid ${iconColor}18`,
            borderRadius: 12, padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
              <Icons.TrendingUp size={11} color={iconColor} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase" }}>Average</span>
            </div>
            <span className="mono tnum" style={{ display: "block", fontSize: 24, fontWeight: 700, color: iconColor, letterSpacing: "-.03em", lineHeight: 1 }}>{formatDuration(avg)}</span>
          </div>
          {/* Maximum */}
          <div style={{
            background: "#fff", border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
              <Icons.AlertTriangle size={11} color={C.textMuted} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase" }}>Maximum</span>
            </div>
            <span className="mono tnum" style={{ display: "block", fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: "-.03em", lineHeight: 1 }}>{formatDuration(max)}</span>
          </div>

        </div>

        {/* progress bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span className="lbl">Avg / Max ratio</span>
          <span className="mono tnum" style={{
            fontSize: 11, fontWeight: 700, color: iconColor,
            background: iconBg, border: `1px solid ${iconColor}22`,
            padding: "2px 8px", borderRadius: 99,
          }}>{barPct}%</span>
        </div>
        <div style={{ background: "#f0f2f5", borderRadius: 99, overflow: "hidden", height: 6, position: "relative" }}>
          <div style={{
            width: `${barPct}%`, height: "100%", borderRadius: 99,
            background: `linear-gradient(90deg, ${barColor}, ${barColor}bb)`,
            position: "relative", overflow: "hidden",
            transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
              animation: "shimmer 2.5s infinite",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SmartInsightCard({
  title, data, dataSub, analysis, recommendation, Icon, iconBg, iconColor
}: {
  title: string; data: string; dataSub: string; analysis: string; recommendation: string;
  Icon: (p: IconProps) => React.ReactNode;
  iconBg: string; iconColor: string;
}) {
  return (
    <div className="card smart-insight" style={{
      padding: "24px", display: "flex", flexDirection: "column", gap: 18,
      background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 18,
      position: "relative", overflow: "hidden", transition: "all .3s ease"
    }}>
      <div aria-hidden style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at 100% 0%, ${iconBg}, transparent 70%)`, pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
        <div className="icon-badge" style={{ width: 38, height: 38, background: iconBg, border: `1px solid ${iconColor}22` }}>
          <Icon size={18} color={iconColor} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".1em", color: C.textSub }}>{title}</span>
      </div>

      {/* Data Section */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="mono tnum" style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-.04em" }}>{data}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>{dataSub}</span>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textSub, fontWeight: 500, lineHeight: 1.5 }}>
          {analysis}
        </p>
      </div>

      {/* Recommendation Box */}
      <div style={{
        padding: "14px 16px", background: "#f8fafc", borderRadius: 12, border: "1px dashed #e2e8f0",
        position: "relative", zIndex: 1
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icons.Zap size={14} color={C.amber} />
          <span style={{ fontSize: 11, fontWeight: 750, color: C.amber, textTransform: "uppercase", letterSpacing: ".05em" }}>Recommendation</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#475569", fontWeight: 500, lineHeight: 1.5 }}>
          {recommendation}
        </p>
      </div>

      <style jsx>{`
        .smart-insight:hover { border-color: ${iconColor}55; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.08); transform: translateY(-2px); }
      `}</style>
    </div>
  );
}

// ── Hourly Traffic Chart ─────────────────────────────────────────
function HourlyChart({ hourly, maxVisits, accentColor, peakHour }: {
  hourly: { hour: string; visits: number }[];
  maxVisits: number;
  accentColor: string;
  peakHour: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalVisits = hourly.reduce((s, h) => s + h.visits, 0);
  const avgVisits = hourly.length > 0 ? Math.round(totalVisits / hourly.length) : 0;
  const safeTot = totalVisits || 1;

  // Vibrant multi-hue palette
  const palette = [
    "#6366f1", "#8b5cf6", "#a78bfa", "#818cf8", "#7c3aed",
    "#4f46e5", "#6d28d9", "#5b21b6", "#4338ca", "#3b82f6",
    "#2563eb", "#1d4ed8", "#0ea5e9", "#06b6d4", "#14b8a6",
    "#10b981", "#059669", "#f59e0b", "#f97316", "#ef4444",
    "#ec4899", "#d946ef", "#a855f7", "#8b5cf6", "#7c3aed",
  ];

  // Build slices
  const activeHours = hourly.map((h, i) => ({ ...h, idx: i })).filter(h => h.visits > 0);
  const slices = activeHours.map((h) => ({
    ...h,
    pct: h.visits / safeTot,
    color: palette[h.idx % palette.length],
    isPeak: h.hour === peakHour,
  }));

  // Top 3 hours sorted by visits
  const top3 = [...hourly].sort((a, b) => b.visits - a.visits).slice(0, 3);
  const rankBg = ["linear-gradient(135deg,#f59e0b,#fbbf24)", "linear-gradient(135deg,#94a3b8,#cbd5e1)", "linear-gradient(135deg,#b45309,#d97706)"];

  // Donut dimensions
  const VB = 420;
  const ctr = VB / 2;
  const R = 110, r = 70;
  const LABEL_R = 142;
  const GAP_DEG = 1.5;

  // Build arc paths
  const totalGap = slices.length * GAP_DEG;
  const availDeg = 360 - totalGap;
  let angleOffset = -90;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcs = slices.map((sl, arcIdx) => {
    const sweep = sl.pct * availDeg;
    const startA = angleOffset + GAP_DEG / 2;
    const endA = startA + sweep;
    angleOffset = endA + GAP_DEG / 2;

    const outerR = sl.isPeak || hoveredIdx === sl.idx ? R + 8 : R;
    const ax1 = ctr + outerR * Math.cos(toRad(startA));
    const ay1 = ctr + outerR * Math.sin(toRad(startA));
    const ax2 = ctr + outerR * Math.cos(toRad(endA));
    const ay2 = ctr + outerR * Math.sin(toRad(endA));
    const ix1 = ctr + r * Math.cos(toRad(endA));
    const iy1 = ctr + r * Math.sin(toRad(endA));
    const ix2 = ctr + r * Math.cos(toRad(startA));
    const iy2 = ctr + r * Math.sin(toRad(startA));
    const largeArc = sweep > 180 ? 1 : 0;

    const d = [
      `M ${ax1} ${ay1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ax2} ${ay2}`,
      `L ${ix1} ${iy1}`,
      `A ${r} ${r} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      `Z`,
    ].join(" ");

    const midAngle = (startA + endA) / 2;
    const lx = ctr + LABEL_R * Math.cos(toRad(midAngle));
    const ly = ctr + LABEL_R * Math.sin(toRad(midAngle));
    const ox = ctr + (R + 3) * Math.cos(toRad(midAngle));
    const oy = ctr + (R + 3) * Math.sin(toRad(midAngle));
    const midR = (R + r) / 2;
    const mx = ctr + midR * Math.cos(toRad(midAngle));
    const my = ctr + midR * Math.sin(toRad(midAngle));

    return { ...sl, d, midAngle, lx, ly, ox, oy, mx, my, sweep, arcIdx };
  });

  const hovered = hoveredIdx !== null ? hourly[hoveredIdx] : null;

  // External labels for top 5 segments
  const labelledIdxs = new Set(
    [...arcs].sort((a, b) => b.visits - a.visits).slice(0, 5).filter(a => a.pct >= 0.04).map(a => a.idx)
  );

  const peakVisits = hourly.find(h => h.hour === peakHour)?.visits ?? 0;

  return (
    <div style={{ padding: "20px 24px 22px" }}>
      {/* Info banner pill */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20,
        padding: "8px 16px", borderRadius: 99,
        background: "linear-gradient(135deg, #eef2ff 0%, #f0f4ff 50%, #e8ecff 100%)",
        border: "1px solid #c7d2fe",
        boxShadow: "0 1px 4px rgba(99,102,241,.08)",
      }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icons.Info size={12} color="#fff" />
        </div>
        <span style={{ fontSize: 12.5, color: "#4338ca", fontWeight: 600, fontFamily: "'Inter',sans-serif", letterSpacing: "-.01em" }}>
          Each slice shows one tracked hour — hover to explore the data
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 36 }}>

        {/* ── Donut Chart ── */}
        <div style={{ flexShrink: 0, position: "relative", width: 380, height: 380 }}>
          <svg viewBox={`0 0 ${VB} ${VB}`} width={380} height={380} style={{ display: "block" }}>
            <defs>
              <radialGradient id="hCenterGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="70%" stopColor="#fafbff" />
                <stop offset="100%" stopColor="#f0f0ff" />
              </radialGradient>
              <filter id="hShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.12" />
              </filter>
              {/* Gradient fills for each arc */}
              {arcs.map((arc) => (
                <linearGradient key={`g-${arc.idx}`} id={`seg-${arc.idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={arc.color} />
                  <stop offset="100%" stopColor={`${arc.color}cc`} />
                </linearGradient>
              ))}
            </defs>

            {/* Decorative outer track */}
            <circle cx={ctr} cy={ctr} r={R + 2} fill="none" stroke="#e8ecff" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />

            {/* Arc segments */}
            {arcs.map((arc) => {
              const isHov = hoveredIdx === arc.idx;
              return (
                <path
                  key={arc.idx}
                  d={arc.d}
                  fill={`url(#seg-${arc.idx})`}
                  opacity={hoveredIdx === null || isHov ? (arc.isPeak ? 1 : 0.88) : 0.25}
                  stroke="#fff"
                  strokeWidth={isHov ? 3 : 1}
                  filter={isHov ? "url(#hShadow)" : undefined}
                  onMouseEnter={() => setHoveredIdx(arc.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: "pointer", transition: "opacity 0.25s ease, stroke-width 0.2s ease" }}
                />
              );
            })}

            {/* Percentage labels on large slices */}
            {arcs.filter(a => a.pct >= 0.08).map((arc) => (
              <text
                key={`pct-${arc.idx}`}
                x={arc.mx} y={arc.my}
                textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 10, fontWeight: 800, fill: "#fff", fontFamily: "'JetBrains Mono',monospace", pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,.2)" }}
              >
                {Math.round(arc.pct * 100)}%
              </text>
            ))}

            {/* External labels with leader lines */}
            {arcs.filter(a => labelledIdxs.has(a.idx)).map((arc) => {
              const isRight = arc.lx > ctr;
              const endX = isRight ? arc.lx + 24 : arc.lx - 24;
              const isHov = hoveredIdx === arc.idx;
              return (
                <g key={`lbl-${arc.idx}`} opacity={hoveredIdx === null || isHov ? 1 : 0.3} style={{ transition: "opacity 0.25s" }}>
                  <line x1={arc.ox} y1={arc.oy} x2={arc.lx} y2={arc.ly} stroke={arc.color} strokeWidth="1" opacity="0.4" />
                  <line x1={arc.lx} y1={arc.ly} x2={endX} y2={arc.ly} stroke={arc.color} strokeWidth="1" opacity="0.4" />
                  <circle cx={arc.ox} cy={arc.oy} r={2} fill={arc.color} />
                  <text x={endX + (isRight ? 6 : -6)} y={arc.ly - 6} textAnchor={isRight ? "start" : "end"} dominantBaseline="auto"
                    style={{ fontSize: 13, fontWeight: 700, fill: arc.isPeak ? accentColor : C.text, fontFamily: "'Inter',sans-serif" }}>
                    {arc.hour}
                  </text>
                  <text x={endX + (isRight ? 6 : -6)} y={arc.ly + 9} textAnchor={isRight ? "start" : "end"} dominantBaseline="auto"
                    style={{ fontSize: 11, fontWeight: 500, fill: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>
                    {arc.visits} visits
                  </text>
                </g>
              );
            })}

            {/* Center hole with glow */}
            <circle cx={ctr} cy={ctr} r={r} fill="none" stroke="#c7d2fe" strokeWidth="0.5" opacity="0.3" />
            <circle cx={ctr} cy={ctr} r={r - 1} fill="#fff" />
            <circle cx={ctr} cy={ctr} r={r - 1} fill="url(#hCenterGlow)" />

            {/* Center text */}
            {hovered ? (
              <>
                <text x={ctr} y={ctr - 14} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 28, fontWeight: 800, fill: palette[hoveredIdx! % palette.length], fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-.03em" }}>
                  {hovered.visits}
                </text>
                <text x={ctr} y={ctr + 6} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 11, fontWeight: 600, fill: C.textSub, fontFamily: "'Inter',sans-serif" }}>
                  {hovered.hour}
                </text>
                <text x={ctr} y={ctr + 22} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 9, fontWeight: 500, fill: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>
                  {Math.round((hovered.visits / safeTot) * 100)}% share
                </text>
              </>
            ) : (
              <>
                <text x={ctr} y={ctr - 14} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 28, fontWeight: 800, fill: C.text, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "-.04em" }}>
                  {totalVisits.toLocaleString()}
                </text>
                <text x={ctr} y={ctr + 6} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 11, fontWeight: 500, fill: C.textMuted, fontFamily: "'Inter',sans-serif" }}>
                  total visits
                </text>
                <text x={ctr} y={ctr + 22} textAnchor="middle" dominantBaseline="middle"
                  style={{ fontSize: 9, fontWeight: 500, fill: C.textMuted, fontFamily: "'JetBrains Mono',monospace" }}>
                  {hourly.length} hours tracked
                </text>
              </>
            )}
          </svg>
        </div>

        {/* ── Right Panel ── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* ── Summary stat cards with icons ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {/* Peak */}
            <div style={{
              background: "linear-gradient(135deg, #fef9f0 0%, #fff7ed 100%)",
              border: "1px solid #fed7aa", borderRadius: 14, padding: "14px 16px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #f59e0b, #fbbf24)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icons.Zap size={14} color="#fff" />
              </div>
              <span style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "#92400e", letterSpacing: ".05em", textTransform: "uppercase" as const, marginBottom: 6 }}>Peak Hour</span>
              <span className="mono tnum" style={{ fontSize: 22, fontWeight: 800, color: "#b45309", lineHeight: 1 }}>{peakVisits}</span>
              <span style={{ display: "block", fontSize: 11, color: "#b45309", marginTop: 4, fontWeight: 600, opacity: 0.7 }}>{peakHour}</span>
            </div>

            {/* Total */}
            <div style={{
              background: "linear-gradient(135deg, #eef2ff 0%, #e8ecff 100%)",
              border: "1px solid #c7d2fe", borderRadius: 14, padding: "14px 16px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icons.BarChart3 size={14} color="#fff" />
              </div>
              <span style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "#3730a3", letterSpacing: ".05em", textTransform: "uppercase" as const, marginBottom: 6 }}>Total Visits</span>
              <span className="mono tnum" style={{ fontSize: 22, fontWeight: 800, color: "#4338ca", lineHeight: 1 }}>{totalVisits.toLocaleString()}</span>
              <span style={{ display: "block", fontSize: 11, color: "#4338ca", marginTop: 4, fontWeight: 600, opacity: 0.7 }}>all hours</span>
            </div>

            {/* Average */}
            <div style={{
              background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
              border: "1px solid #a7f3d0", borderRadius: 14, padding: "14px 16px",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 10, right: 10, width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #059669, #34d399)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icons.Clock size={14} color="#fff" />
              </div>
              <span style={{ display: "block", fontSize: 10.5, fontWeight: 600, color: "#065f46", letterSpacing: ".05em", textTransform: "uppercase" as const, marginBottom: 6 }}>Average</span>
              <span className="mono tnum" style={{ fontSize: 22, fontWeight: 800, color: "#047857", lineHeight: 1 }}>{avgVisits}</span>
              <span style={{ display: "block", fontSize: 11, color: "#047857", marginTop: 4, fontWeight: 600, opacity: 0.7 }}>per hour</span>
            </div>
          </div>

          {/* ── Top Hours breakdown ── */}
          <div style={{
            background: "linear-gradient(180deg, #fafbff 0%, #fff 100%)",
            border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Icons.TrendingUp size={14} color={C.brand} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text, letterSpacing: ".02em" }}>Top Performing Hours</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {top3.map((h, rank) => {
                const pct = Math.round((h.visits / safeTot) * 100);
                const isPeak = h.hour === peakHour;
                const idx = hourly.findIndex(x => x.hour === h.hour);
                const clr = palette[idx % palette.length];
                return (
                  <div key={h.hour} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: rankBg[rank], display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,.15)" }}>{rank + 1}</span>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: clr, flexShrink: 0, boxShadow: `0 0 0 2px #fff, 0 0 6px ${clr}44` }} />
                    <span style={{ fontSize: 13, fontWeight: isPeak ? 700 : 500, color: isPeak ? accentColor : C.text, width: 52, fontFamily: "'Inter',sans-serif" }}>{h.hour}</span>
                    <div style={{ flex: 1, height: 8, borderRadius: 99, background: "#f1f5f9", overflow: "hidden", position: "relative" }}>
                      <div style={{
                        height: "100%", width: `${pct}%`, borderRadius: 99,
                        background: `linear-gradient(90deg, ${clr}, ${clr}99)`,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,.3)`,
                      }} />
                    </div>
                    <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: C.text, width: 36, textAlign: "right" }}>{h.visits}</span>
                    <span className="mono tnum" style={{
                      fontSize: 11, fontWeight: 600, width: 38, textAlign: "right",
                      color: "#fff", background: `${clr}cc`, borderRadius: 6, padding: "2px 6px",
                    }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Distribution legend ── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icons.Clock size={13} color={C.textMuted} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub, letterSpacing: ".04em", textTransform: "uppercase" as const }}>All Hours</span>
              </div>
              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>{hourly.length} entries</span>
            </div>
            <div style={{ maxHeight: 120, overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px", paddingRight: 6 }}>
              {hourly.map((h, i) => {
                const isHov = hoveredIdx === i;
                const isPeak = h.hour === peakHour;
                const pct = Math.round((h.visits / safeTot) * 100);
                const clr = palette[i % palette.length];
                return (
                  <div
                    key={h.hour}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 10px", borderRadius: 8,
                      background: isHov ? `${clr}0d` : "transparent",
                      border: isHov ? `1px solid ${clr}22` : "1px solid transparent",
                      cursor: "pointer", transition: "all 0.18s ease",
                      transform: isHov ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    <span style={{
                      display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: clr,
                      boxShadow: isPeak ? `0 0 0 2px #fff, 0 0 0 3.5px ${accentColor}, 0 0 8px ${accentColor}33` : (isHov ? `0 0 6px ${clr}44` : "none"),
                    }} />
                    <span style={{ fontSize: 12.5, fontWeight: isPeak ? 700 : (isHov ? 600 : 400), color: isPeak ? accentColor : (isHov ? C.text : C.textSub), flex: 1, fontFamily: "'Inter',sans-serif" }}>
                      {h.hour}
                    </span>
                    <span className="mono tnum" style={{ fontSize: 11.5, fontWeight: 600, color: isHov ? C.text : C.textMuted }}>
                      {h.visits}
                    </span>
                    <span className="mono tnum" style={{
                      fontSize: 10.5, fontWeight: 600, width: 30, textAlign: "right",
                      color: isHov ? clr : C.textMuted,
                    }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}