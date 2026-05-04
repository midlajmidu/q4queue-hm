"use client";

import React, { useState, useEffect, useRef } from "react";
import { Alert, AlertType } from "@/context/AlertContext";

interface AlertBannerProps {
  alert: Alert;
  onDismiss: (id: string) => void;
}

const typeConfig: Record<AlertType, {
  bg: string;
  border: string;
  accent: string;
  icon: string;
  iconBg: string;
  text: string;
  sub: string;
  progress: string;
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
    progress: "#ef4444",
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
    progress: "#f59e0b",
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
    progress: "#3b82f6",
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
    progress: "#10b981",
    shadow: "0 4px 24px -4px rgba(16,185,129,.12), 0 2px 8px -2px rgba(0,0,0,.06)",
    shadowHover: "0 12px 40px -8px rgba(16,185,129,.18), 0 4px 12px -2px rgba(0,0,0,.08)",
  },
};

const typeLabels: Record<AlertType, string> = {
  error: "Error",
  warning: "Warning",
  info: "Info",
  success: "Success",
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

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onDismiss }) => {
  const config = typeConfig[alert.type];
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const progressPaused = useRef(false);

  // Entrance animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-dismiss progress bar
  useEffect(() => {
    if (alert.type === "error" || alert.persist) return;
    const duration = 10000;
    const interval = 40;
    const step = (interval / duration) * 100;
    const timer = setInterval(() => {
      if (!progressPaused.current) {
        setProgress((prev) => {
          const next = Math.max(0, prev - step);
          return next;
        });
      }
    }, interval);
    return () => clearInterval(timer);
  }, [alert.type, alert.persist]);

  // Pause progress on hover
  useEffect(() => {
    progressPaused.current = isHovered;
  }, [isHovered]);

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => onDismiss(alert.id), 300);
  };

  const elapsed = Math.round((Date.now() - alert.timestamp.getTime()) / 1000);
  const timeAgo = elapsed < 5 ? "just now" : elapsed < 60 ? `${elapsed}s ago` : `${Math.floor(elapsed / 60)}m ago`;

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
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
          {AlertIcons[alert.type]}
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
              {typeLabels[alert.type]}
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
            fontWeight: 500,
            color: config.text,
            lineHeight: 1.5,
            letterSpacing: "-0.005em",
            wordBreak: "break-word",
          }}>
            {alert.message}
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            transition: "all 0.2s ease",
            flexShrink: 0,
            marginTop: 1,
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
            <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Action row */}
      {alert.action && (
        <div style={{
          padding: "0 16px 14px 62px",
        }}>
          <button
            onClick={alert.action.onClick}
            style={{
              padding: "7px 16px",
              background: config.accent,
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.transform = "translateY(-0.5px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "none";
            }}
          >
            {alert.action.label}
          </button>
        </div>
      )}

      {/* Progress bar */}
      {alert.type !== "error" && !alert.persist && (
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2.5,
          background: "rgba(0,0,0,0.04)",
        }}>
          <div style={{
            width: `${progress}%`,
            height: "100%",
            background: config.progress,
            opacity: 0.45,
            transition: isHovered ? "none" : "width 40ms linear",
            borderRadius: "0 2px 2px 0",
          }} />
        </div>
      )}
    </div>
  );
};
