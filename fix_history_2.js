const fs = require('fs');
const file = 'frontend/app/[orgSlug]/dashboard/history/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('PageWrapper')) {
    content = content.replace('import Link from "next/link";', 'import Link from "next/link";\nimport { PageWrapper } from "@/components/PageWrapper";');
}

// Ensure dashBase is defined
if (!content.includes('const dashBase = `/${orgSlug}/dashboard`;')) {
    content = content.replace('const orgSlug = params?.orgSlug as string;', 'const orgSlug = params?.orgSlug as string;\n    const dashBase = `/${orgSlug}/dashboard`;');
}

const headerStart = content.indexOf('{/* ── Header ── */}');
const overviewStatsStart = content.indexOf('{/* ── Overview Stats ── */}');

const toReplace = content.substring(headerStart, overviewStatsStart);

const wrapperStart = `
            <PageWrapper
                title="Queue History"
                subtitle="Review past sessions, tokens, and detailed performance metrics."
                breadcrumbs={[{ label: "Analytics", href: dashBase + "/insights" }, { label: "History" }]}
                action={
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Session</p>
                      <div style={{ position: "relative" }}>
                        <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)} style={selectStyle}>
                          <option value="">All Sessions</option>
                          {sessions.map(s => (
                            <option key={s.id} value={s.id}>{formatDate(s.session_date)} {s.title ? \`(\${s.title})\` : ""}</option>
                          ))}
                        </select>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Queue</p>
                      <div style={{ position: "relative" }}>
                        <select value={selectedQueueId} onChange={e => setSelectedQueueId(e.target.value)} disabled={!selectedSessionId} style={{ ...selectStyle, opacity: !selectedSessionId ? 0.5 : 1 }}>
                          <option value="">All Queues</option>
                          {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                        </select>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>
                  </div>
                }
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                `;

content = content.replace(toReplace, wrapperStart);

content = content.replace('            </div>\n            <style>{`', '            </div>\n            </PageWrapper>\n            <style>{`');

fs.writeFileSync(file, content);
console.log("Fixed history 2");
