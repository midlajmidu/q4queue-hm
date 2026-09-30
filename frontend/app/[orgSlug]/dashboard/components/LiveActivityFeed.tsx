import React from "react";
import Link from "next/link";
import type { AnalyticsOverview } from "@/types/api";
import { Icons } from "./DashboardIcons";
import { toTitleCase, statusLabel } from "../utils/formatters";
import { fmtTime } from "@/lib/tzformat";

const C = {
  brandLight: "var(--q-brand-light)",
  brand: "var(--q-brand)",
  textMuted: "var(--q-text-muted)",
};

export type FeedFilterType = "all" | "waiting" | "serving" | "done" | "skipped";
export type ActivityItem = NonNullable<AnalyticsOverview["recent_activity"]>[number];

export interface LiveActivityFeedProps {
  dashBase: string;
  isLoading: boolean;
  isFeedLoading: boolean;
  overview: AnalyticsOverview | null;
  recentPage: number;
  setRecentPage: React.Dispatch<React.SetStateAction<number>>;
  totalRecentActivities: number;
  totalPages: number;
  LIMIT: number;
  feedFilter: FeedFilterType;
  setFeedFilter: (filter: FeedFilterType) => void;
  setDrawerAct: (act: ActivityItem) => void;
  tz: string;
}

export function LiveActivityFeed({
  dashBase,
  isLoading,
  isFeedLoading,
  overview,
  recentPage,
  setRecentPage,
  totalRecentActivities,
  totalPages,
  LIMIT,
  feedFilter,
  setFeedFilter,
  setDrawerAct,
  tz,
}: LiveActivityFeedProps) {
  return (
    <>
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Recent Activity</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <Icons.Activity size={16} color="currentColor" />
            </div>
            <span className="text-[14px] font-bold text-slate-900 dark:text-white">Activity Feed</span>
          </div>
          <Link href={`${dashBase}/history`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-indigo-600 transition-all shadow-sm">
            View all <Icons.ArrowRight size={12} color="currentColor" />
          </Link>
        </div>

        {isLoading ? (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[88, 70, 79, 63, 75].map((w, i) => (
              <div key={i} className="shimmer" style={{ height: 48, width: `${w}%`, borderRadius: 8 }} />
            ))}
          </div>
        ) : totalRecentActivities === 0 && (!overview?.recent_activity || overview.recent_activity.length === 0) && recentPage === 1 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl m-5">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-4">
              <Icons.Activity size={24} color="currentColor" />
            </div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">No recent activity</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center max-w-sm mb-5">
              Activity will appear once your queue session begins.
            </p>
            <Link href={`${dashBase}/queues?action=create`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent transition-all shadow-sm hover:-translate-y-0.5 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1">
              <Icons.Play size={14} color="currentColor" /> Start Session
            </Link>
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {[
                  { id: "all", lbl: "All", count: totalRecentActivities },
                  { id: "waiting", lbl: "Waiting", count: overview?.status_counts?.waiting ?? 0 },
                  { id: "serving", lbl: "Serving", count: overview?.status_counts?.serving ?? 0 },
                  { id: "done", lbl: "Done", count: overview?.status_counts?.served ?? 0 },
                  { id: "skipped", lbl: "Skipped", count: (overview?.status_counts?.skipped ?? 0) + (overview?.status_counts?.deleted ?? 0) },
                ].map(t => {
                  const isActive = feedFilter === t.id;
                  
                  const baseColors = "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border-transparent";
                  let activeColors = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm";
                  let badgeColors = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700";
                  let badgeActiveColors = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";

                  if (t.id === "waiting") {
                    activeColors = "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 shadow-sm";
                    badgeActiveColors = "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300";
                    badgeColors = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 group-hover:text-amber-700 dark:group-hover:text-amber-300";
                  } else if (t.id === "serving") {
                    activeColors = "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-400 shadow-sm";
                    badgeActiveColors = "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300";
                    badgeColors = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-700 dark:group-hover:text-blue-300";
                  } else if (t.id === "done") {
                    activeColors = "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 shadow-sm";
                    badgeActiveColors = "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300";
                    badgeColors = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 group-hover:text-emerald-700 dark:group-hover:text-emerald-300";
                  } else if (t.id === "skipped") {
                    activeColors = "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 shadow-sm";
                    badgeActiveColors = "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300";
                    badgeColors = "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 group-hover:text-rose-700 dark:group-hover:text-rose-300";
                  } else if (t.id === "all" && isActive) {
                    activeColors = "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 shadow-sm";
                  }

                  return (
                    <button
                      key={t.id}
                      onClick={() => setFeedFilter(t.id as FeedFilterType)}
                      className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold border transition-all cursor-pointer ${isActive ? activeColors : baseColors}`}
                    >
                      {t.lbl}
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums transition-colors ${isActive ? badgeActiveColors : badgeColors}`}>
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/60">
                    <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Token</th>
                    <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                    <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Queue</th>
                    <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {isFeedLoading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading activities...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (() => {
                    const filtered = (overview?.recent_activity || []).filter(a => {
                      if (feedFilter === "all") return true;
                      if (feedFilter === "skipped") return a.status === "skipped" || a.status === "deleted";
                      return a.status === feedFilter;
                    });
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                {feedFilter !== "all"
                                  ? `No ${feedFilter} activities found on page ${recentPage}`
                                  : `No activity records found on page ${recentPage}`}
                              </p>
                              {recentPage > 1 ? (
                                <button
                                  onClick={() => setRecentPage(1)}
                                  className="mt-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Icons.ArrowLeft size={12} /> Go back to Page 1
                                </button>
                              ) : feedFilter !== "all" ? (
                                <button
                                  onClick={() => setFeedFilter("all")}
                                  className="mt-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                >
                                  View all activities
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return filtered.map((act, idx) => {
                      return (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer fade-in"
                          onClick={() => setDrawerAct(act)}
                          style={{ animationDelay: `${idx * 15}ms` }}
                        >
                          <td className="py-4 px-5">
                            <span className="text-[13px] font-bold text-slate-900 dark:text-white tabular-nums">
                              {act.prefix}{act.number}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: C.brandLight, color: C.brand,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 700
                              }}>
                                {statusLabel(act).substring(0, 2).toUpperCase()}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span className="capitalize text-slate-900 dark:text-white" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-.01em" }}>
                                  {statusLabel(act)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>{toTitleCase(act.queue)}</span>
                          </td>
                          <td className="py-4 px-5">
                            <span style={{
                              background: act.status === 'done' ? 'var(--q-green-bg)' : act.status === 'waiting' ? 'var(--q-amber-bg)' : act.status === 'serving' ? 'var(--q-blue-bg)' : act.status === 'skipped' ? 'var(--q-rose-bg, #fef2f2)' : 'var(--q-slate-bg)',
                              color: act.status === 'done' ? 'var(--q-green)' : act.status === 'waiting' ? 'var(--q-amber)' : act.status === 'serving' ? 'var(--q-blue)' : act.status === 'skipped' ? '#dc2626' : 'var(--q-text-muted)'
                            }} className="inline-flex items-center justify-center px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider rounded-full border border-black/5 dark:border-white/5">
                              {act.status}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <span className="mono tnum text-[12px] font-medium text-slate-500">
                              {act.time ? fmtTime(act.time, tz) : "Just now"}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <button 
                onClick={() => setRecentPage(p => Math.max(1, p - 1))} 
                disabled={recentPage <= 1 || isFeedLoading || isLoading} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icons.ArrowLeft size={12} color="currentColor" /> Prev
              </button>
              <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                <span>
                  Page {recentPage} of {totalPages}
                </span>
                {totalRecentActivities > 0 && (
                  <span className="hidden sm:inline text-slate-400 dark:text-slate-500">
                    ({Math.min((recentPage - 1) * LIMIT + 1, totalRecentActivities)}–{Math.min(recentPage * LIMIT, totalRecentActivities)} of {totalRecentActivities})
                  </span>
                )}
              </div>
              <button 
                onClick={() => setRecentPage(p => p + 1)} 
                disabled={recentPage >= totalPages || isFeedLoading || isLoading || (overview?.recent_activity?.length || 0) === 0} 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <Icons.ArrowRight size={12} color="currentColor" />
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
