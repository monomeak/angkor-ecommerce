"use client";

import { PackageSearch } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PaginationControls } from "@/lib/pagination-control";
import { LOW_STOCK_THRESHOLD } from "../../products/lib/constants";
import { ProductErrorState } from "../../products/components/product-list-states";
import { InventoryFilters } from "../components/inventory-filters";
import { InventoryItemsTable } from "../components/inventory-items-table";
import { useInventoryItems, useInventorySummary } from "../hooks/use-inventory";
import { useInventoryListParams } from "../hooks/use-inventory-list-params";
import { PAGE_SIZE_OPTIONS } from "../lib/search-params";

/**
 * Every product with its stock per size, neediest first — core-api sorts by each product's
 * lowest variant, so a sold-out XL rises to the top even when the M is well stocked.
 */
export function InventoryDetailsView() {
    const t = useTranslations("Inventory");
    const { params, page, setParams } = useInventoryListParams();
    const { data, isLoading, isError, error, isFetching, refetch } = useInventoryItems(params);
    // Only for the category filter's labels; it is usually already cached from the overview.
    const { data: summary } = useInventorySummary();

    const total = data?.total ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / params.limit));
    const hasFilters = Boolean(params.search || params.categoryId || params.stock !== "all");

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">{t("detailsTitle")}</h1>
                <p className="text-sm text-muted-foreground">
                    {t("detailsSubtitle", { threshold: summary?.threshold ?? LOW_STOCK_THRESHOLD })}
                </p>
            </div>

            <InventoryFilters params={params} categories={summary?.categories ?? []} onChange={setParams} />

            {isError ? (
                <ProductErrorState error={error} onRetry={() => void refetch()} />
            ) : !isLoading && total === 0 ? (
                <Empty className="border">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <PackageSearch />
                        </EmptyMedia>
                        <EmptyTitle>{hasFilters ? t("emptyFilteredTitle") : t("emptyTitle")}</EmptyTitle>
                        <EmptyDescription>
                            {params.stock !== "all" ? t("emptyStockBody") : t("emptyBody")}
                        </EmptyDescription>
                    </EmptyHeader>
                    {hasFilters && (
                        <EmptyContent>
                            <Button
                                variant="outline"
                                onClick={() => setParams({ search: null, categoryId: null, stock: "all" })}
                            >
                                {t("clearFilters")}
                            </Button>
                        </EmptyContent>
                    )}
                </Empty>
            ) : (
                <>
                    <InventoryItemsTable
                        items={data?.items ?? []}
                        threshold={LOW_STOCK_THRESHOLD}
                        isLoading={isLoading}
                        isFetching={isFetching}
                    />
                    <PaginationControls
                        currentPage={page}
                        pageCount={pageCount}
                        total={total}
                        pageSize={params.limit}
                        pageSizeOptions={PAGE_SIZE_OPTIONS}
                        itemLabel="product"
                        onPageChange={(next) => setParams({ page: next })}
                        onPageSizeChange={(limit) => setParams({ limit })}
                    />
                </>
            )}
        </div>
    );
}
