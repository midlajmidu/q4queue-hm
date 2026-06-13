const fs = require('fs');
const file = 'frontend/app/[orgSlug]/dashboard/staff/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('PageWrapper')) {
    content = content.replace('import Link from "next/link";', 'import Link from "next/link";\nimport { PageWrapper } from "@/components/PageWrapper";');
}

const dashBaseMatch = content.match(/const dashBase = `\/\${orgSlug}\/dashboard`;/);
if (!dashBaseMatch) {
    content = content.replace('const orgSlug = params?.orgSlug as string;', 'const orgSlug = params?.orgSlug as string;\n  const dashBase = `/${orgSlug}/dashboard`;');
}

// Find the main return statement of StaffPage. It starts with: return (\n    <>\n      <style>{FONT_IMPORT}</style>
const mainReturnStart = content.indexOf('return (\n    <>\n      <style>{FONT_IMPORT}</style>');

// Find the header div within that return
const headerStart = content.indexOf('<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>', mainReturnStart);
const searchAndFiltersStart = content.indexOf('{/* ── Search & Filters ── */}', headerStart);

// Action block
const actionStart = content.indexOf('{isAdmin && (', headerStart);
const actionEnd = content.indexOf('</button>\n          )}', actionStart);
const actionStr = actionStart !== -1 && actionStart < searchAndFiltersStart ? content.substring(actionStart, actionEnd + 21) : '';

const wrapperStart = `
        <PageWrapper
          title="Staff Management"
          subtitle="Add and manage team members who can access the dashboard."
          breadcrumbs={[{ label: "Organization", href: dashBase }, { label: "Staff" }]}
          action={
            ${actionStr}
          }
        >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        `;

const toReplace = content.substring(headerStart - 32, searchAndFiltersStart); // include the `{/* ── Header ── */}` comment
content = content.replace(toReplace, wrapperStart);

// find the end of the file
const endOriginal = '        </div>\n      </div>\n    </>\n  );\n}';
const endNew = '        </div>\n        </PageWrapper>\n      </div>\n    </>\n  );\n}';
content = content.replace(endOriginal, endNew);

fs.writeFileSync(file, content);
console.log("Fixed staff 2");
