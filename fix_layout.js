const fs = require("fs");
const path = "/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/page.tsx";
let content = fs.readFileSync(path, "utf-8");

// Task 1 & 2: Header Toolbar Flattening and Global Controls Re-alignment
const headerRegex = /\{\/\* ══ HEADER CARD ═════════════════════════════════════════════════ \*\/\}([\s\S]*?)<div style={{ marginLeft: 16, display: "flex", gap: 10 }}>\s*<Link href={`\$\{dashBase\}\/sessions`} className="qa-btn" style=\{\{ background: "#4f46e5", color: "#fff", borderColor: "#4338ca", boxShadow: "0 1px 2px rgba\(79,70,229,\.2\)" \}\}>\s*<Icons\.Play size=\{13\} color="currentColor" \/>\s*Start Session\s*<\/Link>\s*<Link href={`\$\{dashBase\}\/queues\?action=create`} className="qa-btn" style=\{\{ background: "#fff", color: "#4f46e5", borderColor: "#4f46e5" \}\}>\s*<Icons\.PlusCircle size=\{13\} color="currentColor" \/>\s*Create Queue\s*<\/Link>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/m;

// Quick actions regex to remove the refresh bar
const quickActionsRefreshBarRegex = /\{\/\* ── Auto-refresh bar ── \*\/\}([\s\S]*?)<\/div>\s*<\/div>\s*<div style=\{\{ display: "flex", flexWrap: "wrap", gap: 10 \}\}>/m;

const matchQA = content.match(quickActionsRefreshBarRegex);
let refreshBarContent = "";
if (matchQA) {
  refreshBarContent = matchQA[1] + "</div>";
  content = content.replace(quickActionsRefreshBarRegex, `</div>\n            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>`);
}

const newHeader = `{/* ══ PAGE HEADER & GLOBAL CONTROLS ═════════════════════════════════════════════════ */}
          <div className="fade-in" style={{ position: "relative", zIndex: 1, marginBottom: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 32 }}>
              {/* Left: title */}
              <div style={{ maxWidth: 480 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                  {/* brand icon */}
                  <div className="icon-badge" style={{
                    width: 42, height: 42,
                    background: \`linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)\`,
                    border: "1px solid #e5e7eb",
                    boxShadow: \`0 2px 8px rgba(0,0,0,.03), inset 0 2px 0 rgba(255,255,255,.5)\`,
                    borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <Icons.BarChart3 size={20} color="#6366f1" strokeWidth={2.5} />
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    letterSpacing: '.06em', textTransform: 'uppercase',
                    color: "#64748b",
                  }}>Analytics Dashboard</span>
                </div>
                <h1 style={{
                  fontSize: "clamp(26px,2.8vw,32px)", fontWeight: 800,
                  color: "#0f172a", letterSpacing: "-.02em",
                  lineHeight: 1.1, margin: 0,
                }}>
                  Organization Overview
                </h1>
                <p style={{
                  marginTop: 10, fontSize: 14.5, color: "#64748b",
                  lineHeight: 1.6, marginBottom: 0, fontWeight: 400,
                }}>
                  Real time performance metrics across all queues and sessions.
                </p>
              </div>

              {/* Right: Global Controls */}
              {/* ── Auto-refresh bar ── */}
              <div className="refresh-bar" style={{ flexShrink: 0, marginTop: 4 }}>
                ${refreshBarContent.replace(/marginLeft:\s*16,?\s*/g, "").trim()}
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginTop: 24 }}>
              {[
                {
                  id: "filter-session", lbl: "Session", val: selectedSession, set: setSelectedSession, dis: false,
                  opts: <>
                    <option value="">All Sessions</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {s.title ? \` — \${s.title}\` : ""}
                      </option>
                    ))}
                  </>,
                },
                {
                  id: "filter-queue", lbl: "Queue", val: selectedQueue, set: setSelectedQueue, dis: !selectedSession,
                  opts: <>
                    <option value="">All Queues</option>
                    {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                  </>,
                },
              ].map(f => (
                <div key={f.lbl} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label htmlFor={f.id} className="lbl" style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{f.lbl}:</label>
                  <div style={{ position: "relative", transition: "transform .2s ease", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                    <select id={f.id} name={f.id} value={f.val} onChange={e => f.set(e.target.value)} disabled={f.dis} className="ov-sel" style={{ padding: "8px 32px 8px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#0f172a", outline: "none", appearance: "none", minWidth: 160 }}>
                      {f.opts}
                    </select>
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.4 }}>
                      <Icons.ChevronDown size={14} color="#0f172a" strokeWidth={2.5} />
                    </span>
                  </div>
                </div>
              ))}

              <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                <Link href={\`\${dashBase}/sessions\`} className="qa-btn" style={{ background: "#4f46e5", color: "#fff", borderColor: "#4338ca", boxShadow: "0 1px 2px rgba(79,70,229,.2)" }}>
                  <Icons.Play size={13} color="currentColor" />
                  Start Session
                </Link>
                <Link href={\`\${dashBase}/queues?action=create\`} className="qa-btn" style={{ background: "#fff", color: "#4f46e5", borderColor: "#4f46e5" }}>
                  <Icons.PlusCircle size={13} color="currentColor" />
                  Create Queue
                </Link>
              </div>
            </div>
          </div>`;

content = content.replace(headerRegex, newHeader);

// Task 3: Metric Grid Uniformity
// Replace MetricCard height spacer and Cancelled card tint
// Cancelled card:
content = content.replace(/label="Cancelled \/ No-show"(.*?)\n(.*?)color=\{C\.slate\}/g, 'label="Cancelled / No-show"$1\n$2color="#475569"');

// MetricCard Subtext spacer
const metricCardFooterRegex = /\{\/\* trend & subtext footer \*\/\}\s*<div style=\{\{ marginTop: 12, minHeight: 20 \}\}>([\s\S]*?)<\/div>\s*<\/div>\s*\);\s*\}/m;
const metricCardFooterMatch = content.match(metricCardFooterRegex);
if (metricCardFooterMatch) {
  const newFooter = \`{/* trend & subtext footer */}
      <div style={{ marginTop: 12, height: 39, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
        {trend ? (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: trend.up ? C.green : C.red }}>
            {trend.up ? "↑" : "↓"}
            <span className="tnum" style={{ marginLeft: 2 }}>{trend.pct}%</span>
            <span style={{ color: C.textMuted, fontWeight: 400, marginLeft: 4 }}>{comparisonLabel || "vs last session"}</span>
          </div>
        ) : (
          comparisonLabel ? (
            <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 400 }}>
              {comparisonLabel}
            </div>
          ) : (
            <div style={{ height: 18 }} />
          )
        )}
        {subtext ? (
          <div style={{ marginTop: (trend || comparisonLabel) ? 4 : 0, fontSize: 11.5, color: C.textMuted, fontWeight: 500 }}>
            {subtext}
          </div>
        ) : (
          <div style={{ height: 17, marginTop: (trend || comparisonLabel) ? 4 : 0 }} />
        )}
      </div>

    </div>
  );
}\`;
  content = content.replace(metricCardFooterRegex, newFooter);
}

// Ensure "Cancelled" card has identical width by forcing muted to not change width
content = content.replace(/width: muted \? "18%" : "65%"/, 'width: "65%"');

fs.writeFileSync(path, content);
console.log("Replaced successfully.");
