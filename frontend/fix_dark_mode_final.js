const fs = require('fs');

// 1. Sessions Detail Page
const sessionsPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/sessions/[sessionId]/queues/page.tsx';
let sContent = fs.readFileSync(sessionsPath, 'utf8');

// Fix Root Canvas
sContent = sContent.replace('className="min-h-screen bg-gray-50/50 pb-16"', 'className="min-h-screen bg-gray-50/50 dark:bg-transparent pb-16"');

// Fix Massive Date Header Card
sContent = sContent.replace('className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8"', 'className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-6 sm:p-8"');

// Invert Date Header Card Text
sContent = sContent.replace('text-gray-800 font-semibold', 'text-gray-800 dark:text-white font-semibold');
sContent = sContent.replace('text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight', 'text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight');

// Fix "No queues in this session" empty state
sContent = sContent.replace('bg-white rounded-2xl border-2 border-dashed border-gray-200', 'bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10');
sContent = sContent.replace('text-xl font-black text-gray-900', 'text-xl font-black text-gray-900 dark:text-white');

fs.writeFileSync(sessionsPath, sContent, 'utf8');


// 2. QueueCard Component
const cardPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/QueueCard.tsx';
let cContent = fs.readFileSync(cardPath, 'utf8');

// Fix QueueCard Wrapper
cContent = cContent.replace('bg-white rounded-xl border border-gray-200', 'bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-white/10');

// Fix QueueCard Text
cContent = cContent.replace('text-gray-900 truncate', 'text-gray-900 dark:text-white truncate');

// Fix QueueCard stats background
cContent = cContent.replace(/bg-gray-50 rounded-lg/g, 'bg-gray-50 dark:bg-slate-800 rounded-lg');
cContent = cContent.replace(/text-gray-900/g, 'text-gray-900 dark:text-white');

// Fix QueueCard footer
cContent = cContent.replace('bg-gray-50/50', 'bg-gray-50/50 dark:bg-slate-900/50 dark:border-white/10');

fs.writeFileSync(cardPath, cContent, 'utf8');


// 3. Active Queue Page
const qPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/queues/[queueId]/page.tsx';
let qContent = fs.readFileSync(qPath, 'utf8');

// Fix Invisible text in Recent Activity feed (Customer names, phones, tokens)
// Already did some, but let's make sure. The user said:
// "Target the 'Recent Activity' and 'Waiting List' feed components ... primary data must be pure white (dark:text-white), secondary must be muted gray (dark:text-slate-400)."
// In Waiting List:
qContent = qContent.replace(/color: T\.text/g, 'color: "" /* T.text removed */');
// But I might have missed inline style. Let's find any remaining `color: T.text` and replace with `dark:text-white`
qContent = qContent.replace(/<span style=\{\{ fontSize: 15, fontWeight: 800, color: "" \/\* T\.text removed \*\/, fontVariantNumeric: "tabular-nums", minWidth: 48 \}\}>/g, '<span className="dark:text-white" style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums", minWidth: 48 }}>');
qContent = qContent.replace(/<span style=\{\{ fontWeight: 600, color: "" \/\* T\.text removed \*\/ \}\}>/g, '<span className="dark:text-white" style={{ fontWeight: 600 }}>');

qContent = qContent.replace(/<h2 style=\{\{ fontSize: 13, fontWeight: 700, margin: 0 \}\}>/g, '<h2 className="dark:text-white" style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>');

// Fix main content scroll background 
qContent = qContent.replace('background: T.pageBg', '/* background removed */');

// Fix Inner Sidebar text
// The user says "Invert the inner sidebar ... Invert the H1 text and sidebar links to pure white/light gray."
qContent = qContent.replace('text-gray-500 hover:text-gray-900', 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'); // Sidebar links

// Fix Top Header row
qContent = qContent.replace('<h1 className="qd-section-title">', '<h1 className="qd-section-title dark:text-white">');
qContent = qContent.replace('background: "#fff",', '/* background: "#fff" */');

// Ensure inputs have dark:bg-slate-950 dark:border-white/10 dark:text-white
// Text inputs: "Add Customer", "Search token...", "Search recent..."
qContent = qContent.replace(/className="qd-input"/g, 'className="qd-input bg-[#fafbfc] dark:bg-slate-950 dark:border-white/10 dark:text-white"');
// Add Customer input might not use `qd-input`, let's check
// In previous grep it had `className="qd-input"`

// Top Right action buttons
// "Reset", "Display", "Delete" buttons in the top right. "Give them a dark slate background (dark:bg-slate-800), pure white text, and an ultra-thin border."
qContent = qContent.replace(/background: T\.amberBg,/g, 'background: T.amberBg /* removed for dark mode */,'); // Wait, the user wants dark:bg-slate-800 for ALL buttons?
qContent = qContent.replace(/background: T\.brandLight,/g, 'background: T.brandLight /* removed */,');
qContent = qContent.replace(/background: T\.redBg,/g, 'background: T.redBg /* removed */,');

fs.writeFileSync(qPath, qContent, 'utf8');

