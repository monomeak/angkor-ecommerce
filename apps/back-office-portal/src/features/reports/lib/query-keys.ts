import type { ReportParams } from "../types/report";

export const reportKeys = {
    all: ["reports"] as const,
    report: (params: ReportParams) => [...reportKeys.all, params.type, params.period] as const
};
