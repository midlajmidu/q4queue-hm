const fs = require('fs');
const path = require('path');

const files = [
    'frontend/app/[orgSlug]/dashboard/page.tsx',
    'frontend/app/[orgSlug]/dashboard/settings/page.tsx',
    'frontend/app/[orgSlug]/dashboard/insights/page.tsx',
    'frontend/app/[orgSlug]/dashboard/docs/page.tsx',
    'frontend/app/[orgSlug]/dashboard/queues/[queueId]/page.tsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Update C object
    content = content.replace(/pageBg:\s*"[^"]+"/g, 'pageBg: "#f9fafb"'); // gray-50
    content = content.replace(/cardBg:\s*"[^"]+"/g, 'cardBg: "#ffffff"');
    content = content.replace(/cardBgAlt:\s*"[^"]+"/g, 'cardBgAlt: "#f9fafb"'); // fallback alt to gray-50
    
    content = content.replace(/border:\s*"[^"]+"/g, 'border: "#e5e7eb"'); // gray-200
    content = content.replace(/borderHov:\s*"[^"]+"/g, 'borderHov: "#d1d5db"'); // gray-300
    content = content.replace(/borderLight:\s*"[^"]+"/g, 'borderLight: "#f3f4f6"'); // gray-100
    
    content = content.replace(/text:\s*"[^"]+"/g, 'text: "#111827"'); // gray-900
    content = content.replace(/textSub:\s*"[^"]+"/g, 'textSub: "#6b7280"'); // gray-500
    content = content.replace(/textMuted:\s*"[^"]+"/g, 'textMuted: "#9ca3af"'); // gray-400

    // 2. Update .card shadow and radius
    content = content.replace(/border-radius:\s*1[0-4]px;/g, 'border-radius: 8px;');
    content = content.replace(/border-radius:\s*16px;/g, 'border-radius: 8px;');
    // .card box-shadow replace (we do a generic replacement for all the multi-line box-shadows in .card and .card:hover)
    
    // Replace .card box shadow block
    content = content.replace(/\.card\s*{[^}]+box-shadow:[^;]+;/g, (match) => {
         return match.replace(/box-shadow:[\s\S]+?;/, 'box-shadow: none;');
    });
    // Replace .card:hover box shadow block
    content = content.replace(/\.card:hover\s*{[^}]+box-shadow:[^;]+;/g, (match) => {
         return match.replace(/box-shadow:[\s\S]+?;/, 'box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);'); // shadow-sm
    });

    // Replace other border radiuses like 10px -> 6px, 12px -> 8px, 14px -> 8px
    // Let's replace inline ones that appear in STYLES or inline jsx
    // actually it's safer to just replace inside the STYLES block
    
    // Save
    fs.writeFileSync(file, content);
    console.log("Updated", file);
});
