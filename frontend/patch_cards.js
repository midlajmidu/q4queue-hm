const fs = require('fs');
const path = require('path');

const dir = '/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/components/organization-admin/branch-details/';

const filesToPatch = [
    'BranchContactCard.tsx',
    'BranchAdminsOverview.tsx',
    'BranchStaffOverview.tsx',
    'BranchActivityTimeline.tsx',
    'BranchFuturePlaceholders.tsx'
];

filesToPatch.forEach(file => {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Standardize the container style
    content = content.replace(
        /className="bg-white rounded-xl border border-slate-200/g, 
        'className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm'
    );
    
    // Also patch the header if it has standard px-5 py-4 border-b border-slate-100
    content = content.replace(
        /className="px-4 sm:px-5 py-4 border-b border-slate-100/g,
        'className="px-5 py-4 border-b border-slate-100/80 bg-slate-50/50'
    );
    content = content.replace(
        /className="px-5 py-4 border-b border-slate-100/g,
        'className="px-5 py-4 border-b border-slate-100/80 bg-slate-50/50'
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${file}`);
});

// Specifically fix BranchTodayPerformance
const todayPath = path.join(dir, 'BranchTodayPerformance.tsx');
if (fs.existsSync(todayPath)) {
    let todayContent = fs.readFileSync(todayPath, 'utf8');
    todayContent = todayContent.replace('overflow-hidden flex flex-col h-full', 'overflow-hidden');
    todayContent = todayContent.replace('divide-slate-100/80 flex-1', 'divide-slate-100/80');
    fs.writeFileSync(todayPath, todayContent, 'utf8');
    console.log('Fixed BranchTodayPerformance');
}

