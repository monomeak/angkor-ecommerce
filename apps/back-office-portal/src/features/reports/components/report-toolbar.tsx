"use client";

import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadCsv } from "@/src/shared/lib/csv-export";
import { reportCsvFilename, toReportCsv } from "../lib/report-csv";
import { REPORT_PERIODS, REPORT_TYPES, type Report, type ReportParams } from "../types/report";

/**
 * One period control for the whole screen, sitting above both the table and the export, so the
 * file can never cover a different range than the numbers the reader is looking at.
 */
type ReportToolbarProps = {
    readonly params: ReportParams;
    readonly report: Report | undefined;
    readonly onChange: (patch: Partial<ReportParams>) => void;
};

export function ReportToolbar({ params, report, onChange }: ReportToolbarProps) {
    const t = useTranslations("Reports");

    const handleExport = () => {
        if (!report) return;
        downloadCsv(reportCsvFilename(report), toReportCsv(report));
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="report-type">{t("reportType")}</Label>
                    <Select
                        value={params.type}
                        onValueChange={(value) => onChange({ type: value as ReportParams["type"] })}
                    >
                        <SelectTrigger id="report-type" className="w-full sm:w-56">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {REPORT_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {t(`type.${type}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="report-period">{t("period")}</Label>
                    <Select
                        value={params.period}
                        onValueChange={(value) => onChange({ period: value as ReportParams["period"] })}
                    >
                        <SelectTrigger id="report-period" className="w-full sm:w-56">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {REPORT_PERIODS.map((period) => (
                                <SelectItem key={period} value={period}>
                                    {t(`periodOption.${period}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button
                variant="outline"
                className="gap-1.5"
                onClick={handleExport}
                disabled={!report || report.rows.length === 0}
            >
                <Download className="size-3.5" />
                {t("exportCsv")}
            </Button>
        </div>
    );
}
