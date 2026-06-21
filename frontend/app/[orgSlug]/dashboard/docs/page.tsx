"use client";

import React, { useState } from "react";
import Link from "next/link";
import { getToken, getCurrentUser } from "@/lib/auth";

const C = {
  pageBg: "var(--q-page-bg)",
  cardBg: "var(--q-card-bg)",
  border: "var(--q-border)",
  borderHov: "var(--q-border-hov)",
  borderLight: "var(--q-border-light)",
  text: "var(--q-text)",
  textSub: "var(--q-text-sub)",
  textMuted: "var(--q-text-muted)",
  brand:        "var(--q-brand)",
  brandDark:    "var(--q-brand-dark)",
  brandLight:   "var(--q-brand-light)",
  brandBorder:  "var(--q-brand-border)",
  blue:         "var(--q-blue)",  blueBg:    "var(--q-blue-bg)",  blueBorder:   "var(--q-blue-border)",
  green:        "var(--q-green)", greenBg:   "var(--q-green-bg)", greenBorder:  "var(--q-green-border)",
  amber:        "var(--q-amber)", amberBg:   "var(--q-amber-bg)", amberBorder:  "var(--q-amber-border)",
  red:          "var(--q-red)",   redBg:     "var(--q-red-bg)",   redBorder:    "var(--q-red-border)",
  purple:       "#7c3aed",        purpleBg:  "#f5f3ff",           purpleBorder: "#c4b5fd",
  slate:        "#64748b",        slateBg:   "#f8fafc",
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  .dp-root {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    color: ${C.text};
    -webkit-font-smoothing: antialiased;
  }

  /* ── Cards ── */
  .dp-card {
    background: ${C.cardBg};
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid ${C.border};
    border-radius: 8px;
    box-shadow: none;
    transition: box-shadow .25s ease, border-color .25s ease;
    overflow: hidden;
  }
  .dp-card:hover {
    border-color: ${C.borderHov};
    box-shadow:
      0 1px 3px rgba(0,0,0,.04),
      0 8px 28px rgba(0,0,0,.07),
      0 0 0 1px rgba(255,255,255,.8) inset;
  }

  /* ── Pill / tag ── */
  .dp-pill {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 99px;
    font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  /* ── Buttons ── */
  .dp-btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 9px 18px; font-size: 13px; font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #fff;
    background: linear-gradient(175deg, #6366f1 0%, ${C.brand} 45%, ${C.brandDark} 100%);
    border: 1px solid rgba(79,70,229,.3);
    border-radius: 8px; cursor: pointer; text-decoration: none;
    box-shadow: 0 1px 3px rgba(79,70,229,.22), 0 4px 12px rgba(79,70,229,.18), inset 0 1px 0 rgba(255,255,255,.14);
    transition: all .2s ease; letter-spacing: -.01em;
  }
  .dp-btn-primary:hover {
    background: linear-gradient(175deg, #5558e8 0%, ${C.brandDark} 100%);
    box-shadow: 0 2px 6px rgba(79,70,229,.32), 0 8px 20px rgba(79,70,229,.22), inset 0 1px 0 rgba(255,255,255,.14);
    transform: translateY(-1px);
  }

  .dp-btn-ghost {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 9px 16px; font-size: 12.5px; font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${C.textSub}; background: ${C.cardBg};
    border: 1.5px solid ${C.border};
    border-radius: 8px; cursor: pointer; text-decoration: none;
    transition: all .18s ease; letter-spacing: -.01em;
  }
  .dp-btn-ghost:hover {
    border-color: ${C.borderHov}; background: #f4f6fb; color: ${C.text};
    box-shadow: 0 2px 8px rgba(0,0,0,.06);
  }

  /* ── Sidebar nav items ── */
  .dp-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px 9px 9px; font-size: 13.5px; font-weight: 500;
    color: ${C.textSub}; border-left: 3px solid transparent;
    cursor: pointer; border-top: none; border-right: none; border-bottom: none;
    transition: all .15s ease; width: 100%; text-align: left;
    background: transparent; font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .dp-nav-item:hover { background: #f8fafc; color: #334155; }
  .dp-nav-item[data-active="true"] {
    background: transparent; color: #0f172a;
    border-left-color: ${C.brand}; font-weight: 700;
  }

  /* ── Prose ── */
  .dp-prose p {
    margin: 0 0 16px 0; line-height: 1.75; color: ${C.textSub}; font-size: 13.5px;
  }
  .dp-prose strong { color: ${C.text}; font-weight: 700; }
  .dp-prose h3 {
    font-size: 14.5px; font-weight: 700; color: ${C.text};
    margin: 28px 0 14px 0; letter-spacing: -.02em;
    display: flex; align-items: center; gap: 10px;
  }
  .dp-prose h3::after {
    content: ''; flex: 1; height: 1px;
    background: linear-gradient(90deg, ${C.border} 0%, transparent 100%);
  }
  .dp-prose h4 {
    font-size: 10px; font-weight: 700; color: ${C.textMuted};
    margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: .12em;
  }
  .dp-prose ol {
    padding-left: 0; margin-bottom: 24px; list-style: none; counter-reset: step;
  }
  .dp-prose ol li {
    font-size: 13.5px; color: ${C.textSub}; line-height: 1.68; margin-bottom: 10px;
    display: flex; gap: 12px; align-items: flex-start; counter-increment: step;
  }
  .dp-prose ol li::before {
    content: counter(step);
    display: flex; align-items: center; justify-content: center;
    min-width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    background: ${C.brandLight}; border: 1px solid ${C.brandBorder};
    color: ${C.brand}; font-size: 10.5px; font-weight: 800; margin-top: 2px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .dp-prose code {
    font-family: 'JetBrains Mono', monospace; font-size: 11.5px;
    background: #f0f2f8; color: ${C.brand};
    padding: 2px 7px; border-radius: 5px; border: 1px solid ${C.borderLight};
    font-weight: 500;
  }

  /* ── Parameter Table ── */
  .dp-table {
    width: 100%; border-collapse: separate; border-spacing: 0;
    margin: 14px 0 24px; border: 1px solid ${C.border};
    border-radius: 8px; overflow: hidden;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .dp-table th {
    background: #f5f7fb; padding: 10px 18px; text-align: left;
    font-size: 10px; font-weight: 700; color: ${C.textMuted};
    text-transform: uppercase; letter-spacing: .1em;
    border-bottom: 1px solid ${C.border};
    font-family: 'JetBrains Mono', monospace;
  }
  .dp-table td {
    padding: 13px 18px; border-bottom: 1px solid ${C.borderLight};
    font-size: 13px; color: ${C.textSub}; vertical-align: middle; line-height: 1.55;
  }
  .dp-table tr:last-child td { border-bottom: none; }
  .dp-table tr:hover td { background: #fafbfe; }
  .dp-table td strong { color: ${C.text}; font-weight: 700; }

  /* ── Callout ── */
  .dp-callout {
    display: flex; gap: 14px; align-items: flex-start;
    padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;
    border: 1px solid transparent;
  }
  .dp-callout-icon { flex-shrink: 0; margin-top: 2px; }
  .dp-callout-title { display: block; font-weight: 700; font-size: 13px; margin-bottom: 4px; }
  .dp-callout-body  { font-size: 13px; line-height: 1.65; opacity: .85; }

  /* ── Status pulse ── */
  @keyframes dpPulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
  .dp-pulse { animation: dpPulse 2.5s ease-in-out infinite; }

  /* ── Section fade-in ── */
  @keyframes dpFade {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .dp-section-anim { animation: dpFade .28s cubic-bezier(.22,1,.36,1) both; }

  /* ── Progress dots ── */
  .dp-dot {
    height: 6px; border-radius: 99px; border: none; padding: 0; cursor: pointer;
    transition: all .32s cubic-bezier(.22,1,.36,1);
  }

  /* ── Lbl ── */
  .dp-lbl {
    font-size: 9.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
    color: ${C.textMuted}; font-family: 'JetBrains Mono', monospace;
    display: block;
  }

  /* ── TV steps ── */
  .dp-steps-list {
    display: flex; flex-direction: column; gap: 0;
    border: 1px solid ${C.border}; border-radius: 8px; overflow: hidden;
    margin: 14px 0 24px;
  }
  .dp-step-row {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 14px 18px; border-bottom: 1px solid ${C.borderLight};
    font-size: 13px; color: ${C.textSub}; line-height: 1.6;
    background: ${C.cardBg};
    transition: background .15s ease;
  }
  .dp-step-row:last-child { border-bottom: none; }
  .dp-step-row:hover { background: #fafbfe; }
  .dp-step-num {
    min-width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    background: ${C.brandLight}; border: 1px solid ${C.brandBorder};
    color: ${C.brand}; font-size: 10.5px; font-weight: 800; margin-top: 1px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
`;

// ── Sub-components ──────────────────────────────────────────
const Callout = ({ icon, title, body, bg, borderColor, textColor }: any) => (
  <div className="dp-callout" style={{ background: bg, borderColor }}>
    <span className="dp-callout-icon" style={{ color: textColor }}>{icon}</span>
    <div>
      <span className="dp-callout-title" style={{ color: textColor }}>{title}</span>
      <span className="dp-callout-body"  style={{ color: textColor }}>{body}</span>
    </div>
  </div>
);

const InfoIcon = () => (
  <svg width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

export default function DocumentationPage() {
  const user     = getCurrentUser();
  const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";

  /* ── Docs sections ── */
  const DOCS_SECTIONS = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: (
        <svg width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
      ),
      color: C.amber, bg: C.amberBg, border: C.amberBorder,
      content: (
        <div className="dp-prose dp-section-anim">
          <p>
            Welcome to your <strong>Q4Queue Dashboard</strong>. Our platform makes it incredibly simple to
            organize waiting customers, call them to counters, and broadcast wait times via QR codes and TV screens.
          </p>

          <h3>Initial Setup</h3>
          <p>Setting up your very first operational queue takes less than a minute. Let's walk through the steps.</p>

          <ol>
            <li><strong>Navigate to Queues:</strong> Click on "Queues" in your left sidebar.</li>
            <li><strong>Create a Queue:</strong> Hit the "Create Queue" button. Choose an identifiable name like "General Check-in" or "Pharmacy Wait".</li>
            <li><strong>Set a Prefix:</strong> Assign a clear token prefix (like <code>MED-</code> or <code>A-</code>). This makes tokens easy to distinguish visually.</li>
            <li><strong>Activate:</strong> Turn the Queue on. It is now live to the public.</li>
          </ol>

          <Callout
            bg={C.amberBg} borderColor={C.amberBorder} textColor={C.amber}
            icon={<InfoIcon />}
            title="What happens next?"
            body="Once your queue is active, no complex hardware is needed. The queue is immediately accessible via the QR code — customers just point their smartphone cameras and join instantly."
          />
        </div>
      ),
    },
    {
      id: "customer-flow",
      title: "Calling & Skipping",
      icon: (
        <svg width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      ),
      color: C.blue, bg: C.blueBg, border: C.blueBorder,
      content: (
        <div className="dp-prose dp-section-anim">
          <p>
            After your queue is running and customers start scanning the QR Code, they will populate your <strong>Waiting Array</strong>. As a staff member, your job is to guide these tokens through the flow.
          </p>

          <h3>Core Actions</h3>

          <table className="dp-table">
            <thead>
              <tr><th>Action</th><th>Result</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Call Next</strong></td>
                <td>Pulls the oldest waiting customer and flashes the token on all linked TV Displays with a chime.</td>
              </tr>
              <tr>
                <td><strong>Skip Customer</strong></td>
                <td>Token is pushed to the History log as "Skipped" and the pipeline unblocks immediately.</td>
              </tr>
              <tr>
                <td><strong>Force Call (Manual)</strong></td>
                <td>Staff can enter an explicit Token ID to manually override the sequence array and call them directly.</td>
              </tr>
            </tbody>
          </table>

          <Callout
            bg={C.blueBg} borderColor={C.blueBorder} textColor={C.blue}
            icon={<InfoIcon />}
            title="Public Announcements"
            body='Use the broadcast input box on the Queue page to type custom messages. These display dynamically across the bottom bar of all connected TV displays (e.g., "Counter 3 is currently closed").'
          />
        </div>
      ),
    },
    {
      id: "permissions",
      title: "Staff & Permissions",
      icon: (
        <svg width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
      ),
      color: C.green, bg: C.greenBg, border: C.greenBorder,
      content: (
        <div className="dp-prose dp-section-anim">
          <p>
            Your team is the operational backbone of Q4Queue. Add staff members through the dashboard so they can call customers on their own mobile devices.
          </p>

          <h3>Inviting Team Members</h3>
          <p>Navigate to the <strong>Staff</strong> tab in your sidebar. Click "Add New Staff" and enter their credentials. An email logic flow ensures they login securely under your organization.</p>

          <table className="dp-table">
            <thead>
              <tr><th>Role</th><th>Capabilities</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="dp-pill" style={{ background: "#f1f5f9", color: C.textSub, border: `1px solid ${C.border}` }}>
                    Admin
                  </span>
                </td>
                <td>Total control over generating queues, modifying settings, wiping logs, and managing team members.</td>
              </tr>
              <tr>
                <td>
                  <span className="dp-pill" style={{ background: C.greenBg, color: C.green, border: `1px solid ${C.greenBorder}` }}>
                    Staff
                  </span>
                </td>
                <td>Can view queues, call clients, and skip customers. Cannot view analytics or create new queues.</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      id: "tv-displays",
      title: "QR Codes & TV Displays",
      icon: (
        <svg width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      ),
      color: C.brand, bg: C.brandLight, border: C.brandBorder,
      content: (
        <div className="dp-prose dp-section-anim">
          <p>
            Point any physical iPad, Smart TV, or printed flyer at your Queue routing URL. No apps to install, no hardware to configure.
          </p>

          <h3>The QR Flyer</h3>
          <p>Inside an active Queue page, a large QR Code widget is available. Users just point their iOS or Android camera at the code. Print it and tape it to a stand at your front desk!</p>

          <h3>Smart TV Pairing</h3>

          <div className="dp-steps-list">
            {[
              "Open the built-in Web Browser application on your Smart TV.",
              <>Navigate to the <strong>Public Directory Link</strong> found at the bottom of your Queue page.</>,
              "Maximize the window into Full-Screen Mode.",
            ].map((step, i) => (
              <div key={i} className="dp-step-row">
                <span className="dp-step-num">{i + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <Callout
            bg={C.brandLight} borderColor={C.brandBorder} textColor={C.brand}
            icon={<InfoIcon />}
            title="Auto-Refresh Protection"
            body="All TVs will auto-retry polling indefinitely during Wi-Fi drops. You do not need to manually refresh broken screens."
          />
        </div>
      ),
    },
    {
      id: "analytics",
      title: "Reading Analytics",
      icon: (
        <svg width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      ),
      color: C.purple, bg: C.purpleBg, border: C.purpleBorder,
      content: (
        <div className="dp-prose dp-section-anim">
          <p>
            Understanding your service speed helps you plan resourcing and staffing. Q4Queue passively collects timing profiles into structured metrics.
          </p>

          <h3>Core Metrics Explained</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "18px 0 28px" }}>
            {[
              {
                label: "Average Wait Time",
                desc: "Total duration a customer waited between tapping 'Join Queue' and when staff clicked 'Call Next'.",
                icon: (color: string) => (
                  <svg width={17} height={17} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
                  </svg>
                ),
                color: C.purple, bg: C.purpleBg, border: C.purpleBorder,
              },
              {
                label: "Total Served",
                desc: "A pure integer representing how many tokens were successfully funneled through the service arrays by your staff.",
                icon: (color: string) => (
                  <svg width={17} height={17} fill="none" stroke={color} strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                ),
                color: C.green, bg: C.greenBg, border: C.greenBorder,
              },
            ].map((m) => (
              <div key={m.label} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "14px 18px", borderRadius: 12,
                background: m.bg, border: `1px solid ${m.border}`,
              }}>
                <span style={{ flexShrink: 0, marginTop: 2, color: m.color }}>{m.icon(m.color)}</span>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.text, display: "block", marginBottom: 4 }}>{m.label}</span>
                  <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.55 }}>{m.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <Callout
            bg={C.purpleBg} borderColor={C.purpleBorder} textColor={C.purple}
            icon={<InfoIcon />}
            title="Archival History Logs"
            body="Navigate to the Dashboard root or click 'History' from the sidebar to retrieve complete CSV data for past months."
          />
        </div>
      ),
    },
  ];

  const [activeSection, setActiveSection] = useState(DOCS_SECTIONS[0].id);
  const activeData = DOCS_SECTIONS.find((s) => s.id === activeSection) || DOCS_SECTIONS[0];
  const activeIdx  = DOCS_SECTIONS.findIndex((s) => s.id === activeSection);

  return (
    <>
      <style>{STYLES}</style>
      <div className="dp-root">
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

          {/* ── Hero Header ── */}
          <header style={{
            position: "relative", overflow: "hidden",
            padding: "36px 40px",
            borderRadius: 8,
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.03)",
          }}>
            {/* Brand accent strip */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: `linear-gradient(90deg, ${C.brand} 0%, #818cf8 55%, ${C.blue} 100%)`,
            }} />

            <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(145deg, #eef2ff, #e0e7ff)",
                    border: `1px solid ${C.brandBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: C.brand, boxShadow: "0 2px 6px rgba(79,70,229,.14)",
                  }}>
                    <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                  </div>
                  <span className="dp-pill" style={{ background: C.brandLight, color: C.brand, border: `1px solid ${C.brandBorder}` }}>
                    Tutorial
                  </span>
                </div>

                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", color: C.text, margin: "0 0 8px" }}>
                  User Manual
                </h1>
                <p style={{ fontSize: 13.5, color: C.textSub, margin: 0, maxWidth: 440, lineHeight: 1.65 }}>
                  Learn how to master your Q4Queue dashboard, organize waiting customers, and broadcast live waiting times.
                </p>
              </div>


            </div>

            {/* Decorative blobs */}
            <div style={{ position: "absolute", top: -80, right: -40, width: 300, height: 300, background: `radial-gradient(circle, ${C.brandLight} 0%, transparent 70%)`, pointerEvents: "none", opacity: .55 }} />
            <div style={{ position: "absolute", bottom: -100, right: 160, width: 220, height: 220, background: `radial-gradient(circle, ${C.blueBg} 0%, transparent 70%)`, pointerEvents: "none", opacity: .45 }} />
          </header>

          {/* ── Body ── */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 248px) 1fr", gap: 20, alignItems: "start" }}>

            {/* ── Sidebar ── */}
            <aside style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Nav */}
              <div className="dp-card" style={{ padding: 6 }}>
                <span className="dp-lbl" style={{ padding: "12px 12px 7px 14px" }}>Guides & Docs</span>
                <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {DOCS_SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className="dp-nav-item"
                      data-active={activeSection === s.id}
                    >
                      <span style={{
                        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: activeSection === s.id ? s.bg : "transparent",
                        color: activeSection === s.id ? s.color : C.textMuted,
                        border: activeSection === s.id ? `1px solid ${s.border}` : "1px solid transparent",
                        transition: "all .18s ease",
                      }}>
                        {s.icon}
                      </span>
                      {s.title}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Support card */}
              <div className="dp-card" style={{ padding: "16px 18px" }}>
                <span className="dp-lbl" style={{ marginBottom: 8 }}>Need Help?</span>
                <p style={{ fontSize: 12.5, color: C.textSub, margin: "0 0 13px", lineHeight: 1.55 }}>
                  Our concierge team is directly available for on-boarding.
                </p>
                <a href="mailto:support@q4queue.com" className="dp-btn-ghost" style={{ fontSize: 12, padding: "8px 12px", justifyContent: "center", width: "100%", boxSizing: "border-box" }}>
                  <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  Contact Support
                </a>
              </div>

              {/* Status */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 14px", borderRadius: 10,
                border: `1px solid ${C.greenBorder}`, background: C.greenBg,
              }}>
                <span className="dp-pulse" style={{
                  width: 7, height: 7, borderRadius: "50%", background: C.green,
                  flexShrink: 0, boxShadow: `0 0 0 2px rgba(5,150,105,.2)`,
                }} />
                <span style={{ fontSize: 11.5, color: "#065f46", fontWeight: 700, letterSpacing: "-.01em" }}>
                  All systems operational
                </span>
              </div>
            </aside>

            {/* ── Main content ── */}
            <main>
              <div className="dp-card" style={{ position: "relative", minHeight: 540 }}>
                {/* Section color bar */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 4,
                  background: `linear-gradient(90deg, ${activeData.color}, ${activeData.color}50)`,
                }} />

                {/* Section header */}
                <div style={{ padding: "28px 36px 22px", borderBottom: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: activeData.bg, border: `1px solid ${activeData.border}`,
                      color: activeData.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: `0 3px 10px ${activeData.color}22`,
                    }}>
                      {React.cloneElement(activeData.icon as React.ReactElement<any>, { width: 20, height: 20 })}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 4px", letterSpacing: "-.03em" }}>
                        {activeData.title}
                      </h2>
                      <span className="dp-lbl" style={{ letterSpacing: ".06em" }}>
                        Guide {activeIdx + 1} of {DOCS_SECTIONS.length}
                      </span>
                    </div>

                    {/* Progress dots */}
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                      {DOCS_SECTIONS.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => setActiveSection(s.id)}
                          className="dp-dot"
                          style={{
                            width: s.id === activeSection ? 20 : 6,
                            background: s.id === activeSection ? activeData.color : C.borderLight,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "28px 36px 32px" }}>
                  {activeData.content}
                </div>
              </div>

              {/* Prev / Next navigation */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "0 2px" }}>
                {(() => {
                  const prev = DOCS_SECTIONS[activeIdx - 1];
                  const next = DOCS_SECTIONS[activeIdx + 1];
                  return (
                    <>
                      {prev ? (
                        <button onClick={() => setActiveSection(prev.id)} className="dp-btn-ghost">
                          <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                          </svg>
                          {prev.title}
                        </button>
                      ) : <span />}
                      {next ? (
                        <button onClick={() => setActiveSection(next.id)} className="dp-btn-ghost">
                          {next.title}
                          <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                          </svg>
                        </button>
                      ) : <span />}
                    </>
                  );
                })()}
              </div>
            </main>

          </div>
        </div>
      </div>
    </>
  );
}