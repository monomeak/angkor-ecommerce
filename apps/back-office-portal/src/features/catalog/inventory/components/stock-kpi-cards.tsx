"use client";

import { AlertTriangle, Boxes, Package, PackageX } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { inventoryDetailsHref } from "../lib/search-params";
import type { StockCounts } from "../types/inventory";

type Kpi = {
    label: string;
    value: number;
    hint: string;
    icon: LucideIcon;
    href: string;
    alert?: boolean;
};

const formatCount = (value: number) => new Intl.NumberFormat("en-US").format(value);

export function StockKpiCards({ totals, threshold }: { readonly totals: StockCounts; readonly threshold: number }) {
    const t = useTranslations("Inventory");

    const kpis: Kpi[] = [
        {
            label: t("kpiProducts"),
            value: totals.products,
            hint: t("kpiProductsHint", { variants: totals.variants }),
            icon: Package,
            href: inventoryDetailsHref()
        },
        {
            label: t("kpiUnits"),
            value: totals.unitsInStock,
            hint: t("kpiUnitsHint"),
            icon: Boxes,
            href: inventoryDetailsHref()
        },
        {
            label: t("kpiLow"),
            value: totals.lowStockVariants,
            hint: t("kpiLowHint", { threshold }),
            icon: AlertTriangle,
            href: inventoryDetailsHref({ stock: "low" }),
            alert: totals.lowStockVariants > 0
        },
        {
            label: t("kpiOut"),
            value: totals.outOfStockVariants,
            hint: t("kpiOutHint"),
            icon: PackageX,
            href: inventoryDetailsHref({ stock: "out" }),
            alert: totals.outOfStockVariants > 0
        }
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
                <Link key={kpi.label} href={kpi.href} className="group rounded-xl focus-visible:outline-none">
                    <Card className="h-full transition-colors group-hover:bg-accent/50 group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
                        <CardContent className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                                <p
                                    className={cn(
                                        "text-2xl font-semibold tabular-nums",
                                        kpi.alert && "text-destructive"
                                    )}
                                >
                                    {formatCount(kpi.value)}
                                </p>
                                <p className="text-xs text-muted-foreground">{kpi.hint}</p>
                            </div>
                            <kpi.icon
                                aria-hidden
                                className={cn("size-5 text-muted-foreground", kpi.alert && "text-destructive")}
                            />
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
