const fs = require('fs');
const p = '/Users/muzammil/Documents/q4queue/qrq/frontend/app/[orgSlug]/dashboard/notifications/page.tsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Fix NotifIcon
const notifIconOld = `function NotifIcon({ type }: { type: NotifType }) {
  const map: Record<NotifType, { bg: string; color: string; path: React.ReactElement }> = {
    warning: {
      bg: "#fffbeb", color: "#d97706",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
    },
    success: {
      bg: "#ecfdf5", color: "#059669",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>,
    },
    info: {
      bg: "#eff6ff", color: "#3b82f6",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>,
    },
    error: {
      bg: "#fef2f2", color: "#ef4444",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>,
    },
  };
  const { bg, color, path } = map[type];
  return (
    <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {path}
    </div>
  );
}`;

const notifIconNew = `function NotifIcon({ type }: { type: NotifType }) {
  const map: Record<NotifType, { className: string; path: React.ReactElement }> = {
    warning: {
      className: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
    },
    success: {
      className: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>,
    },
    info: {
      className: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>,
    },
    error: {
      className: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
      path: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>,
    },
  };
  const { className, path } = map[type];
  return (
    <div className={"flex items-center justify-center shrink-0 w-10 h-10 rounded-xl " + className}>
      {path}
    </div>
  );
}`;

content = content.replace(notifIconOld, notifIconNew);

// 2. Fix the tab filter buttons
// Finding the tab-btn loop
const oldTabs = `              <button key={tab.key} className={active ? undefined : "tab-btn"} onClick={() => setActiveTab(tab.key)} style={{
                height: 34, padding: "0 14px", borderRadius: 99,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#64748b",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                transition: "all .15s", display: "flex", alignItems: "center", gap: 6,
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{
                    fontSize: 10, padding: "1px 6px", borderRadius: 6,
                    background: active ? "#4f46e5" : "#e2e8f0",
                    color: active ? "#fff" : "#64748b",
                    // Animate the count change
                    transition: "background .15s, color .15s",
                  }}>`;

const newTabs = `              <button key={tab.key} className={"flex items-center gap-1.5 whitespace-nowrap shrink-0 h-[34px] px-3.5 rounded-full text-xs font-semibold cursor-pointer transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={"text-[10px] px-1.5 rounded-md transition-colors " + (active ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400")}>`;

content = content.replace(oldTabs, newTabs);

// Remove the obsolete .tab-btn hover style
content = content.replace(/\.tab-btn:hover \{ background: #f1f5f9 !important; \}/, '');

fs.writeFileSync(p, content, 'utf8');
