"use client";

import { useState } from "react";
import { UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppConfig } from "@/components/providers/app-config-provider";
import { ApiError } from "@/lib/api-client";
import { resolveMediaUrl } from "@/lib/media";
import { getInitials } from "@/src/shared/lib/get-initial";

import { MemberStatusBadge } from "./member-status-badge";
import { canEditMember, assignableRoles } from "../lib/permissions";
import { useUpdateMemberRole } from "../hooks/use-update-member-role";
import { useRemoveMember } from "../hooks/use-remove-member";
import type { TeamMember } from "../types/team";
import type { AppRole } from "../../auth/types/auth";
import { getRoleStyle } from "../../auth/lib/role-style";

interface TeamTableProps {
  readonly members: TeamMember[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly actorRole: AppRole;
  readonly actorUserId: number;
}

type PendingRoleChange = { member: TeamMember; role: AppRole };

function errorMessage(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.displayMessage;
  return error instanceof Error ? error.message : undefined;
}

export function TeamTable({
  members,
  isLoading,
  isError,
  actorRole,
  actorUserId,
}: TeamTableProps) {
  const t = useTranslations("Team");
  const { mediaBaseUrl } = useAppConfig();
  const { mutate: updateRole, isPending: isUpdatingRole } = useUpdateMemberRole();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember();
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<TeamMember | null>(null);
  const assignable = assignableRoles(actorRole);
  const roleItems = assignable.map((role) => ({ value: role, label: getRoleStyle(role).label }));

  const confirmRoleChange = () => {
    if (!pendingRoleChange) return;
    const { member, role } = pendingRoleChange;

    updateRole(
      { id: member.id, role },
      {
        onSuccess: (updated) => {
          toast.success(t("roleChanged", { name: updated.fullName, role: getRoleStyle(updated.role).label }));
          setPendingRoleChange(null);
        },
        onError: (error) => toast.error(errorMessage(error) ?? t("roleChangeFailed")),
      },
    );
  };

  const confirmRemoval = () => {
    if (!memberPendingRemoval) return;

    removeMember(memberPendingRemoval.id, {
      onSuccess: (updated) => {
        toast.success(t("deactivated", { name: updated.fullName }));
        setMemberPendingRemoval(null);
      },
      onError: (error) => toast.error(errorMessage(error) ?? t("deactivateFailed")),
    });
  };

  const message = isLoading ? t("loading") : isError ? t("loadError") : members.length === 0 ? t("empty") : null;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("member")}</TableHead>
            <TableHead>{t("role")}</TableHead>
            <TableHead>{t("status")}</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {message && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                {message}
              </TableCell>
            </TableRow>
          )}

          {!isLoading && members.map((mem) => {
            const canEdit = canEditMember(actorRole, actorUserId, mem);

            return (
              <TableRow key={mem.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarImage
                        src={resolveMediaUrl(mediaBaseUrl, mem.image)}
                        alt={mem.fullName}
                      ></AvatarImage>

                      <AvatarFallback>
                        {getInitials(mem.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {mem.fullName}
                        {mem.id === actorUserId && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            ({t("you")})
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{mem.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canEdit && assignable.includes(mem.role) ? (
                    <Select
                      items={roleItems}
                      // Stays on the saved role: the pick only becomes real once confirmed.
                      value={mem.role}
                      onValueChange={(value) => {
                        if (value && value !== mem.role) {
                          setPendingRoleChange({ member: mem, role: value as AppRole });
                        }
                      }}
                    >
                      <SelectTrigger className="w-[140px]" aria-label={t("changeRoleFor", { name: mem.fullName })}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleStyle(mem.role).badgeClassName}`}
                    >
                      {getRoleStyle(mem.role).label}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <MemberStatusBadge status={mem.status} />
                </TableCell>
                <TableCell>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("deactivateFor", { name: mem.fullName })}
                      onClick={() => setMemberPendingRemoval(mem)}
                    >
                      <UserX className="size-4 text-muted-foreground" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={pendingRoleChange !== null}
        onOpenChange={(open) => !open && !isUpdatingRole && setPendingRoleChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("changeRoleTitle", { name: pendingRoleChange?.member.fullName ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRoleChange &&
                t("changeRoleBody", {
                  name: pendingRoleChange.member.fullName,
                  from: getRoleStyle(pendingRoleChange.member.role).label,
                  to: getRoleStyle(pendingRoleChange.role).label,
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingRole}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={isUpdatingRole} onClick={confirmRoleChange}>
              {isUpdatingRole ? t("saving") : t("changeRoleConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={memberPendingRemoval !== null}
        onOpenChange={(open) => !open && !isRemoving && setMemberPendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deactivateTitle", { name: memberPendingRemoval?.fullName ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("deactivateBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isRemoving} onClick={confirmRemoval}>
              {isRemoving ? t("saving") : t("deactivateConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
