"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inventoryDetailsHref } from "../lib/search-params";
import type { CategoryStock } from "../types/inventory";

/** One row per leaf category, grouped under its parent. Products themselves live on the details page. */
export function CategoryStockTable({ categories }: { readonly categories: CategoryStock[] }) {
    const t = useTranslations("Inventory");

    // The API returns rows already ordered parent by parent, so grouping only has to watch for a change.
    const groups: { parent: string | null; rows: CategoryStock[] }[] = [];
    for (const category of categories) {
        const last = groups.at(-1);
        if (last && last.parent === category.parentName) last.rows.push(category);
        else groups.push({ parent: category.parentName, rows: [category] });
    }

    return (
        <div className="overflow-x-auto rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("colCategory")}</TableHead>
                        <TableHead className="text-right">{t("colProducts")}</TableHead>
                        <TableHead className="text-right">{t("colUnits")}</TableHead>
                        <TableHead>{t("colAttention")}</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groups.map((group) => (
                        <Fragment key={group.parent ?? "top-level"}>
                            {group.parent && (
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableCell colSpan={5} className="py-1.5 text-xs font-medium text-muted-foreground">
                                        {group.parent}
                                    </TableCell>
                                </TableRow>
                            )}
                            {group.rows.map((category) => {
                                const href = inventoryDetailsHref({ categoryId: category.categoryId });

                                return (
                                    <TableRow key={category.categoryId}>
                                        <TableCell className="font-medium">
                                            <Link href={href} className="hover:underline">
                                                {category.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">{category.products}</TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {category.unitsInStock}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1.5">
                                                {category.outOfStockVariants > 0 && (
                                                    <Badge variant="destructive">
                                                        {t("outBadge", { count: category.outOfStockVariants })}
                                                    </Badge>
                                                )}
                                                {category.lowStockVariants > 0 && (
                                                    <Badge variant="secondary">
                                                        {t("lowBadge", { count: category.lowStockVariants })}
                                                    </Badge>
                                                )}
                                                {category.products === 0 ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        {t("emptyCategory")}
                                                    </span>
                                                ) : (
                                                    category.productsNeedingAttention === 0 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {t("allStocked")}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={href}
                                                aria-label={t("viewCategory", { name: category.label })}
                                                className="inline-flex text-muted-foreground hover:text-foreground"
                                            >
                                                <ChevronRight className="size-4" />
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
