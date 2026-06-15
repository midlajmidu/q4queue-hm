const fs = require('fs');
const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/page.tsx';
let content = fs.readFileSync(p, 'utf8');

// The landing page was: <div className="min-h-screen relative bg-hero-glow overflow-hidden">
content = content.replace(
    '<div className="min-h-screen relative bg-hero-glow overflow-hidden">',
    '<div className="dark min-h-screen relative bg-hero-glow overflow-hidden bg-background text-foreground">'
);

fs.writeFileSync(p, content, 'utf8');
