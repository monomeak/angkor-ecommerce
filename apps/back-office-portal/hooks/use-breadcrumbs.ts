"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { usePathname } from "@/app/i18n/navigation";
import { routing } from "@/app/i18n/routing";
import { productKeys } from "@/src/features/catalog/products/lib/query-keys";
import type { Product } from "@/src/features/catalog/products/types/product";
import { invoiceKeys } from "@/src/features/invoices/lib/query-keys";
import type { Invoice } from "@/src/features/invoices/types/invoice";

export interface Crumb {
    label: string;
    /** Absent on the last crumb, which is the current page. */
    href?: string;
}

/**
 * Section landing pages that exist as a route. `/catalog` and `/settings` are grouping
 * segments with no page of their own, so they appear as plain text rather than a dead link.
 */
const NON_NAVIGABLE_SEGMENTS = new Set(["catalog", "settings"]);

/** Path segment → key in the `Navigation` message namespace. */
const NAVIGATION_KEYS: Record<string, string> = {
    overview: "overview",
    invoices: "invoices",
    customers: "customers",
    testimonials: "testimonials",
    reports: "reports",
    analytics: "analytics",
    team: "team",
    catalog: "catalog",
    products: "products",
    categories: "categories",
    inventory: "inventory",
    settings: "settings",
    profile: "profile",
    appearance: "appearance",
    "privacy-security": "privacySecurity"
};

export function useBreadcrumbs(): Crumb[] {
    const pathname = usePathname();
    const tNav = useTranslations("Navigation");
    const tCrumb = useTranslations("Breadcrumbs");
    const queryClient = useQueryClient();

    // usePathname from the i18n navigation helper is already locale-stripped, but a stray
    // prefix here would silently produce an "En" crumb — cheap to rule out.
    const segments = pathname.split("/").filter(Boolean);
    if (routing.locales.some((locale) => locale === segments[0])) {
        segments.shift();
    }

    if (segments.length === 0) {
        return [{ label: tNav("overview") }];
    }

    const crumbs: Crumb[] = [];
    let href = "";

    segments.forEach((segment, index) => {
        href += `/${segment}`;
        const isLast = index === segments.length - 1;

        let label: string;

        if (NAVIGATION_KEYS[segment]) {
            label = tNav(NAVIGATION_KEYS[segment]);
        } else if (segment === "new") {
            label = tCrumb("new");
        } else if (segment === "edit") {
            label = tCrumb("edit");
        } else if (segment === "details") {
            label = tCrumb("details");
        } else if (/^\d+$/.test(segment)) {
            /*
             * A record id. The detail query is already in the cache by the time the page
             * renders, so read the real name or number from there rather than showing a bare
             * id — which one depends on what the id belongs to. Falling back to "#12" keeps
             * the crumb honest on a cold load or a direct link.
             */
            const id = Number(segment);
            const parent = segments[index - 1];

            const cached =
                parent === "invoices"
                    ? queryClient.getQueryData<Invoice>(invoiceKeys.detail(id))?.invoiceNumber
                    : queryClient.getQueryData<Product>(productKeys.detail(id))?.name;

            label = cached ?? `#${segment}`;
        } else {
            // Unknown segment: title-case it rather than dropping the crumb, so a route added
            // later still shows something sensible before it gets a translation.
            label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
        }

        crumbs.push({
            label,
            href: isLast || NON_NAVIGABLE_SEGMENTS.has(segment) ? undefined : href
        });
    });

    return crumbs;
}
