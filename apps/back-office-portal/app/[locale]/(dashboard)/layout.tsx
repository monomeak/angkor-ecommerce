"use client";
import { ReactNode } from "react";
import AppSidebar from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import DashboardHeader from "@/components/layout/dashboard-header";
import { useCurrentUser } from "@/src/features/auth/hooks/use-current-user";
import { useAppConfig } from "@/components/providers/app-config-provider";
import { resolveMediaUrl } from "@/lib/media";

type DashboardLayoutProps = {
  readonly children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // const { formProfile } = useProfile();
  const { data: currentProfile } = useCurrentUser();
  const { mediaBaseUrl } = useAppConfig();
  return (
    <SidebarProvider>
      <AppSidebar></AppSidebar>
      <SidebarInset>
        <DashboardHeader
          // core-api hands back a raw MinIO object key, not a URL.
          profilePath={resolveMediaUrl(mediaBaseUrl, currentProfile?.image)}
          userName={currentProfile?.firstName}
          userInitials={
            currentProfile
              ? `${currentProfile.firstName[0] ?? ""}${currentProfile.lastName[0] ?? ""}` ||
                currentProfile.username[0]
              : undefined
          }
        ></DashboardHeader>
        <main className="flex-1 px-4 py-4 md:p-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
