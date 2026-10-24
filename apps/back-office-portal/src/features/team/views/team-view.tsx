"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "../../auth/hooks/use-current-user";
import { AddMemberDialog } from "../components/add-member-dialog";
import { useTeam } from "../hooks/use-team";
import { canManageTeam } from "../lib/permissions";
import { TeamTable } from "../components/team-table";

export function TeamView() {
  const t = useTranslations("Team");
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const canManage = Boolean(currentUser && canManageTeam(currentUser.role));
  const team = useTeam(canManage);

  if (userLoading) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }
  if (!currentUser || !canManage) {
    return <p className="text-sm text-muted-foreground">{t("noAccess")}</p>;
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <AddMemberDialog actorRole={currentUser.role}></AddMemberDialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <TeamTable
            members={team.data ?? []}
            isLoading={team.isLoading}
            isError={team.isError}
            actorRole={currentUser.role}
            actorUserId={currentUser.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
