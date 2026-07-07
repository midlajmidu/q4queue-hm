const fs = require('fs');
const path = '/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/app/organization-admin/analytics/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// Extract Peak Traffic Analysis block
const peakTrafficStart = content.indexOf('{/* Peak Traffic Analysis */}');
const peakTrafficEnd = content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', peakTrafficStart) + 1) + 1) + 1) + 7; // It has 4 nested divs closed. Actually let's use a better regex or string matching.

// Let's just find the exact block
const peakStr = content.substring(peakTrafficStart, content.indexOf('{/* Right Column */}'));

// Clean up the extraction (remove the trailing `</div>` that belongs to Left Column)
const peakBlock = peakStr.substring(0, peakStr.lastIndexOf('</div>')).trim();

if (peakTrafficStart !== -1) {
    // Remove it from Left Column
    content = content.replace(peakStr, '\n                </div>\n\n                {/* Right Column */}');

    // Insert it after Complex Tables Grid
    const endOfGrid = content.indexOf('</div>', content.indexOf('Guest Distribution') + 2000); // We need to insert after the grid closing tag.
    
    // Instead of regex, let's just insert it before the last 2 `</div>` in the file.
    const lastDiv = content.lastIndexOf('</div>');
    const secondLastDiv = content.lastIndexOf('</div>', lastDiv - 1);
    const thirdLastDiv = content.lastIndexOf('</div>', secondLastDiv - 1);
    
    // Replace the end of file
    const endStr = content.substring(thirdLastDiv);
    const newEndStr = `</div>\n\n            {/* Full Width Peak Traffic Analysis */}\n            <div className="w-full mt-6">\n                ${peakBlock}\n            </div>\n        </div>\n    );\n}\n`;
    
    content = content.substring(0, thirdLastDiv) + newEndStr;

    fs.writeFileSync(path, content, 'utf8');
    console.log("Moved Peak Traffic Analysis to full width");
} else {
    console.log("Could not find Peak Traffic Analysis");
}
