"use client";

import { usePathname, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function useDashBase() {
    const { user } = useAuth();
    const pathname = usePathname();
    const params = useParams();

    const orgSlug = (params?.branchSlug as string) || (params?.orgSlug as string) || user?.org_slug;
    let dashBase = orgSlug ? `/${orgSlug}/dashboard` : "/dashboard";

    if (!pathname || !orgSlug) return dashBase;

    if (pathname.startsWith(`/organization-admin/${orgSlug}`)) {
        dashBase = `/organization-admin/${orgSlug}/dashboard`;
    } else if (pathname.startsWith(`/org-admin/${orgSlug}`)) {
        dashBase = `/org-admin/${orgSlug}/dashboard`;
    } else {
        const superAdminMatch = pathname.match(new RegExp(`^/super-admin/([^/]+)/${orgSlug}`));
        if (superAdminMatch) {
            dashBase = `/super-admin/${superAdminMatch[1]}/${orgSlug}/dashboard`;
        }
    }

    return dashBase;
}
