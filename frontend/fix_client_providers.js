const fs = require('fs');

// 1. Revert page.tsx
const pagePath = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');
pageContent = pageContent.replace(
    '<div className="dark min-h-screen relative bg-hero-glow overflow-hidden bg-background text-foreground">',
    '<div className="min-h-screen relative bg-hero-glow overflow-hidden">'
);
fs.writeFileSync(pagePath, pageContent, 'utf8');

// 2. Modify ClientProviders.tsx
const cpPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/ClientProviders.tsx';
let cpContent = fs.readFileSync(cpPath, 'utf8');

// Add usePathname import if not exists
if (!cpContent.includes('usePathname')) {
    cpContent = cpContent.replace(
        'import { ThemeProvider } from "next-themes";',
        'import { ThemeProvider } from "next-themes";\nimport { usePathname } from "next/navigation";'
    );
}

// Modify the component
const target = 'export default function ClientProviders({ children }: { children: ReactNode }) {\n    useEffect(() => {';
const replacement = `export default function ClientProviders({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isDashboard = pathname?.includes("/dashboard");
    const forcedTheme = isDashboard ? undefined : "light";

    useEffect(() => {`;

cpContent = cpContent.replace(target, replacement);

const themeTarget = '<ThemeProvider attribute="class" defaultTheme="system" enableSystem>';
const themeReplacement = '<ThemeProvider attribute="class" defaultTheme="system" enableSystem forcedTheme={forcedTheme}>';
cpContent = cpContent.replace(themeTarget, themeReplacement);

fs.writeFileSync(cpPath, cpContent, 'utf8');
