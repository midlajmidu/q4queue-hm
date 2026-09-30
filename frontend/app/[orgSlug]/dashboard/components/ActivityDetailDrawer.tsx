import React from "react";
import type { AnalyticsOverview } from "@/types/api";
import { Icons } from "./DashboardIcons";
import { fmtTime } from "@/lib/tzformat";

const C = {
  text: "var(--q-text)",
  textSub: "var(--q-text-sub)",
  textMuted: "var(--q-text-muted)",
  slateBg: "var(--q-slate-bg)",
  border: "var(--q-border)",
  brandLight: "var(--q-brand-light)",
  brandBorder: "var(--q-brand-border)",
  brand: "var(--q-brand)",
  blue: "var(--q-blue)",
  amber: "var(--q-amber)",
  green: "var(--q-green)",
  pageBg: "var(--q-page-bg)",
  brandGlow: "var(--q-brand-glow)",
};

export type DrawerActivityItem = NonNullable<AnalyticsOverview["recent_activity"]>[number];

export interface ActivityDetailDrawerProps {
  activity: DrawerActivityItem | null;
  onClose: () => void;
  tz: string;
}

export function ActivityDetailDrawer({ activity, onClose, tz }: ActivityDetailDrawerProps) {
  if (!activity) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel" role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Interaction Details</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textSub }}>
              {activity.session_name ? `${activity.session_name} • ` : ""}{activity.queue}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "#e5e7eb", cursor: "pointer", color: C.textMuted, padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
          >
            <Icons.X size={20} color="currentColor" />
          </button>
        </div>

        <div className="drawer-body">
          {/* Top Banner */}
          <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 22, background: C.slateBg, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 28 }}>
            <div className="tabular-nums" style={{ width: 52, height: 52, borderRadius: 14, background: C.brandLight, border: `1px solid ${C.brandBorder}`, color: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 }}>
              {activity.prefix}{activity.number}
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>Current Status</div>
              <span className="chip" style={{ background: "#fff", border: `1px solid ${C.border}`, fontSize: 13, padding: "5px 12px", borderRadius: 10 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: activity.status === "serving" ? C.blue : (activity.status === "waiting" ? C.amber : C.green), display: "inline-block" }} />
                <span style={{ textTransform: "capitalize" }}>{activity.status}</span>
              </span>
            </div>
          </div>

          {/* Vertical Timeline */}
          <div className="section-label" style={{ marginBottom: 16 }}>Timeline</div>

          <div style={{ position: "relative", paddingLeft: 14 }}>
            {/* Connector line */}
            <div style={{ position: "absolute", left: 18, top: 14, bottom: 14, width: 2, background: `linear-gradient(180deg, ${C.brand}33, ${C.border})`, borderRadius: 99 }} />

            {(() => {
              const steps = [];
              steps.push({ lbl: "Token Issued", time: activity.time, active: true });
              
              const isWaiting = ["waiting", "serving", "done"].includes(activity.status);
              steps.push({ lbl: "Waiting in Queue", time: activity.time, active: isWaiting });
              
              if (activity.skipped_at) {
                steps.push({ lbl: "Skipped", time: activity.skipped_at, active: true });
              }
              if (activity.recalled_at) {
                steps.push({ lbl: "Recalled to Queue", time: activity.recalled_at, active: true });
              }
              
              const hasServed = !!activity.served_at || ["serving", "done"].includes(activity.status);
              steps.push({ lbl: "Currently Serving", time: activity.served_at || (hasServed ? activity.time : null), active: hasServed });
              
              const isDone = ["done", "deleted"].includes(activity.status) || (activity.status === "skipped" && !activity.recalled_at);
              let finalLbl = "Service Completed";
              if (activity.status === "deleted") finalLbl = "Cancelled";
              else if (activity.status === "skipped" && !activity.recalled_at) finalLbl = "Skipped";
              
              steps.push({ lbl: finalLbl, time: activity.completed_at || (isDone ? (activity.skipped_at || activity.time) : null), active: isDone });
              
              return steps;
            })().map((step, i) => (
              <div key={i} style={{ gap: 18, position: "relative", marginBottom: 28, opacity: step.active ? 1 : 0.35, transition: "opacity .3s ease", display: "flex" }}>
                {/* Dot */}
                <div style={{ position: "relative", zIndex: 2, width: 12, height: 12, borderRadius: "50%", background: step.active ? C.brand : C.pageBg, border: `2px solid ${step.active ? "#fff" : C.border}`, outline: `2px solid ${step.active ? C.brandBorder : "transparent"}`, marginTop: 4, boxShadow: step.active ? `0 0 8px ${C.brandGlow}` : "none", transition: "all .3s ease" }} />

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1.4 }}>{step.lbl}</div>
                  <div className="tabular-nums" style={{ fontSize: 12, color: C.textMuted, marginTop: 5, fontWeight: 500 }}>
                    {step.time ? fmtTime(step.time, tz) : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
