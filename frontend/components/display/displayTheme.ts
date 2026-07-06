// Display theme utility — light (default) / dark toggle
// All display components use these helpers for consistent theming.

export type DisplayTheme = "light" | "dark";

/** Card background */
export const cardBg = (t: DisplayTheme) =>
    t === "dark" ? "bg-[rgba(255,255,255,0.03)]" : "bg-white";

/** Card border */
export const cardBorder = (t: DisplayTheme) =>
    t === "dark" ? "border-[rgba(255,255,255,0.08)]" : "border-slate-200";

/** Card shadow (light only) */
export const cardShadow = (t: DisplayTheme) =>
    t === "dark" ? "" : "shadow-sm";

/** Icon container bg */
export const iconBg = (t: DisplayTheme) =>
    t === "dark" ? "bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)]" : "bg-slate-100 border-slate-200";

/** Section label (WAITING, RECENTLY CALLED, etc.) */
export const labelText = (t: DisplayTheme) =>
    t === "dark" ? "text-slate-300" : "text-slate-500";

/** Icon stroke */
export const iconColor = (t: DisplayTheme) =>
    t === "dark" ? "text-slate-300" : "text-slate-400";

/** Primary text (token numbers, big counts) */
export const primaryText = (t: DisplayTheme) =>
    t === "dark" ? "text-white" : "text-slate-900";

/** Secondary text (dimmed token numbers) */
export const secondaryText = (t: DisplayTheme) =>
    t === "dark" ? "text-slate-200" : "text-slate-500";

/** Muted text (timestamps, captions) */
export const mutedText = (t: DisplayTheme) =>
    t === "dark" ? "text-slate-400" : "text-slate-400";

/** Divider between list items */
export const dividerBorder = (t: DisplayTheme) =>
    t === "dark" ? "border-[rgba(255,255,255,0.04)]" : "border-slate-100";

/** Pagination dot active */
export const dotActive = (t: DisplayTheme) =>
    t === "dark" ? "bg-slate-300" : "bg-slate-600";

/** Pagination dot inactive */
export const dotInactive = (t: DisplayTheme) =>
    t === "dark" ? "bg-slate-700" : "bg-slate-300";

/** Badge (counter pill) */
export const badgeBg = (t: DisplayTheme) =>
    t === "dark" ? "bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)]" : "bg-slate-100 border-slate-200";

/** Badge text */
export const badgeText = (t: DisplayTheme) =>
    t === "dark" ? "text-slate-400" : "text-slate-500";

/** Gradient text for the big number */
export const gradientText = (t: DisplayTheme) =>
    t === "dark"
        ? "text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400"
        : "text-transparent bg-clip-text bg-gradient-to-br from-slate-950 to-slate-700";

/** "Please approach counter" pill */
export const counterPillBg = (t: DisplayTheme) =>
    t === "dark"
        ? "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)] text-slate-300"
        : "bg-slate-100 border-slate-200 text-slate-600";

/** Counter pill strong text */
export const counterPillStrong = (t: DisplayTheme) =>
    t === "dark" ? "text-white" : "text-slate-900";
