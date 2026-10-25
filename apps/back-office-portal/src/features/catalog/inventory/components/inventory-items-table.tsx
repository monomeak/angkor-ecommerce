"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAppConfig } from "@/components/providers/app-config-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { ProductStatusBadge } from "../../products/components/product-status-badge";
import { stockLevel } from "../lib/stock-level";
import type { InventoryItem } from "../types/inventory";
import { VariantStockChips } from "./variant-stock-chips";

type InventoryItemsTableProps = {
    readonly items: InventoryItem[];
    readonly threshold: number;
    readonly isLoading: boolean;
    readonly isFetching: boolean;
};

export function InventoryItemsTable({ items, threshold, isLoading, isFetching }: InventoryItemsTableProps) {
    const t = useTranslations("Inventory");
    const { mediaBaseUrl } = useAppConfig();

    return (
        <div className={cn("overflow-x-auto rounded-md border", isFetching && !isLoading && "opacity-60")}>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("colProduct")}</TableHead>
                        <TableHead>{t("colCategory")}</TableHead>
                        <TableHead>{t("colVariants")}</TableHead>
                        <TableHead className="text-right">{t("colTotal")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading
                        ? Array.from({ length: 8 }).map((_, index) => (
                              <TableRow key={index}>
                                  <TableCell>
                                      <div className="flex items-center gap-3">
                                          <Skeleton className="size-9 rounded" />
                                          <Skeleton className="h-4 w-40" />
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      <Skeleton className="h-4 w-28" />
                                  </TableCell>
                                  <TableCell>
                                      <Skeleton className="h-5 w-48" />
                                  </TableCell>
                                  <TableCell>
                                      <Skeleton className="ml-auto h-4 w-10" />
                                  </TableCell>
                              </TableRow>
                          ))
                        : items.map((item) => {
                              const url = resolveMediaUrl(mediaBaseUrl, item.thumbnail);
                              const lowest = Math.min(...item.variants.map((variant) => variant.stock));
                              const flagged = item.variants.length > 0 && stockLevel(lowest, threshold) !== "ok";

                              return (
                                  <TableRow key={item.productId}>
                                      <TableCell>
                                          <Link
                                              href={`/catalog/products/${item.productId}/edit`}
                                              className="flex items-center gap-3 hover:underline"
                                          >
                                              <span className="relative size-9 shrink-0 overflow-hidden rounded bg-muted">
                                                  {url ? (
                                                      <Image
                                                          src={url}
                                                          alt=""
                                                          fill
                                                          sizes="36px"
                                                          className="object-cover"
                                                          unoptimized
                                                      />
                                                  ) : (
                                                      <span className="flex size-full items-center justify-center text-muted-foreground">
                                                          <ImageOff className="size-4" />
                                                      </span>
                                                  )}
                                              </span>
                                              <span className="font-medium">{item.name}</span>
                                          </Link>
                                          {item.status !== "active" && (
                                              <div className="mt-1 pl-12">
                                                  <ProductStatusBadge status={item.status} />
                                              </div>
                                          )}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                          {item.categoryLabel}
                                      </TableCell>
                                      <TableCell>
                                          <VariantStockChips variants={item.variants} threshold={threshold} />
                                      </TableCell>
                                      <TableCell
                                          className={cn(
                                              "text-right tabular-nums",
                                              flagged && "font-medium text-destructive"
                                          )}
                                      >
                                          {item.totalStock}
                                      </TableCell>
                                  </TableRow>
                              );
                          })}
                </TableBody>
            </Table>
        </div>
    );
}
