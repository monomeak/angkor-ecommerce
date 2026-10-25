"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
    buildInventorySearchParams,
    getCurrentPage,
    parseInventorySearchParams,
    type InventoryFilterPatch
} from "../lib/search-params";

/** Same arrangement as the product and customer lists: the URL holds the state, updates replace. */
export function useInventoryListParams() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const params = useMemo(
        () => parseInventorySearchParams(new URLSearchParams(searchParams.toString())),
        [searchParams]
    );

    const setParams = useCallback(
        (patch: InventoryFilterPatch) => {
            const query = buildInventorySearchParams(new URLSearchParams(searchParams.toString()), patch).toString();

            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams]
    );

    return { params, page: getCurrentPage(params), setParams };
}
