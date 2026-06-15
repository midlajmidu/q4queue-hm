const fs = require('fs');

const filePath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/queues/[queueId]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Sidebar Links
content = content.replace(/className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"/g, 'className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"');

// 2. Main Central Token Card
// Look for serving-card
content = content.replace(/className="serving-card"/g, 'className="serving-card bg-white dark:bg-slate-900 dark:border-white/10"');

// 3. Bottom utility cards
content = content.replace(/className="qd-control-panel"/g, 'className="qd-control-panel bg-[#fafbfc] dark:bg-slate-900 border-[#e4e7ef] dark:border-white/10"');

// 4. Right-hand feed cards
content = content.replace(/<aside className="qd-card"/g, '<aside className="qd-card bg-white dark:bg-slate-900 dark:border-white/10"');

// 5. Typography Primary
// "A9" token
content = content.replace(/className="serving-num"/g, 'className="serving-num dark:text-white"');
content = content.replace(/color: T\.brand/g, 'color: "" /* T.brand removed for dark mode */');
content = content.replace(/color: T\.text/g, 'color: "" /* T.text removed */');
content = content.replace(/color: "#111827"/g, 'color: "" /* text removed */');
content = content.replace(/color: "#334155"/g, 'color: "" /* text removed */');

// H1 Page Title is already updated? Let's check
content = content.replace(/<h1 className="qd-section-title">/g, '<h1 className="qd-section-title dark:text-white">');
// Side feed titles
content = content.replace(/<h2 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>/g, '<h2 className="dark:text-white" style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>');
// If there was color in side feed titles:
content = content.replace(/<h2 style={{ fontSize: 13, fontWeight: 700, color: "", \/\* T.text removed \*\/ margin: 0 }}>/g, '<h2 className="dark:text-white" style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>');
content = content.replace(/<p style={{ fontSize: 18, fontWeight: 700, color: "", \/\* T.text removed \*\/ letterSpacing: "-.02em", margin: 0 }}>/g, '<p className="dark:text-white" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>');

// Secondary Text
// phone number etc.
content = content.replace(/color: T\.textSub/g, 'color: "" /* textSub removed */');
content = content.replace(/color: T\.textMuted/g, 'color: "" /* textMuted removed */');
content = content.replace(/color: "#4b5563"/g, 'color: "" /* #4b5563 removed */');

// Add dark:text-slate-400 classes where color was removed
content = content.replace(/<p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "\.1em", textTransform: "uppercase", color: "", \/\* #4b5563 removed \*\/ marginBottom: 6 }}>/g, '<p className="dark:text-slate-400" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>');
content = content.replace(/<p style={{ fontSize: 13, color: "", \/\* textSub removed \*\/ marginTop: 4 }}>/g, '<p className="dark:text-slate-400" style={{ fontSize: 13, marginTop: 4 }}>');
content = content.replace(/<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "3px 8px", marginTop: 4, fontSize: 13, color: "", \/\* textSub removed \*\/ fontWeight: 500 }}>/g, '<div className="dark:text-slate-400" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "3px 8px", marginTop: 4, fontSize: 13, fontWeight: 500 }}>');
content = content.replace(/<span style={{ fontWeight: 600, color: "", \/\* T.text removed \*\/ }}>/g, '<span className="dark:text-white" style={{ fontWeight: 600 }}>');
content = content.replace(/<div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", fontSize: 11.5, color: "", \/\* textSub removed \*\/ paddingLeft: 56 }}>/g, '<div className="dark:text-slate-400" style={{ display: "flex", flexWrap: "wrap", gap: "0 8px", fontSize: 11.5, paddingLeft: 56 }}>');
content = content.replace(/<p style={{ fontSize: 13, color: "", \/\* textMuted removed \*\/ fontWeight: 500, margin: 0 }}>/g, '<p className="dark:text-slate-400" style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>');


// Inputs
content = content.replace(/className="qd-input"/g, 'className="qd-input bg-[#fafbfc] dark:bg-slate-950 dark:border-white/10 dark:text-white"');

// Dividers
content = content.replace(/borderBottom: `1px solid #f4f5f8`/g, 'borderBottom: `1px solid #f4f5f8`'); // We need to add class
content = content.replace(/borderBottom: `1px solid #f4f5f8`,/g, '/*border*/ borderBottom: `1px solid #f4f5f8`,'); 
content = content.replace(/<div key=\{t.id\} style=\{\{ padding: "10px 18px", background: idx % 2 === 1 \? "#fafbfc" : "transparent", \/\*border\*\/ borderBottom: `1px solid #f4f5f8`,/g, '<div key={t.id} className="group dark:border-white/10" style={{ padding: "10px 18px", background: idx % 2 === 1 ? "var(--q-row-alt)" : "transparent", borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "inherit",');

// Wait, the action buttons...
content = content.replace(/background: "#fff", color: "", \/\* text removed \*\/ cursor: "pointer", transition: "all \.18s"/g, 'cursor: "pointer", transition: "all .18s"'); // Removed background and color
content = content.replace(/style=\{\{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: `1px solid \$\{T.cardBorder\}`, cursor: "pointer", transition: "all \.18s" \}\}/g, 'className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white dark:border-white/10" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: `1px solid ${T.cardBorder}`, cursor: "pointer", transition: "all .18s" }}');


fs.writeFileSync(filePath, content, 'utf8');
console.log("Done");
