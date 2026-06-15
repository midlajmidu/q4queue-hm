const fs = require('fs');
const qPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/queues/[queueId]/page.tsx';
let content = fs.readFileSync(qPath, 'utf8');

// 1. Fix main content background
content = content.replace(/<div style=\{\{ flex: 1, overflowY: "auto", background: T\.pageBg \}\}>/, '<div className="bg-gray-50 dark:bg-transparent" style={{ flex: 1, overflowY: "auto" }}>');

// 2. Fix the title invisible issue. Remove `.qd-section-title { color: ${T.text}; }`
content = content.replace(/color: \$\{T\.text\};\n/g, '');

// Also ensure the H1 has `text-gray-900` for light mode
content = content.replace(/<h1 className="qd-section-title dark:text-white">/g, '<h1 className="qd-section-title text-gray-900 dark:text-white">');

// 3. Fix the smaller card titles: "Manual Entry", "Invite by Number", "Remove by Number"
// Currently: <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "" /* textMuted removed */, margin: 0 }}>
content = content.replace(/<p style=\{\{ fontSize: 10\.5, fontWeight: 700, letterSpacing: "\.08em", textTransform: "uppercase", color: "" \/\* textMuted removed \*\/, margin: 0 \}\}>/g, '<p className="text-gray-500 dark:text-slate-400" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", margin: 0 }}>');

// "Waiting List" & "Recent Activity" titles
// Currently: <h2 className="dark:text-white" style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
content = content.replace(/<h2 className="dark:text-white"/g, '<h2 className="text-gray-900 dark:text-white"');

// 4. "Prefix: A" etc.
// Currently: Prefix: <span className="mono" style={{ fontWeight: 600, color: "" /* T.brand removed for dark mode */,  padding: "1px 7px", borderRadius: 5 }}>
content = content.replace(/Prefix: <span className="mono" style=\{\{ fontWeight: 600, color: "" \/\* T\.brand removed for dark mode \*\/,  padding: "1px 7px", borderRadius: 5 \}\}>/, 'Prefix: <span className="mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50" style={{ fontWeight: 600, padding: "1px 7px", borderRadius: 5 }}>');

// "Managing" sidebar subtitle
content = content.replace(/<p style=\{\{ fontSize: 9\.5, fontWeight: 700, letterSpacing: "\.1em", textTransform: "uppercase", color: "" \/\* #4b5563 removed \*\/, marginBottom: 6 \}\}>/g, '<p className="text-gray-600 dark:text-slate-400" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>');

// "Queue Management" sidebar subtitle
content = content.replace(/<p style=\{\{ fontSize: 9\.5, fontWeight: 700, letterSpacing: "\.1em", textTransform: "uppercase", color: "" \/\* #4b5563 removed \*\/, padding: "0 6px", marginBottom: 8 \}\}>/g, '<p className="text-gray-600 dark:text-slate-400" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", padding: "0 6px", marginBottom: 8 }}>');

// 5. Scrollbar in Recent Activity / Waiting List
// The user asked to hide the blocky OS scrollbar.
// .qd-card has overflow: hidden, and inside there's `<div style={{ flex: 1, overflowY: "auto", maxHeight: 310 }}>`
// We can add `className="scrollbar-hide"` to it.
content = content.replace(/<div style=\{\{ flex: 1, overflowY: "auto", maxHeight: 310 \}\}>/g, '<div className="scrollbar-hide" style={{ flex: 1, overflowY: "auto", maxHeight: 310 }}>');
content = content.replace(/<div style=\{\{ flex: 1, overflowY: "auto", maxHeight: 240 \}\}>/g, '<div className="scrollbar-hide" style={{ flex: 1, overflowY: "auto", maxHeight: 240 }}>');

fs.writeFileSync(qPath, content, 'utf8');
