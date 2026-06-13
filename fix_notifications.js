const fs = require('fs');
const file = 'frontend/app/[orgSlug]/dashboard/notifications/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('PageWrapper')) {
    content = content.replace('import { useNotifications, DashboardNotification } from "@/context/NotificationContext";', 'import { useNotifications, DashboardNotification } from "@/context/NotificationContext";\nimport { PageWrapper } from "@/components/PageWrapper";');
}

const headerStart = content.indexOf('{/* ── Header ── */}');
const tabFiltersStart = content.indexOf('{/* ── Tab filters ── */}');

const toReplace = content.substring(headerStart, tabFiltersStart);

const dashBaseMatch = content.match(/const dashBase = `\/\${orgSlug}\/dashboard`;/);
if (!dashBaseMatch) {
    content = content.replace('const orgSlug = params?.orgSlug as string;', 'const orgSlug = params?.orgSlug as string;\n  const dashBase = `/${orgSlug}/dashboard`;');
}

const buttonsStart = content.indexOf('<div style={{ display: "flex", gap: 8 }}>', headerStart);
const buttonsEnd = content.indexOf('</div>\n        </div>', buttonsStart);
const buttonsStr = content.substring(buttonsStart, buttonsEnd + 6); // include </div>

const wrapperStart = `<PageWrapper
          title="Recent Activity"
          subtitle="Stay updated with queue events, performance alerts, and system logs."
          breadcrumbs={[{ label: "Activity Center", href: dashBase }, { label: "Notifications" }]}
          action={
            ${buttonsStr}
          }
        >
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 840, margin: "0 auto" }}>
        `;

content = content.replace(toReplace, wrapperStart);

content = content.replace('        {notifications.length > 0 && (\n          <div style={{ textAlign: "center", padding: "16px 0 40px", fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>\n            Showing {filtered.length} of {notifications.length} notifications\n          </div>\n        )}\n      </div>\n    </>', '        {notifications.length > 0 && (\n          <div style={{ textAlign: "center", padding: "16px 0 40px", fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>\n            Showing {filtered.length} of {notifications.length} notifications\n          </div>\n        )}\n      </div>\n      </PageWrapper>\n      </div>\n    </>');

// Wait, the original had:
//       <div style={{
//         fontFamily: "'DM Sans', sans-serif", ... maxWidth: 840 ...
//       }}>
// I need to close the original div AND PageWrapper. So:
const originalEndBlock = `        {notifications.length > 0 && (
          <div style={{ textAlign: "center", padding: "16px 0 40px", fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>
            Showing {filtered.length} of {notifications.length} notifications
          </div>
        )}
      </div>
    </>`;
const newEndBlock = `        {notifications.length > 0 && (
          <div style={{ textAlign: "center", padding: "16px 0 40px", fontSize: 12, fontWeight: 500, color: "#94a3b8" }}>
            Showing {filtered.length} of {notifications.length} notifications
          </div>
        )}
      </div>
      </PageWrapper>
      </div>
    </>`;
content = content.replace(originalEndBlock, newEndBlock);

fs.writeFileSync(file, content);
console.log("Fixed notifications");
