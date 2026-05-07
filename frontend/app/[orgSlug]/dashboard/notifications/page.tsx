"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// ─── Helpers ────────────────────────────────────────────────────────────────

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@500&display=swap');`;

function NotifIcon({ type }: { type: NotifType }) {
  let bg = "#f1f5f9", color = "#64748b", icon = null;

  if (type === "warning") { 
    bg = "#fffbeb"; color = "#d97706"; 
    icon = <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>;
  } else if (type === "success") { 
    bg = "#ecfdf5"; color = "#059669"; 
    icon = <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>;
  } else if (type === "info") { 
    bg = "#eff6ff"; color = "#3b82f6"; 
    icon = <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>;
  } else if (type === "error") { 
    bg = "#fef2f2"; color = "#ef4444"; 
    icon = <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>;
  }

  return (
    <div style={{
      width: 40, height: 40, borderRadius: 12, background: bg, color,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
    }}>
      {icon}
    </div>
  );
}

type NotifType = "warning" | "success" | "info" | "error";
type TabFilter = "all" | "unread" | "warning" | "info" | "success" | "error";

interface Notification {
  id: number;
  type: NotifType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: 1, type: "warning", title: "Long wait time detected", message: "Wait time exceeded 30 minutes in Doctor Ambedhkar queue. Consider calling additional staff.", time: "2 minutes ago", isRead: false },
  { id: 2, type: "success", title: "Session started", message: "A new session has been started successfully. All queues are now active.", time: "1 hour ago", isRead: false },
  { id: 3, type: "info", title: "Queue activity", message: "5 new customers joined the Doctor Imbu queue in the last 30 minutes.", time: "2 hours ago", isRead: true },
  { id: 4, type: "success", title: "Queue completed", message: "All tokens in General queue have been served. Queue is now empty.", time: "3 hours ago", isRead: true },
  { id: 5, type: "warning", title: "High volume alert", message: "General queue has more than 20 waiting customers. Consider adding more service counters.", time: "4 hours ago", isRead: true },
  { id: 6, type: "info", title: "Staff login", message: "Staff member 'nurse_01' logged in and started serving tokens.", time: "5 hours ago", isRead: true },
  { id: 7, type: "error", title: "Connection issue", message: "WebSocket connection was temporarily lost. Reconnected automatically.", time: "6 hours ago", isRead: true },
  { id: 8, type: "success", title: "Password updated", message: "Your admin password was changed successfully via OTP verification.", time: "1 day ago", isRead: true },
  { id: 9, type: "info", title: "Daily summary", message: "Yesterday's summary: 87 tokens served, avg wait 12m 30s, peak hour 10-11 AM.", time: "1 day ago", isRead: true },
  { id: 10, type: "warning", title: "Session reminder", message: "Current session has been running for 8+ hours. Consider ending and starting a new session.", time: "2 days ago", isRead: true },
];

export default function NotificationsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filtered = useMemo(() => {
    if (activeTab === "all") return notifications;
    if (activeTab === "unread") return notifications.filter(n => !n.isRead);
    return notifications.filter(n => n.type === activeTab);
  }, [notifications, activeTab]);

  const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  const markAsRead = (id: number) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  const clearAll = () => setNotifications([]);

  const tabs: { key: TabFilter; label: string; count?: number }[] = [
    { key: "all", label: "All", count: notifications.length },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "warning", label: "Warnings" },
    { key: "info", label: "Info" },
    { key: "success", label: "Success" },
    { key: "error", label: "Errors" },
  ];

  return (
    <>
      <style>{FONT_IMPORT}</style>
      <div style={{ fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", gap: 24, WebkitFontSmoothing: "antialiased", maxWidth: 840, margin: "0 auto" }}>
        
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              <Link href={`/${orgSlug}/dashboard`} style={{ color: "inherit", textDecoration: "none", transition: "color .15s" }} onMouseEnter={e => e.currentTarget.style.color = "#4f46e5"} onMouseLeave={e => e.currentTarget.style.color = "inherit"}>Activity Center</Link>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              <span style={{ color: "#64748b" }}>Notifications</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", letterSpacing: "-.025em", margin: 0 }}>Recent Activity</h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.5 }}>Stay updated with queue events, performance alerts, and system logs.</p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{
                height: 38, padding: "0 14px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 9,
                fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .15s",
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
                Mark all as read
              </button>
            )}
            {notifications.length > 0 && (
              <button onClick={clearAll} style={{
                height: 38, padding: "0 14px", background: "#fff", color: "#64748b", border: "0.5px solid #e2e8f0", borderRadius: 9,
                fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .15s",
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                height: 34, padding: "0 14px", borderRadius: 99, border: active ? "0.5px solid #c7d2fe" : "0.5px solid #e2e8f0",
                background: active ? "#eef2ff" : "#fff", color: active ? "#4f46e5" : "#64748b",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all .15s",
                display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{ fontSize: 10, background: active ? "#4f46e5" : "#e2e8f0", color: active ? "#fff" : "#64748b", padding: "1px 6px", borderRadius: 6 }}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content Card ── */}
        <div style={{ background: "#ffffff", borderRadius: 16, border: "0.5px solid #e8edf2", boxShadow: "0 1px 4px rgba(0,0,0,.04)", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "80px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>All caught up!</p>
                <p style={{ margin: 4, fontSize: 14, color: "#94a3b8" }}>You have no notifications in this category.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filtered.map((n, i) => (
                <div 
                  key={n.id} 
                  onClick={() => markAsRead(n.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fafbfe")} 
                  onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? "transparent" : "#f8faff")}
                  style={{
                    padding: "20px 24px", borderBottom: i === filtered.length - 1 ? "none" : "0.5px solid #f1f5f9",
                    background: n.isRead ? "transparent" : "#f8faff", transition: "all .15s", cursor: "pointer",
                    display: "flex", alignItems: "flex-start", gap: 16, position: "relative"
                  }}
                >
                  {!n.isRead && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "#4f46e5" }} />}
                  <NotifIcon type={n.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: n.isRead ? 600 : 700, color: "#0f172a", letterSpacing: "-.01em" }}>{n.title}</h3>
                      {!n.isRead && <span style={{ fontSize: 10, fontWeight: 700, color: "#4f46e5", background: "#eef2ff", padding: "1px 6px", borderRadius: 6, textTransform: "uppercase", letterSpacing: ".02em" }}>New</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 13.5, color: "#64748b", lineHeight: 1.5, maxWidth: "90%" }}>{n.message}</p>
                    <p style={{ margin: "8px 0 0 0", fontSize: 11.5, fontWeight: 500, color: "#94a3b8" }}>{n.time}</p>
                  </div>
                  {n.isRead && (
                    <div style={{ color: "#e2e8f0" }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div style={{ textAlign: "center", padding: "16px 0 40px", fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>
            Showing {filtered.length} of {notifications.length} notifications
          </div>
        )}
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
