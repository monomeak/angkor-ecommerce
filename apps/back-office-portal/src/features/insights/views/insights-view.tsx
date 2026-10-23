"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReport } from "../../reports/hooks/use-report";
import { REPORT_PERIODS, type ReportPeriod } from "../../reports/types/report";
import { GenerateInsightsButton } from "../components/generate-insights-button";
import { InsightsPanel } from "../components/insights-panel";
import { useGenerateInsights } from "../hooks/use-generate-insights";
import { useTypewriterBuffer } from "../hooks/use-typewriter-butter";
import { toInsightsPayload } from "../lib/to-insights-payload";

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  this_month: "This month (to date)",
  last_3_months: "Last 3 months",
  last_6_months: "Last 6 months",
  last_12_months: "Last 12 months",
};

export function InsightsView() {
  const [period, setPeriod] = useState<ReportPeriod>("last_3_months");
  const locale = useLocale();

  /*
   * The same two reports the /reports page draws, so the AI can never comment on numbers that
   * differ from the ones the reader can see for themselves.
   */
  const { data: invoices, isLoading: invoicesLoading } = useReport({
    type: "invoices",
    period,
  });
  const { data: categories, isLoading: categoriesLoading } = useReport({
    type: "sales-by-category",
    period,
  });

  const { mutate, isPending, isError, error } = useGenerateInsights();
  const { displayedText, push, reset, isRevealing } = useTypewriterBuffer();

  const isStillTyping = isPending || isRevealing;
  const isDataReady =
    !invoicesLoading &&
    !categoriesLoading &&
    Boolean(invoices && categories) &&
    (categories?.rows.length ?? 0) > 0;

  const handleGenerate = () => {
    if (!invoices || !categories) return;

    reset();
    mutate({
      payload: toInsightsPayload({
        periodLabel: PERIOD_LABELS[period],
        locale,
        invoices,
        categories,
      }),
      onChunk: push,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold">AI Insights</CardTitle>
        <div className="flex items-center gap-2">
          <label htmlFor="insights-period">Target:</label>
          <Select
            value={period}
            disabled={isStillTyping}
            onValueChange={(value) => {
              setPeriod(value as ReportPeriod);
              reset();
            }}
          >
            <SelectTrigger
              id="insights-period"
              aria-label="Insight reporting period"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_PERIODS.map((value) => (
                <SelectItem key={value} value={value}>
                  {PERIOD_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <GenerateInsightsButton
            onGenerate={handleGenerate}
            isPending={isStillTyping}
            disabled={!isDataReady}
          />
        </div>
      </CardHeader>
      <CardContent>
        <InsightsPanel
          insight={displayedText}
          isPending={isStillTyping}
          isError={isError}
          error={error as Error | null}
        />
      </CardContent>
    </Card>
  );
}
