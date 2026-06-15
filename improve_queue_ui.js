const fs = require('fs');

const file = 'frontend/app/[orgSlug]/dashboard/queues/[queueId]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Upgrade serving-card in Dark Mode
content = content.replace(
    'className="serving-card bg-white dark:bg-slate-900 dark:border-white/10"',
    'className="serving-card bg-white dark:bg-[#0b1120]/80 dark:backdrop-blur-xl border border-transparent dark:border-white/10 shadow-2xl dark:shadow-primary/5"'
);

// 2. Upgrade the Now Serving pill inside serving-card
content = content.replace(
    'border: `1px solid ${T.brandBorder}`',
    'border: `1px solid ${T.brandBorder}`'
); // wait, let's target the parent div

// Add a class to the Now Serving pill parent
content = content.replace(
    '<div style={{ display: "inline-flex", alignItems: "center", gap: 8,  border: `1px solid ${T.brandBorder}`, borderRadius: 99, padding: "5px 16px", marginBottom: 20, position: "relative", zIndex: 1 }}>',
    '<div className="dark:bg-primary/10 dark:border-primary/30" style={{ display: "inline-flex", alignItems: "center", gap: 8,  border: `1px solid ${T.brandBorder}`, borderRadius: 99, padding: "5px 16px", marginBottom: 20, position: "relative", zIndex: 1 }}>'
);

// 3. Upgrade Call Next / Done & Next Buttons
content = content.replace(
    '.qd-btn-call-next {',
    '.qd-btn-call-next {\n    position: relative;\n    overflow: hidden;\n    background: linear-gradient(135deg, ${T.brand}, ${T.brandDark});'
);
// Remove the old background: ${T.brand};
content = content.replace(
    'background: ${T.brand};\n    color: #fff;',
    'color: #fff;'
);
content = content.replace(
    '.qd-btn-done-next {',
    '.qd-btn-done-next {\n    position: relative;\n    overflow: hidden;\n    background: linear-gradient(135deg, ${T.green}, #15803d);'
);
content = content.replace(
    'background: ${T.green};\n    color: #fff;',
    'color: #fff;'
);

// 4. Upgrade Manual Control Panels (Manual Entry, Invite, Remove)
content = content.replace(
    /className="qd-control-panel bg-\[\#fafbfc\] dark:bg-slate-900 border-\[\#e4e7ef\] dark:border-white\/10"/g,
    'className="qd-control-panel bg-[#fafbfc] dark:bg-[#0b1120]/60 dark:backdrop-blur-lg border border-[#e4e7ef] dark:border-white/10 shadow-sm dark:shadow-none"'
);

// 5. Upgrade the Right Sidebar Cards (Waiting List, Recent Activity)
content = content.replace(
    /className="bg-white dark:bg-slate-900 rounded-2xl border border-\[\#e4e7ef\] dark:border-white\/10 flex flex-col/g,
    'className="bg-white dark:bg-[#0b1120]/80 dark:backdrop-blur-xl rounded-2xl border border-[#e4e7ef] dark:border-white/10 flex flex-col shadow-sm dark:shadow-none"'
);

// 6. Upgrade inner sidebar items active state
content = content.replace(
    /className="qd-nav-item active"/g,
    'className="qd-nav-item active dark:bg-primary/20 dark:text-primary-foreground dark:shadow-[0_0_15px_rgba(91,94,244,0.3)]"'
);

// 7. Add a subtle glow behind the big A0 number
content = content.replace(
    'className="serving-num dark:text-white"',
    'className="serving-num text-slate-900 dark:text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]"'
);

fs.writeFileSync(file, content, 'utf8');
