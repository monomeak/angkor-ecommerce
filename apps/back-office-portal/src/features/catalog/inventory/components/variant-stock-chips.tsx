"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { stockLevel } from "../lib/stock-level";
import type { StockLevel, VariantStock } from "../types/inventory";

const LEVEL_STYLES: Record<StockLevel, string> = {
    out: "border-destructive/40 bg-destructive/10 text-destructive",
    low: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    ok: "border-border text-muted-foreground"
};

/** Every size with its own count, so the size that ran out is visible at a glance. */
export function VariantStockChips({
    variants,
    threshold
}: {
    readonly variants: VariantStock[];
    readonly threshold: number;
}) {
    const t = useTranslations("Inventory");

    if (variants.length === 0) {
        return <span className="text-xs text-muted-foreground">{t("noVariants")}</span>;
    }

    return (
        <ul className="flex flex-wrap gap-1.5">
            {variants.map((variant) => {
                const level = stockLevel(variant.stock, threshold);
                return (
                    <li
                        key={variant.id}
                        title={variant.sku}
                        className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs tabular-nums",
                            LEVEL_STYLES[level]
                        )}
                    >
                        <span className="font-medium">{variant.size ?? t("oneSize")}</span>
                        <span>{variant.stock}</span>
                        {level !== "ok" && <span className="sr-only">{t(`level_${level}`)}</span>}
                    </li>
                );
            })}
        </ul>
    );
}
