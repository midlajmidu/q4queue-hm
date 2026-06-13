const fs = require('fs');
const file = 'frontend/app/[orgSlug]/dashboard/history/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('PageWrapper')) {
    content = content.replace('import Link from "next/link";', 'import Link from "next/link";\nimport { PageWrapper } from "@/components/PageWrapper";');
}

const headerStart = content.indexOf('<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>');
const filtersStart = content.indexOf('{/* Filters */}');
const filtersEnd = content.indexOf('</div>\n                </div>\n\n                {/* ── KPIs ── */}');

// The live indicator part
const liveIndStart = content.indexOf('{/* Live Indicator */}');
const liveIndEnd = content.indexOf('</div>\n                    </div>\n                    <h1');
const liveIndStr = content.substring(liveIndStart, liveIndEnd);

const filtersStr = content.substring(filtersStart, filtersEnd + 6); // +6 for </div>

const wrapperStart = `        <PageWrapper
            title="Queue History"
            subtitle="Review past sessions, tokens, and detailed performance metrics."
            breadcrumbs={[ { label: "Analytics", href: dashBase + "/insights" }, { label: "History" } ]}
            action={
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    ${liveIndStr}
                    ${filtersStr}
                </div>
            }
        >`;

const toReplace = content.substring(headerStart, filtersEnd + 24); 
content = content.replace(toReplace, wrapperStart);

content = content.replace('            </div>\n        </>\n    );', '            </PageWrapper>\n            </div>\n        </>\n    );');

// replace dashBase since it's not defined in HistoryPage
content = content.replace('const params = useParams();\n    const orgSlug = params?.orgSlug as string;', 'const params = useParams();\n    const orgSlug = params?.orgSlug as string;\n    const dashBase = `/${orgSlug}/dashboard`;');


fs.writeFileSync(file, content);
console.log("Fixed history");
