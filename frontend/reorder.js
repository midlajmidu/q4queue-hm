const fs = require('fs');
const path = '/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/app/organization-admin/analytics/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const s1 = '                {/* Cross-Branch Wait Time Benchmark */}';
const s2 = '                {/* Queue Analytics */}';
const s3 = '                {/* PAX / Group Size Analysis */}';

const i1 = content.indexOf(s1);
const i2 = content.indexOf(s2);
const i3 = content.indexOf(s3);

if (i1 === -1 || i2 === -1 || i3 === -1) {
    console.error("Markers not found!");
    process.exit(1);
}

const waitBenchmarkBlock = content.substring(i1, i2);

// Remove the Wait Benchmark block from its original position
let newContent = content.slice(0, i1) + content.slice(i2);

// Find the new index of s3 in newContent
const newI3 = newContent.indexOf(s3);

// Insert the Wait Benchmark block before s3
newContent = newContent.slice(0, newI3) + waitBenchmarkBlock + newContent.slice(newI3);

fs.writeFileSync(path, newContent, 'utf8');
console.log("Reordered successfully!");
