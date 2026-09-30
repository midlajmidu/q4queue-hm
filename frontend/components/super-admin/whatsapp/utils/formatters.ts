/**
 * components/super-admin/whatsapp/utils/formatters.ts
 * Date and time formatting utilities for WhatsApp management panel.
 */

export function fmtTime(iso?: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
}
