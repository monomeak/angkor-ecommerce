import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { AccountStatus } from "../../auth/types/auth";

const STATUS_STYLES: Record<AccountStatus, string> = {
  active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  inactive:
    "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  deleted: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

export function MemberStatusBadge({ status }: { status: AccountStatus }) {
  const t = useTranslations("Team");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {t(`status_${status}`)}
    </span>
  );
}
