const fs = require('fs');
const files = [
    'frontend/app/[orgSlug]/dashboard/page.tsx',
    'frontend/app/[orgSlug]/dashboard/settings/page.tsx',
    'frontend/app/[orgSlug]/dashboard/insights/page.tsx',
    'frontend/app/[orgSlug]/dashboard/docs/page.tsx',
    'frontend/app/[orgSlug]/dashboard/queues/[queueId]/page.tsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace the exact .card block
    content = content.replace(/box-shadow:\s*0 0 0 1px rgba\(0,0,0,\.02\),\s*0 1px 2px rgba\(0,0,0,\.03\),\s*0 2px 8px rgba\(0,0,0,\.025\);/g, 'box-shadow: none;');
    // Also replace the other one just in case
    content = content.replace(/box-shadow:\s*0 0 0 1px rgba\(0,0,0,\.03\),\s*0 4px 12px rgba\(0,0,0,\.06\),\s*0 8px 28px rgba\(0,0,0,\.04\);/g, 'box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);');

    // And let's fix qa-btn and others border radii if any
    content = content.replace(/border-radius:\s*10px;/g, 'border-radius: 6px;');
    content = content.replace(/border-radius:\s*11px;/g, 'border-radius: 6px;');
    content = content.replace(/border-radius:\s*12px;/g, 'border-radius: 8px;');
    
    // The previous script already successfully did text colors.
    fs.writeFileSync(file, content);
    console.log("Fixed shadows in", file);
});
