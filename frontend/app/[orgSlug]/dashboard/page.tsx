
"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AnalyticsOverview, QueueResponse } from "@/types/api";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtTime } from "@/lib/tzformat";

import { formatDuration } from "./utils/formatters";
import { Icons, type IconProps } from "./components/DashboardIcons";
import { MetricCard } from "./components/MetricCard";
import { SmartInsightCard } from "./components/SmartInsightCard";
import { HourlyChart } from "./components/HourlyChart";
import { QueueBreakdown } from "./components/QueueBreakdown";
import { LiveActivityFeed } from "./components/LiveActivityFeed";
import { ActivityDetailDrawer } from "./components/ActivityDetailDrawer";

// ─── Design Tokens ────────────────────────────────────────────────
const C = {
  // bg
  pageBg: "var(--q-page-bg)",
  cardBg: "var(--q-card-bg)",
  cardBgAlt: "var(--q-card-bg-alt)",
  // borders
  border: "var(--q-border)",
  borderHov: "var(--q-border-hov)",
  borderLight: "var(--q-border-light)",
  // text
  text: "var(--q-text)",
  textSub: "var(--q-text-sub)",
  textMuted: "var(--q-text-muted)",
  // brand
  brand: "var(--q-brand)",
  brandDark: "var(--q-brand-dark)",
  brandLight: "var(--q-brand-light)",
  brandBorder: "var(--q-brand-border)",
  brandGlow: "var(--q-brand-glow)",
  // semantic
  blue: "var(--q-blue)", blueBg: "var(--q-blue-bg)", blueBorder: "var(--q-blue-border)",
  green: "var(--q-green)", greenBg: "var(--q-green-bg)", greenBorder: "var(--q-green-border)",
  amber: "var(--q-amber)", amberBg: "var(--q-amber-bg)", amberBorder: "var(--q-amber-border)",
  red: "var(--q-red)", redBg: "var(--q-red-bg)", redBorder: "var(--q-red-border)",
  violet: "#7c3aed", violetBg: "#f5f3ff",
  slate: "var(--q-slate)", slateBg: "var(--q-slate-bg)",
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
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid ${C.border};
    border-radius: 8px;
    box-shadow: none;
    transition: box-shadow .25s cubic-bezier(.4,0,.2,1), border-color .25s ease;
  }
  .card:hover {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    border-color: ${C.borderHov};
  }

  /* ── Metric card lift ── */
  .metric-card { position: relative; }
  .metric-card::before {
    content: '';
    position: absolute; inset: 0;
    border-radius: 8px;
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
    border-radius: 8px; cursor: pointer; text-decoration: none;
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
    border-radius: 8px; flex-shrink: 0;
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
    border-radius: 8px; cursor: pointer;
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
    border-radius: 8px;
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
    border-radius: 8px; font-size: 12px; color: ${C.textMuted};
    box-shadow: 0 1px 2px rgba(0,0,0,.03);
  }

  /* ── Scrollbar Hide ── */
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
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
    border: 1px solid ${C.border}; border-radius: 8px; width: fit-content;
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
      border-radius: 8px;
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
    border: none; background: transparent; border-radius: 8px; cursor: pointer;
    transition: all .25s cubic-bezier(.4,0,.2,1);
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
    padding: 24px 28px; border-bottom: 1px solid var(--q-border-light);
    background: var(--q-slate-bg);
  }
  .drawer-body { flex: 1; overflow-y: auto; padding: 28px; }

  /* ── Per-Queue Table ── */
  .qtable { width: 100%; border-collapse: collapse; text-align: left; }
  .qtable th {
    padding: 12px 16px; font-size: 11px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    color: var(--q-text-muted); border-bottom: 1px solid var(--q-border-light);
    background: var(--q-slate-bg);
  }
  .qtable td { padding: 14px 16px; font-size: 13px; font-weight: 500; color: ${C.text}; border-bottom: 1px solid var(--q-border-light); }
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
    padding: 16px 24px; border-bottom: 1px solid var(--q-border-light);
    background: var(--q-slate-bg);
    border-radius: 14px 14px 0 0;
  }

  /* ── Notification System ── */
  .notif-btn {
    position: relative;
    border: 1px solid ${C.border};
    background: #fff;
    width: 40px; height: 40px;
    border-radius: 8px;
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
    border-radius: 8px;
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
    border-radius: 8px;
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
    width: 32px; height: 32px; border-radius: 8px;
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
  const tz = useBranchTimezone();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
  const isStaff = user?.role === "staff";
  const canViewStaffPresence = Boolean(user && user.role !== "staff");


  const [queues, setQueues] = useState<QueueResponse[]>([]);

  // ── Demo Alerts ──────────────────────────────────────
  // useEffect(() => {
  //   // Show maintenance info on load
  //   addAlert({
  //     type: "info",
  //     message: "Scheduled maintenance tonight at 10 PM. System updates will be performed.",
  //   });
  // }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── New State ─────────────────────────────────────────────────
  const [selectedQueue, setSelectedQueue] = useState("");
  const [recentPage, setRecentPage] = useState(1);
  const LIMIT = 10;
  const [feedFilter, setFeedFilter] = useState<"all" | "waiting" | "serving" | "done" | "skipped">("all");
  const [drawerAct, setDrawerAct] = useState<AnalyticsOverview["recent_activity"][number] | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const prevPageRef = useRef(recentPage);

  const totalRecentActivities = Math.max(overview?.total_recent_activity || 0, overview?.status_counts?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalRecentActivities / LIMIT));

  useEffect(() => {
    if (totalPages > 0 && recentPage > totalPages) {
      setRecentPage(totalPages);
    }
  }, [recentPage, totalPages]);



  const handleDownloadReport = async () => {
    try {
      setIsDownloading(true);
      const blob = await api.exportAnalyticsCSV({ queueId: selectedQueue || undefined });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `queue_report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Report downloaded successfully.");
    } catch {
      toast.error("Failed to download report.");
    } finally {
      setIsDownloading(false);
    }
  };
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

    const isPageChange = prevPageRef.current !== recentPage;
    prevPageRef.current = recentPage;

    if (!silent) {
      if (isPageChange) {
        setIsFeedLoading(true);
      } else {
        setIsLoading(true);
      }
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const data = await api.getOverview({
        queueId: selectedQueue || undefined,
        recentLimit: LIMIT, recentOffset: (recentPage - 1) * LIMIT
      }, { signal: controller.signal });
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
        setIsFeedLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [selectedQueue, recentPage]);

  useEffect(() => {
    api.listQueues().then(r => {
      setQueues(r || []);
    }).catch(console.error);
  }, []);



  useEffect(() => { loadData(); }, [loadData]);

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

  const [staff, setStaff] = useState<import("@/types/api").StaffMember[]>([]);

  useEffect(() => {
    if (!user || user.role === "staff") return;
    api.listStaff({ limit: 100, offset: 0 }).then(res => setStaff(res.items)).catch(() => setStaff([]));
  }, [user]);
  const updatedLabel = lastUpdated
    ? secondsAgo < 10 ? "Just now"
      : secondsAgo < 60 ? "moments ago"
        : `${Math.floor(secondsAgo / 60)}m ago`
    : null;

  const queueStats = useMemo(() => {
    return overview?.queue_summary ?? [];
  }, [overview]);

  const servedV = overview?.status_counts?.served ?? 0;
  const completedOutcomes = servedV + (overview?.status_counts?.cancelled ?? 0);
  const completionRate = completedOutcomes > 0 ? Math.round((servedV / completedOutcomes) * 100) : 0;

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
        <div className="flex flex-col gap-4 md:gap-7">

          {/* ══ HEADER CARD ═════════════════════════════════════════════════ */}
          <div className="fade-in card p-4 md:py-8 md:px-9 mb-4 md:mb-6" style={{
            position: "relative", zIndex: 1,
            borderRadius: 24,
            background: C.cardBg,
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${C.border}`,
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
          }}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-8">
              {/* Left: title */}
              <div style={{ maxWidth: 480 }}>
                <div className="flex items-center gap-3.5 mb-2.5 md:mb-4">
                  {/* brand icon */}
                  <div className="icon-badge" style={{
                    width: 42, height: 42,
                    background: C.cardBg,
                    border: `1px solid ${C.border}`,
                    boxShadow: `0 2px 8px rgba(0,0,0,.03), inset 0 2px 0 ${C.borderLight}`,
                    borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <Icons.BarChart3 size={20} color="#6366f1" strokeWidth={2.5} />
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    letterSpacing: '.06em', textTransform: 'uppercase',
                    color: C.textSub,
                  }}>Analytics Dashboard</span>
                </div>
                <h1 className="text-2xl md:text-[clamp(26px,2.8vw,32px)]" style={{
                  fontWeight: 800,
                  color: C.text, letterSpacing: "-.02em",
                  lineHeight: 1.1, margin: 0,
                }}>
                  Organization Overview
                </h1>
                <p className="text-xs md:text-[14.5px] mt-1.5 md:mt-2.5" style={{
                  color: C.textSub,
                  lineHeight: 1.6, marginBottom: 0, fontWeight: 400,
                }}>
                  Live operational state and all-time outcomes for the selected queue scope.
                </p>
              </div>

              {/* Right: Global Controls */}
              <div className="refresh-bar flex items-center justify-between w-full md:w-auto p-2 md:py-[7px] md:px-[14px]" style={{ flexShrink: 0 }}>
                {/* live indicator */}
                <div className="flex items-center gap-2">
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
                    <span style={{ color: C.textMuted, fontSize: 11 }}>
                      Updated <strong style={{ color: C.textSub, fontWeight: 600 }}>{updatedLabel}</strong>
                    </span>
                  )}
                </div>
                {/* divider */}
                <span className="hidden md:block" style={{ width: 1, height: 12, background: C.border, flexShrink: 0 }} />
                
                {/* Action Controls */}
                <div className="flex items-center gap-3">
                  {/* manual refresh */}
                  <button
                    onClick={() => loadData(false)}
                    disabled={isLoading}
                    title="Refresh now"
                    className="inline-flex items-center justify-center gap-1.5 p-1.5 md:p-0 rounded-md md:rounded-none bg-slate-50 md:bg-transparent border border-gray-200 md:border-none hover:bg-slate-100 md:hover:bg-transparent transition-colors"
                    style={{ fontSize: 11, fontWeight: 600, color: C.textSub, cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? .4 : 1, transition: "color .15s" }}
                    onMouseEnter={e => { if (window.innerWidth >= 768) e.currentTarget.style.color = C.brand; }}
                    onMouseLeave={e => { if (window.innerWidth >= 768) e.currentTarget.style.color = C.textSub; }}
                  >
                    <span className={isLoading ? "spin" : ""} style={{ display: "inline-flex" }}>
                      <Icons.RefreshCw size={11} color="currentColor" />
                    </span>
                    <span className="hidden md:inline">Refresh</span>
                  </button>
                  {/* divider */}
                  <span className="hidden md:block" style={{ width: 1, height: 12, background: C.border, flexShrink: 0 }} />
                  {/* auto-refresh toggle */}
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
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
                    <span className="hidden md:inline" style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>
                      Auto ({REFRESH_SECS}s)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-center mt-6 pt-6 border-t border-black/5">
              {[
                {
                  id: "filter-queue", lbl: "QUEUE", val: selectedQueue, set: (val: string) => {
                    setSelectedQueue(val);
                    setRecentPage(1);
                  }, dis: false,
                  opts: <>
                    <option value="">All Queues</option>
                    {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                  </>,
                },
              ].map(f => (
                <div key={f.lbl} className="flex flex-col gap-1 w-full md:w-auto">
                  <label htmlFor={f.id} className="lbl" style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{f.lbl}:</label>
                  <div className="w-full md:w-auto" style={{ position: "relative", transition: "transform .2s ease", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                    <select id={f.id} name={f.id} value={f.val} onChange={e => f.set(e.target.value)} disabled={f.dis} className="ov-sel w-full md:w-[220px]" style={{ padding: "8px 32px 8px 12px", background: C.cardBgAlt, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontWeight: 500, color: C.text, outline: "none", appearance: "none" }} autoComplete="off" data-lpignore="true" data-1p-ignore="true" data-nordpass-ignore="true">
                      {f.opts}
                    </select>
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.6 }}>
                      <Icons.ChevronDown size={14} color={C.text} strokeWidth={2.5} />
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto md:ml-auto">
                <button onClick={handleDownloadReport} disabled={isDownloading} className="qa-btn w-full md:w-auto justify-center" style={{ background: C.cardBgAlt, color: C.textSub, borderColor: C.border, cursor: isDownloading ? "not-allowed" : "pointer" }}>
                  {isDownloading ? (
                    <span className="spin" style={{ display: "inline-flex" }}>
                      <Icons.RefreshCw size={13} color="currentColor" />
                    </span>
                  ) : (
                    <Icons.Download size={13} color="currentColor" />
                  )}
                  Download Report
                </button>

                <Link href={`${dashBase}/queues?action=create`} className="qa-btn w-full md:w-auto justify-center" style={{ background: C.brand, color: "#fff", borderColor: C.brandDark, boxShadow: "0 1px 2px rgba(79,70,229,.2)" }}>
                  <Icons.Play size={13} color="currentColor" />
                  Start Session
                </Link>
                <Link href={`${dashBase}/queues?action=create`} className="qa-btn w-full md:w-auto justify-center" style={{ background: C.brandLight, color: C.brand, borderColor: C.brandBorder }}>
                  <Icons.PlusCircle size={13} color="currentColor" />
                  Create Queue
                </Link>
              </div>
            </div>
          </div>


          {/* ══ ERROR ════════════════════════════════════════════ */}
          {error && (
            <div role="alert" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, padding: "12px 18px", borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: 500 }}>
                <Icons.AlertCircle size={16} color={C.red} /> {error}
              </div>
              <button onClick={() => loadData(false)} className="hover:opacity-80 transition-opacity" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "6px 12px", background: C.cardBg, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 7, cursor: "pointer" }}>
                <Icons.RefreshCw size={12} color="currentColor" /> Retry
              </button>
            </div>
          )}

          {/* ══ METRIC CARDS ═════════════════════════════════════ */}
          <div>
            <div className="section-label" style={{ marginBottom: 14 }}>Key Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
              <MetricCard
                label="Total Visitors" value={overview?.status_counts?.total ?? 0}
                Icon={Icons.Users} trend={null}
                color="#4f46e5" bg="#eef2ff" border="#e0e7ff"
                valueColor="#4f46e5" isLoading={isLoading}
              />
              {(() => {
                const waitingCount = overview?.status_counts?.waiting ?? 0;
                const isWarning = waitingCount >= 10;
                return (
                  <MetricCard
                    label="Waiting Now" value={waitingCount}
                    Icon={Icons.Clock} trend={null}
                    color={isWarning ? "#dc2626" : "#2563eb"} bg={isWarning ? "#fef2f2" : "#eff6ff"} border={isWarning ? "#fecaca" : "#bfdbfe"}
                    valueColor={isWarning ? "#dc2626" : "#2563eb"} pulse isLoading={isLoading}
                    subtext={selectedQueue ? "in selected queue" : "in all queues"}
                  />
                );
              })()}
              <MetricCard
                label="Total Served" value={overview?.status_counts?.served ?? 0}
                Icon={Icons.CheckCircle2} trend={null}
                color="#059669" bg="#ecfdf5" border="#a7f3d0"
                valueColor="#059669" isLoading={isLoading}
              />
              <MetricCard
                label="Non-completed" value={overview?.status_counts?.cancelled ?? 0}
                Icon={Icons.XCircle} trend={null}
                color={"#475569"} bg="#f8fafc" border="#e2e8f0"
                valueColor={"#475569"} muted isLoading={isLoading}
                subtext={overview?.status_counts?.total ? `(${Math.round((overview.status_counts.cancelled / overview.status_counts.total) * 100)}% of visitors)` : undefined}
              />
              {(() => {
                const hasOutcomes = completedOutcomes > 0;
                const crWarning = hasOutcomes && completionRate < 75;
                const crCritical = hasOutcomes && completionRate < 50;

                const color = !hasOutcomes
                  ? "#64748b"
                  : crCritical
                  ? "#dc2626"
                  : crWarning
                  ? "#d97706"
                  : "#059669";

                const bg = !hasOutcomes
                  ? "#f8fafc"
                  : crCritical
                  ? "#fef2f2"
                  : crWarning
                  ? "#fffbeb"
                  : "#ecfdf5";

                const border = !hasOutcomes
                  ? "#e2e8f0"
                  : crCritical
                  ? "#fecaca"
                  : crWarning
                  ? "#fde68a"
                  : "#a7f3d0";

                return (
                  <MetricCard
                    label="Completion Rate"
                    value={hasOutcomes ? completionRate : "—"}
                    suffix={hasOutcomes ? "%" : ""}
                    Icon={Icons.CheckSquare}
                    trend={null}
                    color={color}
                    bg={bg}
                    border={border}
                    valueColor={color}
                    muted={!hasOutcomes}
                    isLoading={isLoading}
                    title="Percentage of finished visits successfully served rather than cancelled or marked as no-show."
                  />
                );
              })()}

            </div>
          </div>


          {/* ══ STAFF PRESENCE ════════════════════════════════════ */}
          {canViewStaffPresence && (
            <div>
              <div className="section-label" style={{ marginBottom: 14 }}>Staff Presence</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {staff.length === 0 ? (
                  <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex justify-between items-center w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Icons.Users size={16} color="currentColor" />
                      </div>
                      <span className="text-[14px] font-semibold text-blue-900 dark:text-blue-200">Track your team&apos;s live performance.</span>
                    </div>
                    <Link href={`${dashBase}/staff`} className="qa-btn text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 shadow-sm">
                      <Icons.UserPlus size={13} color="currentColor" /> Add Staff Member
                    </Link>
                  </div>
                ) : staff.map(s => {
                  const name = s.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : s.email.split('@')[0];
                  const isOnline = Boolean(s.last_active_at && Date.now() - new Date(s.last_active_at).getTime() < 120000);
                  return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 99, padding: "6px 16px 6px 6px", boxShadow: "0 1px 2px rgba(0,0,0,.02)" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.brandLight, color: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="capitalize" style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{name}</span>
                      <span style={{
                        marginLeft: 4,
                        display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px",
                        borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: ".02em",
                        background: isOnline ? "var(--q-green-bg)" : "var(--q-slate-bg)",
                        color: isOnline ? "var(--q-green)" : "var(--q-text-muted)",
                        border: `1px solid ${isOnline ? "var(--q-green-border)" : "var(--q-border-light)"}`
                      }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "var(--q-green)" : "var(--q-text-muted)", flexShrink: 0 }} />
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ QUEUE BREAKDOWN TABLE ═════════════════════════════ */}
          <QueueBreakdown queueStats={queueStats} canViewStaffPresence={canViewStaffPresence} />

          {/* ══ ACTIVITY FEED ════════════════════════════════════ */}
          <LiveActivityFeed
            dashBase={dashBase}
            isLoading={isLoading}
            isFeedLoading={isFeedLoading}
            overview={overview}
            recentPage={recentPage}
            setRecentPage={setRecentPage}
            totalRecentActivities={totalRecentActivities}
            totalPages={totalPages}
            LIMIT={LIMIT}
            feedFilter={feedFilter}
            setFeedFilter={setFeedFilter}
            setDrawerAct={setDrawerAct}
            tz={tz}
          />
        </div>
      </div>

      {/* ══ ACTIVITY DRAWER ════════════════════════════════════════ */}
      <ActivityDetailDrawer
        activity={drawerAct}
        onClose={() => setDrawerAct(null)}
        tz={tz}
      />
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

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


function TimingPanel({ title, avg, max, barPct, warning, iconColor, barColor, Icon }: {
  title: string; avg: number; max: number; barPct: number; warning: boolean;
  iconColor: string; barColor: string;
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
      <div className="bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden h-1">
        <div style={{
          width: `${barPct}%`, height: "100%", borderRadius: 99,
          background: barColor,
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}


// Retain these presentation primitives for the next dashboard composition pass.
// Referencing them keeps the module lint-clean without exporting page-only internals.
void ActivityLegend;
void TimingPanel;
void SmartInsightCard;
void HourlyChart;
