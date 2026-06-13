const fs = require('fs');
const file = 'frontend/app/[orgSlug]/dashboard/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove NotificationSystem block from JSX
content = content.replace(/\{\/\* ── BOTTOM UTILITY BAR \(Notifs \+ Profile\) ── \*\/\}[\s\S]*?(?=\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* ══ QUICK ACTIONS)/, '');

// The bottom function NotificationSystem
const functionIndex = content.indexOf('function NotificationSystem() {');
if (functionIndex !== -1) {
    // Look for the end of the file or the next top-level function if any
    const nextFuncIndex = content.indexOf('\nfunction ', functionIndex + 10);
    if (nextFuncIndex !== -1) {
        content = content.substring(0, functionIndex) + content.substring(nextFuncIndex);
    } else {
        // If it's the last function, just remove everything from there, but there are other functions below!
        // "function TimingPanel", "function SmartInsightCard", "function HourlyChart"
        const nextFuncTimingIndex = content.indexOf('function TimingPanel');
        if (nextFuncTimingIndex !== -1) {
            content = content.substring(0, functionIndex) + content.substring(nextFuncTimingIndex);
        }
    }
}

fs.writeFileSync(file, content);
console.log("Fixed page.tsx NotificationSystem");
