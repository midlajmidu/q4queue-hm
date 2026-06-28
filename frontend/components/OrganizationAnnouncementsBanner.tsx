"use client";

import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

type AlertType = "error" | "warning" | "info" | "success";

const typeConfig: Record<AlertType, {
  bg: string;
  border: string;
  accent: string;
  icon: string;
  iconBg: string;
  text: string;
  sub: string;
  shadow: string;
  shadowHover: string;
}> = {
  error: {
    bg: "#ffffff",
    border: "#fecaca",
    accent: "#ef4444",
    icon: "#ffffff",
    iconBg: "#ef4444",
    text: "#1e293b",
    sub: "#ef4444",
    shadow: "0 4px 24px -4px rgba(239,68,68,.12), 0 2px 8px -2px rgba(0,0,0,.06)",
    shadowHover: "0 12px 40px -8px rgba(239,68,68,.18), 0 4px 12px -2px rgba(0,0,0,.08)",
  },
  warning: {
    bg: "#ffffff",
    border: "#fde68a",
    accent: "#f59e0b",
    icon: "#ffffff",
    iconBg: "#f59e0b",
    text: "#1e293b",
    sub: "#d97706",
    shadow: "0 4px 24px -4px rgba(245,158,11,.12), 0 2px 8px -2px rgba(0,0,0,.06)",
    shadowHover: "0 12px 40px -8px rgba(245,158,11,.18), 0 4px 12px -2px rgba(0,0,0,.08)",
  },
  info: {
    bg: "#ffffff",
    border: "#bfdbfe",
    accent: "#3b82f6",
    icon: "#ffffff",
    iconBg: "#3b82f6",
    text: "#1e293b",
    sub: "#2563eb",
    shadow: "0 4px 24px -4px rgba(59,130,246,.12), 0 2px 8px -2px rgba(0,0,0,.06)",
    shadowHover: "0 12px 40px -8px rgba(59,130,246,.18), 0 4px 12px -2px rgba(0,0,0,.08)",
  },
  success: {
    bg: "#ffffff",
    border: "#a7f3d0",
    accent: "#10b981",
    icon: "#ffffff",
    iconBg: "#10b981",
    text: "#1e293b",
    sub: "#059669",
    shadow: "0 4px 24px -4px rgba(16,185,129,.12), 0 2px 8px -2px rgba(0,0,0,.06)",
    shadowHover: "0 12px 40px -8px rgba(16,185,129,.18), 0 4px 12px -2px rgba(0,0,0,.08)",
  },
};

const AlertIcons: Record<AlertType, React.ReactNode> = {
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
};

const typeLabels: Record<AlertType, string> = {
  error: "Critical Update",
  warning: "Warning",
  info: "Organization Info",
  success: "Success",
};

const AnnouncementBanner: React.FC<{ announcement: any; onDismiss: (id: string) => void }> = ({ announcement, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Map backend types to AlertBanner types safely
  const mapType = (type: string): AlertType => {
      if (type === "critical") return "error";
      if (type === "warning") return "warning";
      if (type === "success") return "success";
      return "info";
  };
  const type = mapType(announcement.type);
  const config = typeConfig[type];

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsDismissing(true);
    setTimeout(() => onDismiss(announcement.id), 300);
  }, [announcement.id, onDismiss]);

  const elapsed = Math.round((Date.now() - new Date(announcement.created_at).getTime()) / 1000);
  const timeAgo = elapsed < 5 ? "just now" : elapsed < 60 ? `${elapsed}s ago` : elapsed < 3600 ? `${Math.floor(elapsed / 60)}m ago` : `${Math.floor(elapsed / 3600)}h ago`;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 420,
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 14,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        boxShadow: isHovered ? config.shadowHover : config.shadow,
        transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: isVisible && !isDismissing
          ? "translateX(0) scale(1)"
          : isDismissing
            ? "translateX(80px) scale(0.95)"
            : "translateX(40px) scale(0.96)",
        opacity: isVisible && !isDismissing ? 1 : 0,
        overflow: "hidden",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        pointerEvents: "auto",
      }}
    >
      {/* Top accent stripe */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${config.accent}, ${config.accent}cc, ${config.accent}66)`,
        borderRadius: "14px 14px 0 0",
      }} />

      {/* Main content row */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "16px 16px 14px 16px",
      }}>
        {/* Icon pill */}
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: config.iconBg,
          color: config.icon,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}>
          {AlertIcons[type]}
        </div>

        {/* Text block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: config.sub,
            }}>
              {typeLabels[type]}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#94a3b8",
            }}>
              {timeAgo}
            </span>
          </div>
          <p style={{
            margin: 0,
            fontSize: 13.5,
            fontWeight: 600,
            color: config.text,
            lineHeight: 1.4,
            letterSpacing: "-0.005em",
            wordBreak: "break-word",
            marginBottom: 2
          }}>
            {announcement.title}
          </p>
          <p style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 400,
            color: "#64748b",
            lineHeight: 1.5,
            letterSpacing: "-0.005em",
            wordBreak: "break-word",
          }}>
            {announcement.message}
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "none",
            padding: 4,
            margin: "-4px -4px 0 0",
            cursor: "pointer",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#475569";
            e.currentTarget.style.background = "#f1f5f9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.background = "transparent";
          }}
          aria-label="Dismiss alert"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};


export function OrganizationAnnouncementsBanner() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        // We load saved dismissed state from localStorage just to be robust
        const stored = localStorage.getItem("qrq_dismissed_org_announcements");
        if (stored) {
            try { setDismissed(new Set(JSON.parse(stored))); } catch (e) {}
        }
        
        api.getActiveOrgAnnouncements?.()
            .then(data => setAnnouncements(data || []))
            .catch(console.error);
            
        const intervalId = setInterval(() => {
            api.getActiveOrgAnnouncements?.()
                .then(data => setAnnouncements(data || []))
                .catch(console.error);
        }, 1000 * 60 * 5);
        
        return () => clearInterval(intervalId);
    }, []);

    const handleDismiss = (id: string) => {
        setDismissed(prev => {
            const next = new Set(prev).add(id);
            localStorage.setItem("qrq_dismissed_org_announcements", JSON.stringify(Array.from(next)));
            return next;
        });
    };

    const activeAnnouncements = announcements.filter(a => !dismissed.has(a.id));

    if (activeAnnouncements.length === 0) return null;

    return (
        <div style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxHeight: "calc(100vh - 40px)",
            pointerEvents: "none",
        }}>
            {activeAnnouncements.map((announcement) => (
                <AnnouncementBanner 
                    key={announcement.id} 
                    announcement={announcement} 
                    onDismiss={handleDismiss} 
                />
            ))}
        </div>
    );
}
