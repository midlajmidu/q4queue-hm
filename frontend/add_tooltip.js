const fs = require('fs');
const path = '/Users/muzammil/Documents/q4queue/q4queue-hm/frontend/app/organization-admin/branches/page.tsx';

let content = fs.readFileSync(path, 'utf8');

const targetStr = `<Link
                                                href={\`/organization-admin/branches/\${branch.id}/admin#token=\${getToken("org_admin") || ""}\`}
                                                target="_blank"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm"
                                            >
                                                Dashboard
                                                <ExternalLink size={12} className="opacity-70" />
                                            </Link>`;

const replacementStr = `<div className="relative group/tooltip inline-block">
                                                <Link
                                                    href={\`/organization-admin/branches/\${branch.id}/admin#token=\${getToken("org_admin") || ""}\`}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm"
                                                >
                                                    Dashboard
                                                    <ExternalLink size={12} className="opacity-70" />
                                                </Link>
                                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-[11.5px] font-medium whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 shadow-lg z-[99]">
                                                    Visit website
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800" />
                                                </div>
                                            </div>`;

if (content.includes(targetStr)) {
    content = content.replaceAll(targetStr, replacementStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Updated both mobile and desktop buttons successfully.");
} else {
    console.log("Could not find the target string.");
}
