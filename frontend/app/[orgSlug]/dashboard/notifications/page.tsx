"use client";

import React, { useState, useMemo } from "react";

// ─── Design Tokens ────────────────────────────────────────────────
const C = {
  pageBg: "#f7f8fa",
  cardBg: "#ffffff",
  border: "#e8eaef",
  borderHov: "#c4ccd8",
  borderLight: "#f1f2f5",
  text: "#0f1729",
  textSub: "#475569",
  textMuted: "#8b95a9",
  brand: "#4f46e5",
  brandDark: "#4338ca",
  brandLight: "#eef2ff",
  brandBorder: "#c7d2fe",
  brandGlow: "rgba(79,70,229,.10)",
  blue: "#3b82f6", blueBg: "#eff6ff",
  green: "#10b981", greenBg: "#ecfdf5",
  amber: "#f59e0b", amberBg: "#fffbeb",
  red: "#ef4444", redBg: "#fef2f2",
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  .np {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: ${C.text};
    -webkit-font-smoothing: antialiased;
  }

  .np-card {
    background: ${C.cardBg};
    border: 1px solid ${C.border};
    border-radius: 14px;
    box-shadow:
      0 0 0 1px rgba(0,0,0,.02),
      0 1px 2px rgba(0,0,0,.03),
      0 2px 8px rgba(0,0,0,.025);
    overflow: hidden;
  }

  .np-tab {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    border: none;
    background: transparent;
    color: ${C.textMuted};
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .np-tab:hover:not(.active) {
    color: ${C.textSub};
    background: #f1f5f9;
  }
  .np-tab.active {
    color: ${C.brand};
    background: ${C.brandLight};
  }

  .np-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 18px 24px;
    border-bottom: 1px solid ${C.borderLight};
    transition: background 0.15s ease;
    cursor: pointer;
  }
  .np-item:last-child { border-bottom: none; }
  .np-item:hover { background: #fafbfc; }
  .np-item.unread { background: #f8faff; }
  .np-item.unread:hover { background: #f0f4ff; }

  .np-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 16px;
  }
  .np-icon.warning { background: ${C.amberBg}; }
  .np-icon.success { background: ${C.greenBg}; }
  .np-icon.info { background: ${C.blueBg}; }
  .np-icon.error { background: ${C.redBg}; }

  .np-dot {
    width: 8px;
    height: 8px;
    background: ${C.brand};
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 8px;
    box-shadow: 0 0 0 3px ${C.brandLight};
  }

  .np-empty {
    padding: 80px 20px;
    text-align: center;
  }

  .np-action-btn {
    padding: 7px 14px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid ${C.border};
    background: #ffffff;
    color: ${C.textSub};
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.15s ease;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .np-action-btn:hover {
    border-color: ${C.borderHov};
    background: #f8fafc;
    color: ${C.text};
  }
  .np-action-btn.primary {
    background: ${C.brand};
    color: #ffffff;
    border-color: ${C.brand};
  }
  .np-action-btn.primary:hover {
    background: ${C.brandDark};
    border-color: ${C.brandDark};
  }

  @keyframes npFadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .np-fade-in {
    animation: npFadeIn 0.35s cubic-bezier(.16,1,.3,1) both;
  }
`;

type NotifType = "warning" | "success" | "info" | "error";
type TabFilter = "all" | "unread" | "warning" | "info" | "success" | "error";

interface Notification {
  id: number;
  type: NotifType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  icon: string;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: 1, type: "warning", title: "Long wait time detected", message: "Wait time exceeded 30 minutes in Doctor Ambedhkar queue. Consider calling additional staff.", time: "2 minutes ago", isRead: false, icon: "⚠️" },
  { id: 2, type: "success", title: "Session started", message: "A new session has been started successfully. All queues are now active.", time: "1 hour ago", isRead: false, icon: "✅" },
  { id: 3, type: "info", title: "Queue activity", message: "5 new customers joined the Doctor Imbu queue in the last 30 minutes.", time: "2 hours ago", isRead: true, icon: "ℹ️" },
  { id: 4, type: "success", title: "Queue completed", message: "All tokens in General queue have been served. Queue is now empty.", time: "3 hours ago", isRead: true, icon: "✅" },
  { id: 5, type: "warning", title: "High volume alert", message: "General queue has more than 20 waiting customers. Consider adding more service counters.", time: "4 hours ago", isRead: true, icon: "⚠️" },
  { id: 6, type: "info", title: "Staff login", message: "Staff member 'nurse_01' logged in and started serving tokens.", time: "5 hours ago", isRead: true, icon: "ℹ️" },
  { id: 7, type: "error", title: "Connection issue", message: "WebSocket connection was temporarily lost. Reconnected automatically.", time: "6 hours ago", isRead: true, icon: "❌" },
  { id: 8, type: "success", title: "Password updated", message: "Your admin password was changed successfully via OTP verification.", time: "1 day ago", isRead: true, icon: "✅" },
  { id: 9, type: "info", title: "Daily summary", message: "Yesterday's summary: 87 tokens served, avg wait 12m 30s, peak hour 10-11 AM.", time: "1 day ago", isRead: true, icon: "ℹ️" },
  { id: 10, type: "warning", title: "Session reminder", message: "Current session has been running for 8+ hours. Consider ending and starting a new session.", time: "2 days ago", isRead: true, icon: "⚠️" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filtered = useMemo(() => {
    if (activeTab === "all") return notifications;
    if (activeTab === "unread") return notifications.filter(n => !n.isRead);
    return notifications.filter(n => n.type === activeTab);
  }, [notifications, activeTab]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
  };

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
      <style>{STYLES}</style>
      <div className="np" style={{ maxWidth: 880, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }} className="np-fade-in">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 9,
              background: C.brandLight, color: C.brand,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", color: C.brand, textTransform: "uppercase" }}>
              Activity Center
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", color: C.text, margin: "0 0 6px 0" }}>
                Notifications
              </h1>
              <p style={{ fontSize: 14, color: C.textSub, margin: 0, lineHeight: 1.5 }}>
                Stay updated with queue activity, system alerts, and important events.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {unreadCount > 0 && (
                <button className="np-action-btn primary" onClick={markAllAsRead}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
                  </svg>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button className="np-action-btn" onClick={clearAll}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="np-card np-fade-in" style={{ animationDelay: "0.05s" }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 4,
            overflowX: "auto",
            background: "linear-gradient(180deg, #fafbfd 0%, #ffffff 100%)",
            borderRadius: "14px 14px 0 0",
          }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`np-tab ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{
                    marginLeft: 6,
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 5,
                    background: activeTab === tab.key ? `${C.brand}22` : "#e2e8f0",
                    color: activeTab === tab.key ? C.brand : C.textMuted,
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div>
            {filtered.length > 0 ? (
              filtered.map((n, i) => (
                <div
                  key={n.id}
                  className={`np-item ${!n.isRead ? "unread" : ""} np-fade-in`}
                  style={{ animationDelay: `${0.03 * i}s` }}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className={`np-icon ${n.type}`}>{n.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{
                        fontSize: 13.5,
                        fontWeight: n.isRead ? 500 : 650,
                        color: C.text,
                        letterSpacing: "-0.005em",
                      }}>
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: C.brandLight,
                          color: C.brand,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}>
                          New
                        </span>
                      )}
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 400,
                      color: C.textSub,
                      lineHeight: 1.55,
                    }}>
                      {n.message}
                    </p>
                    <p style={{
                      margin: "6px 0 0",
                      fontSize: 11,
                      color: C.textMuted,
                      fontWeight: 500,
                    }}>
                      {n.time}
                    </p>
                  </div>
                  {!n.isRead && <div className="np-dot" />}
                </div>
              ))
            ) : (
              <div className="np-empty np-fade-in">
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "#f1f5f9",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}>
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.textSub }}>
                  {activeTab === "unread" ? "All caught up!" : "No notifications"}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textMuted, maxWidth: 300, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
                  {activeTab === "unread"
                    ? "You have no unread notifications. Check back later for updates."
                    : `No ${activeTab === "all" ? "" : activeTab + " "}notifications to show right now.`
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        {notifications.length > 0 && (
          <div className="np-fade-in" style={{
            animationDelay: "0.15s",
            textAlign: "center",
            padding: "20px 0 40px",
            fontSize: 12,
            color: C.textMuted,
          }}>
            Showing {filtered.length} of {notifications.length} notifications
          </div>
        )}
      </div>
    </>
  );
}
