"use client";
import { useLocale, useTranslations } from "next-intl";
import { SidebarTrigger } from "../ui/sidebar";
import { Button } from "../ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, usePathname, useRouter } from "@/app/i18n/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { PageBreadcrumbs } from "@/components/layout/page-breadcrumbs";
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs";
import { ThemeSwitcher } from "@/lib/theme-switcher";
import type { Locale } from "@/app/i18n/routing";
import { cn } from "@/lib/utils";
type dashboardHeaderProps = {
  readonly profilePath?: string;
  readonly userName?: string;
  readonly userInitials?: string;
};

export default function DashboardHeader({
  profilePath,
  userName,
  userInitials,
}: dashboardHeaderProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Language");
  const pageTitle = usePageTitle();
  // More than one crumb means a nested route, where the breadcrumb is the better label.
  const isNested = useBreadcrumbs().length > 1;
  const currentLocaleFlag = locale === "en" ? "fi-gb " : "fi-kh ";
  const currentLocaleText = locale === "en" ? t("english") : t("khmer");

  function changeLocale(nextLocale: Locale) {
    router.replace(pathname, { locale: nextLocale });
  }
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <SidebarTrigger></SidebarTrigger>

      <div className="relative hidden min-w-0 flex-1 overflow-hidden md:block">
        {/*
          * Title and breadcrumb are alternatives, not a stack. On a top-level page the
          * breadcrumb would be a single crumb repeating the title; on a nested page the
          * breadcrumb already ends with the current page, so the h1 repeats its last
          * segment. Showing whichever one carries more information keeps the header to
          * one line either way.
          */}
        {isNested ? (
          <PageBreadcrumbs />
        ) : (
          <h1
            key={pageTitle}
            className={cn(
              "animate-in fade-in slide-in-from-bottom-2 font-heading font-medium",
              "text-foreground duration-300 ease-out motion-reduce:animate-none",
              locale === "km"
                ? "py-1 text-lg leading-relaxed tracking-normal sm:text-xl"
                : "text-xl leading-none tracking-[-0.025em] sm:text-2xl",
            )}
          >
            {pageTitle}
          </h1>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" aria-label={t("changeLanguage")}></Button>
            }
            className="flex gap-2"
          >
            <span
              className={`fi ${currentLocaleFlag}`}
              aria-hidden="true"
            ></span>
            <span>{currentLocaleText}</span>
          </DropdownMenuTrigger>
          {/* Dropdown content here */}

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="gap-3"
              onClick={() => changeLocale("en")}
            >
              <span className="fi fi-gb " aria-hidden="true"></span>
              <span className="text-muted-foreground">{t("english")}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-3"
              onClick={() => changeLocale("km")}
            >
              <span className="fi fi-kh" aria-hidden="true"></span>
              <span className="text-muted-foreground">{t("khmer")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link
          href={"/settings/profile"}
          className="ml-auto flex items-center gap-2"
        >
          <AvatarDemo
            profilePath={profilePath}
            userName={userName}
            userInitials={userInitials}
          />
          {userName}
        </Link>
      </div>
    </header>
  );
}

export function AvatarDemo({
  profilePath,
  userName,
  userInitials,
}: dashboardHeaderProps) {
  return (
    <Avatar className="cursor-pointer">
      <AvatarImage src={profilePath} alt={userName ?? ""} />
      <AvatarFallback>{userInitials?.toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
