const fs = require('fs');

const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/insights/page.tsx';
let content = fs.readFileSync(p, 'utf8');

const oldLogic = `    const dailyTimings = (overview.daily_timings || []).map(dt => ({
      ...dt,
      dateFormatted: new Date(dt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avg_wait_min: dt.avg_wait / 60,
      avg_serve_min: dt.avg_serve / 60
    }));`;

const newLogic = `    // Pad the daily timings to ensure the chart always renders properly
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    const dateMap = new Map();
    
    // Generate all dates in the range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().split('T')[0];
        dateMap.set(iso, { date: iso, avg_wait: 0, avg_serve: 0 });
    }

    // Merge actual data
    (overview.daily_timings || []).forEach(dt => {
        // Some backends return full ISO strings, safely split it
        const dtDate = dt.date ? dt.date.split('T')[0] : "";
        if (dtDate) {
            dateMap.set(dtDate, dt);
        }
    });

    const paddedTimings = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const dailyTimings = paddedTimings.map(dt => ({
      ...dt,
      dateFormatted: new Date(dt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avg_wait_min: dt.avg_wait / 60,
      avg_serve_min: dt.avg_serve / 60
    }));`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(p, content, 'utf8');
