"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import { ReportTable } from "../components/report-table";
import { ReportToolbar } from "../components/report-toolbar";
import { useReport } from "../hooks/use-report";
import { useReportParams } from "../hooks/use-report-params";

export function ReportsView() {
    const t = useTranslations("Reports");
    const { params, setParams } = useReportParams();
    const { data: report, isPending, isError, error, isFetching, refetch } = useReport(params);

    if (isError) {
        const isForbidden = error instanceof ApiError && (error.status === 401 || error.status === 403);

        return (
            <div className="space-y-3">
                <p className="text-sm text-destructive">{isForbidden ? t("forbidden") : t("error")}</p>
                <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
                    {isFetching ? t("loading") : t("retry")}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ReportToolbar params={params} report={report} onChange={setParams} />

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">
                        {report ? report.title : t(`type.${params.type}`)}
                    </CardTitle>
                    {report && (
                        <p className="text-sm text-muted-foreground">
                            {t("subtitle", {
                                start: formatDate(report.startDate),
                                end: formatDate(report.endDate),
                                currency: report.currency
                            })}
                        </p>
                    )}
                </CardHeader>

                <CardContent className="p-0">
                    {isPending ? (
                        <ReportSkeleton />
                    ) : (
                        <ReportTable
                            report={report}
                            /*
                             * Naming the resolved range matters: "no data yet" reads like the app
                             * is broken, when the honest answer is that nothing was paid in the
                             * months the reader happens to be looking at.
                             */
                            emptyMessage={t("empty", {
                                start: formatDate(report.startDate),
                                end: formatDate(report.endDate)
                            })}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

/** Mirrors the table's shape so the card doesn't resize when the numbers land. */
function ReportSkeleton() {
    return (
        <div className="space-y-3 px-6 py-4">
            {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-full" />
            ))}
        </div>
    );
}
