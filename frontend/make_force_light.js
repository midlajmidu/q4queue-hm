const fs = require('fs');
const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/globals.css';
let content = fs.readFileSync(p, 'utf8');

const rootRegex = /:root\s*\{([\s\S]*?)\}/;
const match = content.match(rootRegex);
if (match) {
  const rootVars = match[1];
  const forceLightCSS = `\n.force-light {\n${rootVars}\n}\n`;
  content += forceLightCSS;
  fs.writeFileSync(p, content, 'utf8');
}
