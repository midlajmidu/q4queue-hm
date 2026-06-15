"use client";

import React from "react";
import Link from "next/link";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface StandardPageHeaderProps {
  breadcrumbs: Breadcrumb[];
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode; // For any extra things like the "LIVE" indicator in history
}

export function StandardPageHeader({ breadcrumbs, title, subtitle, action, icon, children }: StandardPageHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Breadcrumbs */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>
          {icon && (
            <span style={{ display: "flex", alignItems: "center" }}>
              {icon}
            </span>
          )}
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={idx}>
              {bc.href ? (
                <Link
                  href={bc.href}
                  style={{ color: "inherit", textDecoration: "none", transition: "color .15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#4f46e5"}
                  onMouseLeave={e => e.currentTarget.style.color = "inherit"}
                >
                  {bc.label}
                </Link>
              ) : (
                <span style={{ color: "#64748b" }}>{bc.label}</span>
              )}
              {idx < breadcrumbs.length - 1 && (
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </React.Fragment>
          ))}
          {/* Optional Extra Elements (like Live Indicator) */}
          {children}
        </div>
        
        {/* Title */}
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--q-text)", letterSpacing: "-.025em", margin: 0 }}>
          {title}
        </h1>
        
        {/* Subtitle */}
        {subtitle && (
          <p style={{ fontSize: 14, color: "var(--q-text-muted)", margin: 0, lineHeight: 1.5, fontWeight: 400 }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {action && (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {action}
        </div>
      )}
    </div>
  );
}
