"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useNotifications, DashboardNotification } from "@/context/NotificationContext";
import { PageWrapper } from "@/components/PageWrapper";
import { api } from "@/lib/api";

// ─── Constants ───────────────────────────────────────────────────────────────

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@500&display=swap');`;

// ─── Types ───────────────────────────────────────────────────────────────────

type NotifType = "warning" | "success" | "info" | "error";
type TabFilter = "all" | "unread" | "warning" | "info" | "success" | "error";

// ─── Icon component ───────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: NotifType }) {
  const map: Record<NotifType, { className: string; path: React.ReactElement }> = {
    warning: {
      className: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
    },
    success: {
      className: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>,
    },
    info: {
      className: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>,
    },
    error: {
      className: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>,
    },
  };
  const { className, path } = map[type];
  return (
    <div className={"flex items-center justify-center shrink-0 w-10 h-10 rounded-xl " + className}>
      {path}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const dashBase = `/${orgSlug}/dashboard`;

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  // Track IDs of rows currently animating out their "New" badge
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabFilter | "announcements">("all");
  
  const [apiAnnouncements, setApiAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const sysData = await api.getActiveSystemAnnouncements();
        let orgData: any[] = [];
        try {
            orgData = await api.getActiveOrgAnnouncements();
        } catch (orgErr) {
            console.error("Failed to load org announcements", orgErr);
        }
        
        const sysMapped = sysData.map(a => ({ ...a, source: 'Global System' }));
        const orgMapped = orgData.map(a => ({ ...a, source: 'Organization' }));
        
        const combined = [...orgMapped, ...sysMapped].sort((a, b) => {
            if (a.source === 'Organization' && b.source !== 'Organization') return -1;
            if (b.source === 'Organization' && a.source !== 'Organization') return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        setApiAnnouncements(combined);
      } catch (error) {
        console.error("Failed to load announcements", error);
      }
    };
    fetchAnnouncements();
  }, []);

  const combinedItems = useMemo(() => {
      const mappedAnnouncements = apiAnnouncements.map(ann => ({
          id: ann.id,
          title: ann.title || ann.message,
          message: ann.title ? ann.message : `${ann.source} Announcement`,
          type: ann.type,
          time: new Date(ann.created_at).toLocaleDateString(),
          isRead: true, // Announcements don't have read state in this context
          isAnnouncement: true,
          source: ann.source,
      }));
      
      // Combine local notifications and API announcements, then sort by date if possible, but local notifications usually have just "HH:MM" for time.
      // We'll put announcements at the top for visibility.
      return [...mappedAnnouncements, ...notifications];
  }, [notifications, apiAnnouncements]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return combinedItems;
    if (activeTab === "unread") return combinedItems.filter((n: any) => !n.isRead && !n.isAnnouncement);
    if (activeTab === "announcements") return combinedItems.filter((n: any) => n.isAnnouncement);
    return combinedItems.filter(n => n.type === activeTab);
  }, [combinedItems, activeTab]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
    setFadingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setFadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  };

  // ── Tab config ────────────────────────────────────────────────────────────

  const tabs: { key: TabFilter | "announcements"; label: string; count?: number }[] = [
    { key: "all", label: "All", count: combinedItems.length },
    { key: "announcements", label: "Announcements", count: apiAnnouncements.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "warning", label: "Warnings" },
    { key: "info", label: "Info" },
    { key: "success", label: "Success" },
    { key: "error", label: "Errors" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{FONT_IMPORT}</style>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes badgeFadeOut {
          from { opacity: 1; transform: scale(1);    }
          to   { opacity: 0; transform: scale(0.75); }
        }
        .notif-row {
          animation: fadeSlideIn .2s ease both;
        }
        .new-badge-fading {
          animation: badgeFadeOut .35s ease forwards;
        }
        .btn-primary:hover  { background: #4338ca !important; }
        .btn-secondary:hover { background: #f8fafc !important; border-color: #cbd5e1 !important; }
        
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        WebkitFontSmoothing: "antialiased",
      }}>

        <PageWrapper
          title="Recent Activity"
          subtitle="Stay updated with queue events, performance alerts, and system logs."
          breadcrumbs={[{ label: "Activity Center", href: dashBase }, { label: "Notifications" }]}
          action={
            <div style={{ display: "flex", gap: 8 }}>
            {unreadCount > 0 && (
              <button className="btn-primary" onClick={markAllAsRead} style={{
                height: 38, padding: "0 14px", background: "#4f46e5", color: "#fff",
                border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, transition: "background .15s",
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                Mark all as read
              </button>
            )}
            {notifications.length > 0 && (
              <button className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-2 h-[38px] px-3.5 bg-transparent border border-slate-200 dark:border-white/10 rounded-lg text-[13px] font-semibold" onClick={clearAll}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                Clear all
              </button>
            )}
          </div>
          }
        >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {/* ── Tab filters ── */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 h-[34px] px-3.5 rounded-full text-xs font-semibold cursor-pointer transition-colors border ${active ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full transition-colors ${active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Notification list ── */}
        <div style={{
          background: "var(--q-card-bg)", borderRadius: 16,
          border: "1px solid var(--q-border-light)",
          boxShadow: "0 1px 4px rgba(0,0,0,.04)", overflow: "hidden",
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "80px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: "var(--q-slate-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--q-text-muted)" }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--q-text)" }}>All caught up!</p>
                <p style={{ margin: 4, fontSize: 14, color: "var(--q-text-muted)" }}>You have no notifications in this category.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filtered.map((n, i) => {
                const isFading = fadingIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={`notif-row flex justify-between items-start p-5 sm:px-6 cursor-pointer transition-colors border-b border-slate-100 dark:border-white/5 last:border-none group ${n.isRead ? "hover:bg-slate-50 dark:hover:bg-slate-800/50" : "bg-indigo-50/30 dark:bg-indigo-500/10 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/20"}`}
                    onClick={() => handleMarkAsRead(n.id)}
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <NotifIcon type={n.type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-[14.5px] tracking-tight truncate ${n.isRead ? "font-semibold text-slate-700 dark:text-slate-300" : "font-bold text-slate-900 dark:text-white"}`}>
                            {n.title?.replace(/^(⚠️|✅|ℹ️|🚨)\s*/, '')}
                          </h3>
                          {!n.isRead && !(n as any).isAnnouncement && (
                            <span
                              className={`${isFading ? "new-badge-fading" : ""} bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full`}
                            >
                              New
                            </span>
                          )}
                          {(n as any).isAnnouncement && (
                            <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${(n as any).source === 'Organization' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}
                            >
                                {(n as any).source}
                            </span>
                          )}
                        </div>
                        <p className="text-[13.5px] text-slate-500 dark:text-slate-400 leading-snug max-w-[90%]">
                          {n.message?.replace(/^(⚠️|✅|ℹ️|🚨)\s*/, '')}
                        </p>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm whitespace-nowrap ml-4 shrink-0 font-medium pt-1">
                      {n.time}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {combinedItems.length > 0 && (
          <div style={{ textAlign: "center", padding: "16px 0 40px", fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>
            Showing {filtered.length} of {combinedItems.length} notifications
          </div>
        )}
      </div>
      </PageWrapper>
      </div>
    </>
  );
}