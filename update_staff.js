const fs = require('fs');
const file = 'frontend/app/[orgSlug]/dashboard/staff/page.tsx';

let content = fs.readFileSync(file, 'utf8');

// Colors
content = content.replace(/#0f172a/gi, '#111827');
content = content.replace(/#64748b/gi, '#6b7280');
content = content.replace(/#94a3b8/gi, '#9ca3af');
content = content.replace(/#f8fafc/gi, '#f9fafb');
content = content.replace(/#fafbfe/gi, '#f9fafb');

// Borders
content = content.replace(/0\.5px solid #e2e8f0/g, '1px solid #e5e7eb');
content = content.replace(/0\.5px solid #e8edf2/g, '1px solid #e5e7eb');
content = content.replace(/0\.5px solid #f1f5f9/g, '1px solid #f3f4f6');
content = content.replace(/0\.5px solid #c7d2fe/g, '1px solid #c7d2fe');
content = content.replace(/0\.5px solid #fecaca/g, '1px solid #fecaca');
content = content.replace(/0\.5px solid transparent/g, '1px solid transparent');

// Border Radius
content = content.replace(/borderRadius: 16/g, 'borderRadius: 8');
content = content.replace(/borderRadius: 12/g, 'borderRadius: 8');
content = content.replace(/borderRadius: 10/g, 'borderRadius: 6');
content = content.replace(/borderRadius: 9/g, 'borderRadius: 6');

// Shadows
content = content.replace(/boxShadow: "0 1px 4px rgba\(0,0,0,\.04\)"/g, 'boxShadow: "none"');
content = content.replace(/boxShadow: "0 24px 48px rgba\(0,0,0,\.12\), 0 0 0 0\.5px rgba\(0,0,0,\.06\)"/g, 'boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"');

fs.writeFileSync(file, content);
console.log("Updated staff/page.tsx");
