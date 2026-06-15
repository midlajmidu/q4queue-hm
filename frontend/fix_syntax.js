const fs = require('fs');
const filePath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/queues/[queueId]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/color: "" \/\* T\.text removed \*\/Sub/g, 'color: "" /* textSub removed */');
content = content.replace(/color: "" \/\* T\.text removed \*\/Muted/g, 'color: "" /* textMuted removed */');
// also fix the RecentTokenRow text colors:
// <span style={{ fontSize: 15, fontWeight: 800, color: "" /* T.text removed */, fontVariantNumeric: "tabular-nums", minWidth: 48 }}>
content = content.replace(/<span style=\{\{ fontSize: 15, fontWeight: 800, color: "" \/\* T\.text removed \*\//g, '<span className="dark:text-white" style={{ fontSize: 15, fontWeight: 800,');

// <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", fontSize: 11.5, color: "" /* textSub removed */, paddingLeft: 56 }}>
content = content.replace(/<div style=\{\{ display: "flex", flexWrap: "wrap", gap: "0 8px", fontSize: 11\.5, color: "" \/\* textSub removed \*\//g, '<div className="dark:text-slate-400" style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", fontSize: 11.5,');

// <span style={{ fontSize: 11.5, color: "" /* textMuted removed */, fontVariantNumeric: "tabular-nums" }}>
content = content.replace(/<span style=\{\{ fontSize: 11\.5, color: "" \/\* textMuted removed \*\//g, '<span className="dark:text-slate-400" style={{ fontSize: 11.5,');

// Check for other syntax errors
content = content.replace(/borderBottom: `1px solid #f4f5f8`/g, 'borderBottom: `1px solid #f4f5f8`');

// The hover background on RecentTokenRow:
// onMouseEnter={e => (e.currentTarget.style.background = "#fafbfc")}
// This will override dark mode hover. 
content = content.replace(/onMouseEnter=\{e => \(e\.currentTarget\.style\.background = "#fafbfc"\)\}/g, 'onMouseEnter={e => (e.currentTarget.style.background = "var(--q-row-alt)")}');

// Replace any remaining `color: "" /* T.text removed */` that might break if inside an object without a comma? It has a comma after it mostly. Let's just remove the `color: ...` entirely inside the style objects for those elements, but `color: ""` is valid CSS in React.

// In Waiting List:
// <div key={t.id} className="group dark:border-white/10" style={{ padding: "10px 18px", background: idx % 2 === 1 ? "var(--q-row-alt)" : "transparent", borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "inherit",
// This is already done, but we need to ensure `--q-row-alt` exists or we just use Tailwind classes.

fs.writeFileSync(filePath, content, 'utf8');
