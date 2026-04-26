"use client";

import React, { useState, useEffect } from "react";
import { Alert, AlertType } from "@/context/AlertContext";

interface AlertBannerProps {
  alert: Alert;
  onDismiss: (id: string) => void;
}

const typeLabels: Record<AlertType, string> = {
  error: "System Error",
  warning: "Warning",
  info: "Information",
  success: "All Clear",
};

const typeConfig: Record<AlertType, {
  gradient: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  subTextColor: string;
  borderColor: string;
  actionBg: string;
  actionText: string;
  actionHover: string;
  dismissHover: string;
  progressColor: string;
  glowColor: string;
}> = {
  error: {
    gradient: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca40 100%)",
    iconBg: "linear-gradient(135deg, #ef4444, #dc2626)",
    iconColor: "#ffffff",
    textColor: "#991b1b",
    subTextColor: "#b91c1c",
    borderColor: "#fca5a5",
    actionBg: "#dc2626",
    actionText: "#ffffff",
    actionHover: "#b91c1c",
    dismissHover: "rgba(239, 68, 68, 0.1)",
    progressColor: "#ef4444",
    glowColor: "rgba(239, 68, 68, 0.08)",
  },
  warning: {
    gradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a40 100%)",
    iconBg: "linear-gradient(135deg, #f59e0b, #d97706)",
    iconColor: "#ffffff",
    textColor: "#78350f",
    subTextColor: "#92400e",
    borderColor: "#fcd34d",
    actionBg: "#d97706",
    actionText: "#ffffff",
    actionHover: "#b45309",
    dismissHover: "rgba(245, 158, 11, 0.1)",
    progressColor: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.08)",
  },
  info: {
    gradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe40 100%)",
    iconBg: "linear-gradient(135deg, #3b82f6, #2563eb)",
    iconColor: "#ffffff",
    textColor: "#1e3a5f",
    subTextColor: "#1d4ed8",
    borderColor: "#93c5fd",
    actionBg: "#2563eb",
    actionText: "#ffffff",
    actionHover: "#1d4ed8",
    dismissHover: "rgba(59, 130, 246, 0.1)",
    progressColor: "#3b82f6",
    glowColor: "rgba(59, 130, 246, 0.08)",
  },
  success: {
    gradient: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d040 100%)",
    iconBg: "linear-gradient(135deg, #10b981, #059669)",
    iconColor: "#ffffff",
    textColor: "#064e3b",
    subTextColor: "#047857",
    borderColor: "#6ee7b7",
    actionBg: "#059669",
    actionText: "#ffffff",
    actionHover: "#047857",
    dismissHover: "rgba(16, 185, 129, 0.1)",
    progressColor: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.08)",
  },
};

const AlertIcons: Record<AlertType, React.ReactNode> = {
  error: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  warning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  success: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
};

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onDismiss }) => {
  const config = typeConfig[alert.type];
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  // Auto-dismiss progress bar (visual countdown for non-error alerts)
  useEffect(() => {
    if (alert.type === "error" || alert.persist) return;
    const duration = 10000;
    const interval = 50;
    const step = (interval / duration) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => Math.max(0, prev - step));
    }, interval);
    return () => clearInterval(timer);
  }, [alert.type, alert.persist]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        background: config.gradient,
        border: `1px solid ${config.borderColor}`,
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 20,
        boxShadow: isHovered
          ? `0 8px 32px ${config.glowColor}, 0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)`
          : `0 2px 12px ${config.glowColor}, 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)`,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateY(-1px)" : "none",
        overflow: "hidden",
        zIndex: 100,
        animation: "alertSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        background: config.iconBg,
        borderRadius: "16px 0 0 16px",
      }} />

      {/* Auto-dismiss progress bar */}
      {alert.type !== "error" && !alert.persist && (
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(0,0,0,0.04)",
          borderRadius: "0 0 16px 16px",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${progress}%`,
            height: "100%",
            background: config.progressColor,
            opacity: 0.4,
            transition: "width 50ms linear",
            borderRadius: "0 0 0 16px",
          }} />
        </div>
      )}

      {/* Icon */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: config.iconBg,
        color: config.iconColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        boxShadow: `0 4px 12px ${config.glowColor}`,
      }}>
        {AlertIcons[alert.type]}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: config.subTextColor,
            opacity: 0.7,
          }}>
            {typeLabels[alert.type]}
          </span>
          <span style={{
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: config.subTextColor,
            opacity: 0.3,
          }} />
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: config.subTextColor,
            opacity: 0.5,
          }}>
            {alert.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 700,
          color: config.textColor,
          lineHeight: 1.5,
          letterSpacing: "-0.01em",
        }}>
          {alert.message}
        </p>
      </div>

      {/* Action button */}
      {alert.action && (
        <button
          onClick={alert.action.onClick}
          style={{
            padding: "10px 20px",
            background: config.actionBg,
            color: config.actionText,
            border: "none",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease",
            boxShadow: `0 2px 8px ${config.glowColor}`,
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = config.actionHover;
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = `0 6px 20px ${config.glowColor}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = config.actionBg;
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = `0 2px 8px ${config.glowColor}`;
          }}
        >
          {alert.action.label}
        </button>
      )}

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(alert.id)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: config.textColor,
          opacity: 0.35,
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.background = config.dismissHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.35";
          e.currentTarget.style.background = "transparent";
        }}
        aria-label="Dismiss alert"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
        </svg>
      </button>

      <style jsx>{`
        @keyframes alertSlideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
