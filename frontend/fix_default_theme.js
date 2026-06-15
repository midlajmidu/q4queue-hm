const fs = require('fs');

const cpPath = '/Users/muzammil/Documents/q4queue/qrq/frontend/components/ClientProviders.tsx';
let cpContent = fs.readFileSync(cpPath, 'utf8');

cpContent = cpContent.replace(
    'defaultTheme="system"',
    'defaultTheme="light"'
);
// Also disable enableSystem if we want to strictly respect light mode first and ignore OS preference changes
// Actually, next-themes says if defaultTheme is not 'system', we should probably keep enableSystem=true if we want it to react to OS changes ONLY IF the user hasn't explicitly set a preference.
// But the user said: "show light mode first, if user need to change it later, user can manually chaneg"
// So `defaultTheme="light"` is exactly what's needed.
cpContent = cpContent.replace(
    'enableSystem',
    'enableSystem={false}'
);

fs.writeFileSync(cpPath, cpContent, 'utf8');
