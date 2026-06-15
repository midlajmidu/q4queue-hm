const fs = require('fs');

// 1. Update Sidebar.tsx
const sidebarPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/Sidebar.tsx';
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

sidebarContent = sidebarContent.replace('import { ThemeToggle } from "@/components/ThemeToggle";\n', '');

const themeToggleBlock = `                            {/* Theme Toggle */}
                            <Tip label="Theme" show={c}>
                                <div className={c ? "" : "flex-shrink-0"}>
                                    <ThemeToggle collapsed={c} />
                                </div>
                            </Tip>

`;
sidebarContent = sidebarContent.replace(themeToggleBlock, '');

fs.writeFileSync(sidebarPath, sidebarContent, 'utf8');

// 2. Update TopBar.tsx
const topBarPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/TopBar.tsx';
let topBarContent = fs.readFileSync(topBarPath, 'utf8');

topBarContent = topBarContent.replace(
    'import { createPortal } from "react-dom";',
    'import { createPortal } from "react-dom";\nimport { ThemeToggle } from "@/components/ThemeToggle";'
);

const topBarInjectionPoint = `                <NotificationSystem />

                <div className="flex items-center gap-2.5 p-1 pr-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10`;

const topBarInjected = `                <ThemeToggle />
                <NotificationSystem />

                <div className="flex items-center gap-2.5 p-1 pr-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10`;

topBarContent = topBarContent.replace(topBarInjectionPoint, topBarInjected);

fs.writeFileSync(topBarPath, topBarContent, 'utf8');
