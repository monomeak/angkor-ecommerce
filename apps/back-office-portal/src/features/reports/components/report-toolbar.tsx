"use client";

import { useTranslations } from "next-intl";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { downloadCsv } from "@/src/shared/lib/csv-export";
import { useReportPdf } from "../hooks/use-report-pdf";
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

    const pdf = useReportPdf();

    const handlePdf = () => {
        pdf.mutate(params, {
            onError: (error) => toast.error(error instanceof ApiError ? error.displayMessage : t("pdfError"))
        });
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="report-type">{t("reportType")}</Label>
                    <Select
                        items={REPORT_TYPES.map((type) => ({ value: type, label: t(`type.${type}`) }))}
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
                        items={REPORT_PERIODS.map((period) => ({ value: period, label: t(`periodOption.${period}`) }))}
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

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleExport}
                    disabled={!report || report.rows.length === 0}
                >
                    <Download className="size-3.5" />
                    {t("exportCsv")}
                </Button>

                {/* Disabled while in flight: a Chrome render takes a few hundred ms, and a double-click renders twice. */}
                <Button variant="outline" className="gap-1.5" onClick={handlePdf} disabled={!report || pdf.isPending}>
                    {pdf.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />}
                    {pdf.isPending ? t("pdfPending") : t("exportPdf")}
                </Button>
            </div>
        </div>
    );
}
