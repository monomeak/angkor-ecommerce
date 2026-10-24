"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "../lib/constants";

type ProductPaginationProps = {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly onPageChange: (page: number) => void;
    readonly onLimitChange: (limit: number) => void;
};

export function ProductPagination({ page, limit, total, onPageChange, onLimitChange }: ProductPaginationProps) {
    const t = useTranslations("Catalog");
    const pageCount = Math.max(1, Math.ceil(total / limit));
    const firstRow = total === 0 ? 0 : (page - 1) * limit + 1;
    const lastRow = Math.min(page * limit, total);

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-sm" aria-live="polite">
                {total === 0 ? t("noProducts") : t("showingRange", { from: firstRow, to: lastRow, total })}
            </p>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Label htmlFor="page-size" className="text-muted-foreground text-sm whitespace-nowrap">
                        {t("rowsPerPage")}
                    </Label>
                    <Select
                        items={PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) }))}
                        value={String(limit)}
                        onValueChange={(value) => onLimitChange(Number(value))}>
                        <SelectTrigger id="page-size" className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">{t("pageOf", { page, total: pageCount })}</span>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Previous page"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Next page"
                        disabled={page >= pageCount}
                        onClick={() => onPageChange(page + 1)}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
