"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductErrorState } from "../../products/components/product-list-states";
import { CategoryStockTable } from "../components/category-stock-table";
import { StockKpiCards } from "../components/stock-kpi-cards";
import { useInventorySummary } from "../hooks/use-inventory";
import { inventoryDetailsHref } from "../lib/search-params";

/**
 * The overview: shop-wide totals and one row per category. No product lists here — those are
 * on the details page, which every number links into. All the counting is done by core-api.
 */
export function InventoryView() {
    const t = useTranslations("Inventory");
    const { data, isPending, isError, error, refetch } = useInventorySummary();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("subtitle", { threshold: data?.threshold ?? "…" })}
                    </p>
                </div>
                <Button variant="outline" nativeButton={false} render={<Link href="/catalog/products" />}>
                    {t("viewAllProducts")}
                    <ArrowRight />
                </Button>
            </div>

            {isPending ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton key={index} className="h-28 rounded-xl" />
                        ))}
                    </div>
                    <Skeleton className="h-96 w-full rounded-md" />
                </>
            ) : isError ? (
                <ProductErrorState error={error} onRetry={() => void refetch()} />
            ) : (
                <>
                    <StockKpiCards totals={data.totals} threshold={data.threshold} />

                    {data.totals.productsNeedingAttention > 0 && (
                        <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="flex items-center gap-2 text-sm">
                                <AlertTriangle className="size-4 shrink-0 text-destructive" />
                                {t("attentionBanner", { count: data.totals.productsNeedingAttention })}
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                nativeButton={false}
                                render={<Link href={inventoryDetailsHref({ stock: "low" })} />}
                            >
                                {t("reviewLowStock")}
                            </Button>
                        </div>
                    )}

                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold">{t("byCategory")}</h2>
                        <CategoryStockTable categories={data.categories} />
                    </section>
                </>
            )}
        </div>
    );
}
