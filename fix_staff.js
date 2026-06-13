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

const headerStart = content.indexOf('{/* ── Header ── */}');
const searchAndFiltersStart = content.indexOf('{/* ── Search & Filters ── */}');

const toReplace = content.substring(headerStart, searchAndFiltersStart);

const actionStart = content.indexOf('{isAdmin && (', headerStart);
const actionEnd = content.indexOf('</button>\n          )}', actionStart);
const actionStr = actionStart !== -1 ? content.substring(actionStart, actionEnd + 21) : '';

const wrapperStart = `<PageWrapper
          title="Staff Management"
          subtitle="Add and manage team members who can access the dashboard."
          breadcrumbs={[{ label: "Organization", href: dashBase }, { label: "Staff" }]}
          action={
            ${actionStr}
          }
        >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        `;

content = content.replace(toReplace, wrapperStart);

content = content.replace('        </div>\n      </div>\n    </>', '        </div>\n        </PageWrapper>\n      </div>\n    </>');

fs.writeFileSync(file, content);
console.log("Fixed staff");
