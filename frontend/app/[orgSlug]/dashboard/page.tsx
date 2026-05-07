
"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
    transition: all 0.2s cubic-bezier(.4,0,.2,1);
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
    box-shadow: 0 4px 16px rgba(79,70,229,.25);
  }
  .notif-badge {
    position: absolute;
    top: -5px; right: -5px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #fff;
    font-size: 10px; font-weight: 800;
    min-width: 18px; height: 18px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid #fff;
    padding: 0 4px;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
    animation: badgePop 0.3s cubic-bezier(.16,1,.3,1);
  }
  @keyframes badgePop {
    from { transform: scale(0); } to { transform: scale(1); }
  }
  .notif-dropdown {
    width: 380px;
    background: #ffffff;
    border: 1px solid ${C.border};
    border-radius: 16px;
    box-shadow:
      0 10px 50px rgba(0,0,0,.14),
      0 4px 16px rgba(0,0,0,.06),
      0 0 0 1px rgba(0,0,0,.03);
    z-index: 9999;
    overflow: hidden;
    animation: dropInDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    transform-origin: top right;
  }
  @keyframes dropInDown {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .notif-item {
    padding: 14px 18px;
    display: flex; gap: 12px; align-items: flex-start;
    border-bottom: 1px solid ${C.borderLight};
    transition: background 0.15s ease;
    cursor: pointer;
  }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: #f8f9fb; }
  .notif-item.unread { background: #f8faff; }
  .notif-item.unread:hover { background: #f0f4ff; }
  .notif-icon-dot {
    width: 32px; height: 32px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 14px;
  }
  .notif-icon-dot.warning { background: #fffbeb; }
  .notif-icon-dot.success { background: #ecfdf5; }
  .notif-icon-dot.info { background: #eff6ff; }
  .notif-icon-dot.error { background: #fef2f2; }
  .unread-dot {
    width: 7px; height: 7px;
    background: ${C.brand};
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 6px;
    box-shadow: 0 0 0 3px ${C.brandLight};
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
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="icon-badge" style={{ width: 32, height: 32, background: C.greenBg, border: `1px solid ${C.greenBorder}` }}>
                    <Icons.Radio size={14} color={C.green} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>Live Queue Status</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: "#15803d",
                    background: "#dcfce7", padding: "2px 8px", borderRadius: 6,
                  }}>
                    {activeQueues.length} active
                  </span>
                </div>
                <Link href={`${dashBase}/queues`} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600, color: C.brand,
                  padding: "5px 12px", borderRadius: 8,
                  border: `1px solid ${C.border}`, background: "#fff",
                  textDecoration: "none", transition: "all .15s ease",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.brandBorder; e.currentTarget.style.background = C.brandLight; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#fff"; }}
                >
                  Manage <Icons.ArrowRight size={11} color="currentColor" />
                </Link>
              </div>

              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                {activeQueues.map(q => {
                  const serving = q.current_token_number ? `${q.prefix}${q.current_token_number}` : "—";
                  const next = q.current_token_number ? `${q.prefix}${q.current_token_number + 1}` : "—";
                  return (
                    <div key={q.id} style={{
                      background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
                      overflow: "hidden", transition: "border-color .15s ease",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHov; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
                    >
                      {/* Queue name */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: `1px solid ${C.borderLight}`,
                      }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.name}</span>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 10.5, fontWeight: 600, color: "#15803d",
                          background: "#ecfdf5", padding: "2px 7px", borderRadius: 5,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "block" }} />
                          Active
                        </span>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: "flex" }}>
                        {[
                          { lbl: "Serving", val: serving, col: C.brand },
                          { lbl: "Next", val: next, col: C.text },
                          { lbl: "Prefix", val: q.prefix || "—", col: C.textMuted },
                        ].map((item, i) => (
                          <div key={item.lbl} style={{
                            flex: 1, padding: "14px 12px", textAlign: "center" as const,
                            borderRight: i < 2 ? `1px solid ${C.borderLight}` : "none",
                          }}>
                            <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase" as const, marginBottom: 6 }}>{item.lbl}</span>
                            <span className="mono tnum" style={{ fontSize: 20, fontWeight: 800, color: item.col, letterSpacing: "-.02em" }}>{item.val}</span>
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
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="icon-badge" style={{ width: 32, height: 32, background: C.blueBg, border: `1px solid ${C.blue}18` }}>
                  <Icons.Clock size={14} color={C.blue} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>Timing Analysis</span>
              </div>
            </div>
            <div style={{ display: "flex", padding: "0 20px" }}>
              <div style={{ flex: 1 }}>
                <TimingPanel
                  title="Wait Times" warning={wWarn}
                  avg={wAvg} max={wMax} barPct={wPct}
                  iconBg={C.blueBg} iconColor={C.blue} barColor={wWarn ? C.amber : C.blue}
                  Icon={Icons.Clock}
                />
              </div>
              <div style={{ width: 1, background: C.borderLight, margin: "16px 24px" }} />
              <div style={{ flex: 1 }}>
                <TimingPanel
                  title="Service Times" warning={sWarn}
                  avg={sAvg} max={sMax} barPct={sPct}
                  iconBg={C.greenBg} iconColor={C.green} barColor={sWarn ? C.amber : C.green}
                  Icon={Icons.CheckCircle2}
                />
              </div>
            </div>
          </div>

          {/* ══ INSIGHTS SUMMARY ═════════════════════════════════ */}
          {insights && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="icon-badge" style={{ width: 32, height: 32, background: C.violetBg, border: `1px solid ${C.violet}18` }}>
                    <Icons.Activity size={14} color={C.violet} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>Performance Insights</span>
                </div>
                <Link href={`${dashBase}/insights`} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600, color: C.brand,
                  padding: "5px 12px", borderRadius: 8,
                  border: `1px solid ${C.border}`, background: "#fff",
                  textDecoration: "none", transition: "all .15s ease",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.brandBorder; e.currentTarget.style.background = C.brandLight; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#fff"; }}
                >
                  View Details <Icons.ArrowRight size={11} color="currentColor" />
                </Link>
              </div>
              <div style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {[
                  { label: "Peak Hour", value: insights.busiestHour, sub: `${insights.busiestVisits} visitors`, color: C.amber },
                  { label: "Max Wait", value: formatDuration(timeToSeconds(insights.longestWait)), sub: insights.waitAnalysis, color: C.red },
                  { label: "Avg Service", value: formatDuration(timeToSeconds(insights.avgService)), sub: insights.servAnalysis, color: C.violet },
                  { label: "Waiting Now", value: String(insights.peakWaiting), sub: insights.distAnalysis, color: C.blue },
                ].map(item => (
                  <div key={item.label} style={{ borderLeft: `3px solid ${item.color}`, paddingLeft: 12 }}>
                    <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase" as const, marginBottom: 4 }}>{item.label}</span>
                    <span className="mono tnum" style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "-.02em", lineHeight: 1 }}>{item.value}</span>
                    <span style={{ display: "block", fontSize: 11, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>{item.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ QUEUE BREAKDOWN TABLE ═════════════════════════════ */}
          {queueStats.length > 0 && (() => {
            const totalServed = queueStats.reduce((s, q) => s + q.served, 0);
            const totalWaiting = queueStats.reduce((s, q) => s + q.waiting, 0);
            const grandTotal = queueStats.reduce((s, q) => s + q.total, 0);
            const overallPct = grandTotal > 0 ? Math.round((totalServed / grandTotal) * 100) : 0;
            return (
              <div className="card" style={{ overflow: "hidden" }}>
                <div className="card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="icon-badge" style={{ width: 32, height: 32, background: C.brandLight, border: `1px solid ${C.brandBorder}` }}>
                      <Icons.Table2 size={14} color={C.brand} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>Queue Breakdown</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.brand, background: C.brandLight, padding: "2px 8px", borderRadius: 6 }}>
                      {queueStats.length} queue{queueStats.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: C.textMuted }}>{grandTotal} total tokens</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Queue Name", "Served", "Waiting", "Progress", "Total"].map((h, i) => (
                          <th key={h} style={{
                            padding: "8px 20px",
                            fontSize: 10, fontWeight: 600, color: C.textMuted,
                            letterSpacing: ".06em", textTransform: "uppercase" as const,
                            textAlign: i === 0 ? "left" as const : i === 4 ? "right" as const : "center" as const,
                            borderBottom: `1px solid ${C.borderLight}`,
                            background: "#fafbfc",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queueStats.map(qs => {
                        const pct = qs.total > 0 ? Math.round((qs.served / qs.total) * 100) : 0;
                        return (
                          <tr key={qs.queue} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                            <td style={{ padding: "12px 20px" }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{qs.queue}</span>
                            </td>
                            <td style={{ textAlign: "center", padding: "12px 20px" }}>
                              <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>{qs.served}</span>
                            </td>
                            <td style={{ textAlign: "center", padding: "12px 20px" }}>
                              <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{qs.waiting}</span>
                            </td>
                            <td style={{ padding: "12px 20px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: C.green, transition: "width .4s ease" }} />
                                </div>
                                <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, minWidth: 28, textAlign: "right" }}>{pct}%</span>
                              </div>
                            </td>
                            <td className="tnum" style={{ textAlign: "right", padding: "12px 20px" }}>
                              <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{qs.total}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ padding: "10px 20px", borderTop: `1px solid ${C.border}`, background: "#fafbfc" }}>
                          <span style={{ fontWeight: 700, fontSize: 10, color: C.textMuted, letterSpacing: ".05em", textTransform: "uppercase" as const }}>Total</span>
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 20px", borderTop: `1px solid ${C.border}`, background: "#fafbfc" }}>
                          <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>{totalServed}</span>
                        </td>
                        <td style={{ textAlign: "center", padding: "10px 20px", borderTop: `1px solid ${C.border}`, background: "#fafbfc" }}>
                          <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{totalWaiting}</span>
                        </td>
                        <td style={{ padding: "10px 20px", borderTop: `1px solid ${C.border}`, background: "#fafbfc" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${overallPct}%`, borderRadius: 99, background: C.brand }} />
                            </div>
                            <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, minWidth: 28, textAlign: "right" }}>{overallPct}%</span>
                          </div>
                        </td>
                        <td className="tnum" style={{ textAlign: "right", padding: "10px 20px", borderTop: `1px solid ${C.border}`, background: "#fafbfc" }}>
                          <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: C.brand }}>{grandTotal}</span>
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
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="icon-badge" style={{ width: 32, height: 32, background: C.brandLight, border: `1px solid ${C.brandBorder}` }}>
                  <Icons.Activity size={14} color={C.brand} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>Recent Activity</span>
              </div>
              <Link href={`${dashBase}/history`} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 600, color: C.brand,
                padding: "5px 12px", borderRadius: 8,
                border: `1px solid ${C.border}`, background: "#fff",
                textDecoration: "none", transition: "all .15s ease",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.brandBorder; e.currentTarget.style.background = C.brandLight; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#fff"; }}
              >
                View all <Icons.ArrowRight size={11} color="currentColor" />
              </Link>
            </div>

            {isLoading ? (
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                {[88, 70, 79, 63, 75].map((w, i) => (
                  <div key={i} className="shimmer" style={{ height: 48, width: `${w}%`, borderRadius: 8 }} />
                ))}
              </div>
            ) : overview?.recent_activity?.length ? (
              <>
                {/* Filter tabs */}
                <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[
                      { id: "all", lbl: "All", count: overview.recent_activity.length },
                      { id: "waiting", lbl: "Waiting", count: overview.recent_activity.filter(a => a.status === "waiting").length },
                      { id: "serving", lbl: "Serving", count: overview.recent_activity.filter(a => a.status === "serving").length },
                      { id: "done", lbl: "Done", count: overview.recent_activity.filter(a => a.status === "done").length },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setFeedFilter(t.id as any)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "5px 12px", borderRadius: 6, border: "none",
                          fontSize: 12, fontWeight: 600, cursor: "pointer",
                          background: feedFilter === t.id ? C.brandLight : "transparent",
                          color: feedFilter === t.id ? C.brand : C.textMuted,
                          transition: "all .12s ease",
                        }}
                      >
                        {t.lbl}
                        <span className="mono tnum" style={{
                          fontSize: 10.5, fontWeight: 700,
                          color: feedFilter === t.id ? C.brand : C.textMuted,
                          opacity: feedFilter === t.id ? 1 : 0.6,
                        }}>{t.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column headers */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr auto auto",
                  gap: "0 16px", padding: "8px 20px",
                  borderBottom: `1px solid ${C.borderLight}`,
                }}>
                  {["Details", "Status", "Time"].map((h, i) => (
                    <span key={h} style={{
                      fontSize: 10, fontWeight: 600, color: C.textMuted,
                      letterSpacing: ".06em", textTransform: "uppercase" as const,
                      textAlign: i >= 1 ? "center" as const : "left" as const,
                    }}>{h}</span>
                  ))}
                </div>

                {/* Activity rows */}
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {overview.recent_activity.filter(a => feedFilter === "all" || a.status === feedFilter).map((act, idx) => {
                    const statusColors: Record<string, { bg: string; color: string; dot: string }> = {
                      waiting: { bg: "#fffbeb", color: "#92400e", dot: C.amber },
                      serving: { bg: "#eff6ff", color: "#1e40af", dot: C.blue },
                      done: { bg: "#ecfdf5", color: "#065f46", dot: C.green },
                    };
                    const sc = statusColors[act.status] ?? { bg: "#f8fafc", color: C.textSub, dot: C.textMuted };

                    return (
                      <li
                        key={idx}
                        className="fade-in"
                        onClick={() => setDrawerAct(act)}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr auto auto",
                          gap: "0 16px", alignItems: "center",
                          padding: "12px 20px",
                          borderBottom: `1px solid ${C.borderLight}`,
                          cursor: "pointer",
                          transition: "background .1s ease",
                          animationDelay: `${idx * 15}ms`,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        {/* Details */}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.4 }}>
                            {statusLabel(act)}
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.3 }}>{act.queue}</p>
                        </div>
                        {/* Status */}
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 11, fontWeight: 600, color: sc.color,
                          background: sc.bg, padding: "3px 9px", borderRadius: 5,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot }} />
                          {act.status}
                        </span>
                        {/* Time */}
                        <span className="mono tnum" style={{ fontSize: 11.5, color: C.textMuted, textAlign: "right", minWidth: 44, fontWeight: 500 }}>
                          {new Date(act.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Pagination */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 20px",
                  borderTop: `1px solid ${C.borderLight}`,
                }}>
                  <button onClick={() => setRecentPage(p => Math.max(1, p - 1))} disabled={recentPage === 1 || isLoading} className="pg-btn">
                    <Icons.ArrowLeft size={12} color="currentColor" /> Prev
                  </button>
                  <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>
                    Page {recentPage}
                  </span>
                  <button onClick={() => setRecentPage(p => p + 1)} disabled={(overview?.recent_activity?.length || 0) < LIMIT || isLoading} className="pg-btn">
                    Next <Icons.ArrowRight size={12} color="currentColor" />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 0" }}>
                <Icons.Clipboard size={28} color={C.textMuted} />
                <p style={{ margin: 0, fontSize: 13, color: C.textSub, fontWeight: 600 }}>No recent activity</p>
                <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>Activity will appear once your session begins.</p>
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
  const [notifications, setNotifications] = useState([
    { id: 1, type: "warning", text: "Wait time exceeded 30 min — Doctor Ambedhkar queue", time: "2 minutes ago", isRead: false, icon: "⚠️" },
    { id: 2, type: "success", text: "Session started successfully", time: "1 hour ago", isRead: false, icon: "✅" },
    { id: 3, type: "info", text: "5 customers joined Doctor Imbu queue", time: "2 hours ago", isRead: true, icon: "ℹ️" },
  ]);
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const toggleOpen = () => {
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({
        top: rect.bottom + 10,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(prev => !prev);
  };

  // Click outside to close — check both button and portal dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideBtn = btnRef.current?.contains(target);
      const clickedInsideDrop = dropdownRef.current?.contains(target);
      if (!clickedInsideBtn && !clickedInsideDrop) {
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

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      className="notif-dropdown"
      style={{
        position: "fixed",
        top: dropPos.top,
        right: dropPos.right,
        zIndex: 99999,
      }}
    >
      {/* Header */}
      <div style={{
        padding: "16px 18px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "linear-gradient(180deg, #fafbfd 0%, #ffffff 100%)",
        borderRadius: "16px 16px 0 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: C.text, letterSpacing: "-0.01em" }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{
              background: C.brandLight,
              color: C.brand,
              fontSize: 10.5,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 6,
              letterSpacing: "0.02em",
            }}>
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              background: "none",
              border: "none",
              color: C.brand,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              padding: "4px 10px",
              borderRadius: 8,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.brandLight)}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Items */}
      <div style={{ maxHeight: 340, overflowY: "auto" }}>
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div key={n.id} className={`notif-item ${!n.isRead ? "unread" : ""}`}>
              <div className={`notif-icon-dot ${n.type}`}>{n.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: n.isRead ? 500 : 600,
                  color: C.text,
                  lineHeight: 1.5,
                  letterSpacing: "-0.005em",
                }}>
                  {n.text}
                </p>
                <p style={{
                  margin: "4px 0 0",
                  fontSize: 11,
                  color: C.textMuted,
                  fontWeight: 500,
                }}>
                  {n.time}
                </p>
              </div>
              {!n.isRead && <div className="unread-dot" />}
            </div>
          ))
        ) : (
          <div style={{ padding: "48px 20px", textAlign: "center", color: C.textMuted }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "#f1f5f9",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}>
              <Icons.Bell size={22} color={C.textMuted} />
            </div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: C.textSub }}>All caught up!</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted }}>No new notifications</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "12px 18px",
        borderTop: `1px solid ${C.border}`,
        background: "linear-gradient(180deg, #ffffff 0%, #fafbfd 100%)",
        textAlign: "center",
        borderRadius: "0 0 16px 16px",
      }}>
        <Link
          href={`${dashBase}/notifications`}
          onClick={() => setIsOpen(false)}
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: C.brand,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 8,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.brandLight;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          View All Notifications
          <Icons.ArrowRight size={14} color="currentColor" />
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        className={`notif-btn ${isOpen ? "active" : ""} ${unreadCount > 0 ? "bell-shake" : ""}`}
        onClick={toggleOpen}
        aria-label="Notifications"
      >
        <Icons.Bell size={20} color={isOpen ? "#fff" : C.textSub} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </>
  );
}


function TimingPanel({ title, avg, max, barPct, warning, iconBg, iconColor, barColor, Icon }: {
  title: string; avg: number; max: number; barPct: number; warning: boolean;
  iconBg: string; iconColor: string; barColor: string;
  Icon: (p: IconProps) => React.ReactNode;
}) {
  return (
    <div style={{ padding: "16px 0" }}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={14} color={iconColor} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
        </div>
        {warning && (
          <span style={{ fontSize: 10, fontWeight: 600, color: "#92400e", background: "#fffbeb", padding: "2px 7px", borderRadius: 4 }}>
            High variance
          </span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 24, marginBottom: 14 }}>
        <div>
          <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase" as const, marginBottom: 4 }}>Average</span>
          <span className="mono tnum" style={{ fontSize: 20, fontWeight: 800, color: iconColor, letterSpacing: "-.02em", lineHeight: 1 }}>{formatDuration(avg)}</span>
        </div>
        <div>
          <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase" as const, marginBottom: 4 }}>Maximum</span>
          <span className="mono tnum" style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-.02em", lineHeight: 1 }}>{formatDuration(max)}</span>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase" as const, marginBottom: 4 }}>Ratio</span>
          <span className="mono tnum" style={{ fontSize: 20, fontWeight: 800, color: C.textSub, letterSpacing: "-.02em", lineHeight: 1 }}>{barPct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "#f1f5f9", borderRadius: 99, overflow: "hidden", height: 4 }}>
        <div style={{
          width: `${barPct}%`, height: "100%", borderRadius: 99,
          background: barColor,
          transition: "width 0.6s ease",
        }} />
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
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
      borderLeft: `3px solid ${iconColor}`,
      overflow: "hidden",
    }}>
      <div style={{ padding: "14px 16px 12px" }}>
        {/* Label */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Icon size={13} color={iconColor} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase" as const }}>{title}</span>
        </div>

        {/* Value */}
        <span className="mono tnum" style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-.03em", lineHeight: 1, display: "block" }}>{data}</span>
        <span style={{ fontSize: 10.5, fontWeight: 500, color: C.textMuted, marginTop: 3, display: "block" }}>{dataSub}</span>

        {/* Analysis */}
        <p style={{ margin: "10px 0 0", fontSize: 12, color: C.textSub, fontWeight: 400, lineHeight: 1.55 }}>
          {analysis}
        </p>
      </div>

      {/* Recommendation */}
      <div style={{ padding: "10px 16px", background: "#f9fafb", borderTop: `1px solid ${C.borderLight}` }}>
        <p style={{ margin: 0, fontSize: 11, color: C.textMuted, fontWeight: 450, lineHeight: 1.5 }}>
          💡 {recommendation}
        </p>
      </div>
    </div>
  );
}

// ── Hourly Traffic Chart (Clean Redesign) ─────────────────────────
function HourlyChart({ hourly, maxVisits, peakHour }: {
  hourly: { hour: string; visits: number }[];
  maxVisits: number;
  accentColor: string;
  peakHour: string;
}) {
  const totalV = hourly.reduce((s, h) => s + h.visits, 0);
  const avgV = hourly.length > 0 ? Math.round(totalV / hourly.length) : 0;
  const peakVisits = hourly.find(h => h.hour === peakHour)?.visits ?? 0;
  const peakPct = totalV > 0 ? Math.round((peakVisits / totalV) * 100) : 0;

  return (
    <div style={{ padding: "32px" }}>
      {/* KPI Row - Minimal */}
      <div style={{ display: "flex", gap: 48, marginBottom: 40, paddingBottom: 24, borderBottom: `1px solid ${C.borderLight}` }}>
        {[
          { label: "Total Daily", val: totalV.toLocaleString(), clr: C.brand },
          { label: "Peak Window", val: peakHour, clr: C.violet },
          { label: "Peak Load", val: `${peakPct}%`, clr: C.brand },
          { label: "Hourly Avg", val: avgV, clr: C.green },
        ].map(k => (
          <div key={k.label}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{k.val}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 48 }}>
        {/* Main Chart Area */}
        <div>
          <div style={{ height: 180, display: "flex", alignItems: "flex-end", gap: 8 }}>
            {hourly.map((h, i) => {
              const isPk = h.hour === peakHour;
              const hPct = maxVisits > 0 ? (h.visits / maxVisits) * 100 : 0;
              return (
                <div key={i} className="hbar" style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", position: "relative" }}>
                    <div style={{ 
                      width: "100%", 
                      height: `${Math.max(hPct, 6)}%`, 
                      background: isPk ? `linear-gradient(to top, ${C.violet}, #a855f7)` : `linear-gradient(to top, ${C.brand}, #818cf8)`,
                      opacity: isPk ? 1 : 0.8,
                      borderRadius: "6px 6px 2px 2px",
                      boxShadow: isPk ? "0 4px 12px rgba(139, 92, 246, 0.25)" : "none",
                      transition: "height 1s cubic-bezier(0.16, 1, 0.3, 1)"
                    }} />
                    {/* Value indicator on hover (optional enhancement) */}
                    <div className="ins-spark-val" style={{ position: "absolute", top: -25, left: "50%", transform: "translateX(-50%)", background: C.text, color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, opacity: 0, transition: "opacity 0.2s" }}>{h.visits}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isPk ? C.text : C.textFaint, textAlign: "center", whiteSpace: "nowrap" }}>{h.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Minimal Side Analysis */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: `1px solid ${C.borderLight}`, paddingLeft: 32 }}>
          <div style={{ position: "relative", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="110" height="110" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke={C.borderLight} strokeWidth="6" />
              <circle cx="50" cy="50" r="44" fill="none" stroke={C.violet} strokeWidth="6" strokeDasharray="276" strokeDashoffset={276 - (276 * (peakPct / 100))} strokeLinecap="round" style={{ transformOrigin: "center", transform: "rotate(-90deg)", transition: "stroke-dashoffset 1.2s ease" }} />
            </svg>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-.02em" }}>{peakPct}%</p>
            </div>
          </div>
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.textSub }}>Peak Concentration</p>
            <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Busy window at {peakHour}</p>
          </div>
        </div>
      </div>
    </div>
  );
}