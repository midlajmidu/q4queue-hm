const fs = require('fs');
const file = 'frontend/app/[orgSlug]/dashboard/insights/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('PageWrapper')) {
    content = content.replace('import { useAuth } from "@/hooks/useAuth";', 'import { useAuth } from "@/hooks/useAuth";\nimport { PageWrapper } from "@/components/PageWrapper";');
}

// Find header block
const headerStart = content.indexOf('<div className="ins-fade">');
const rightColStart = content.indexOf('<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>', headerStart);
const rightColEnd = content.indexOf('</div>\n            </div>', rightColStart) + 6;

const rightColStr = content.substring(rightColStart, rightColEnd);

const wrapperStart = `      <div className="ins-root">
        <PageWrapper
            title="Performance Insights"
            breadcrumbs={[ { label: "Dashboard", href: dashBase }, { label: "Insights" } ]}
            action={
                ${rightColStr}
            }
        >
          <div className="ins-fade">
`;

// Replace from <div className="ins-root"> to rightColEnd with the new wrapper
const rootStart = content.indexOf('<div className="ins-root">');
const toReplace = content.substring(rootStart, rightColEnd + 14); // + 14 to include </div></div>

content = content.replace(toReplace, wrapperStart);

// Close wrapper
content = content.replace('      </div>\n    </>\n  );', '          </div>\n        </PageWrapper>\n      </div>\n    </>\n  );');

fs.writeFileSync(file, content);
console.log("Fixed insights");
