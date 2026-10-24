"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { MemberStatusBadge } from "./member-status-badge";
import { canEditMember, assignableRoles } from "../lib/permissions";
import { useUpdateMemberRole } from "../hooks/use-update-member-role";
import { useRemoveMember } from "../hooks/use-remove-member";
import type { TeamMember } from "../types/team";
import { AppRole } from "../../auth/types/auth";
import { getInitials } from "@/src/shared/lib/get-initial";
import { getRoleStyle } from "../../auth/lib/role-style";

interface TeamTableProps {
  readonly members: TeamMember[];
  readonly isLoading: boolean;
  readonly actorRole: AppRole;
  readonly actorUserId: number;
}

export function TeamTable({
  members,
  isLoading,
  actorRole,
  actorUserId,
}: TeamTableProps) {
  const { mutate: updateRole } = useUpdateMemberRole();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember();
  const [memberPendingmRemoval, setMemberPendingRemoveal] =
    useState<TeamMember | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                Loading team...
              </TableCell>
            </TableRow>
          )}

          {!isLoading && members.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                No team members yet.
              </TableCell>
            </TableRow>
          )}

          {members.map((mem) => {
            const canEdit = canEditMember(actorRole, actorUserId, mem);
            const assignable = assignableRoles(actorRole);

            return (
              <TableRow key={mem.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarImage
                        src={mem.avatarUrl}
                        alt={mem.fullName}
                      ></AvatarImage>

                      <AvatarFallback>
                        {getInitials(mem.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    {mem.fullName}
                  </div>
                </TableCell>
                <TableCell>
                  {canEdit && assignable.includes(mem.role) ? (
                    <Select
                      items={assignable.map((r) => ({ value: r, label: getRoleStyle(r).label }))}
                      value={mem.role}
                      onValueChange={(value) =>
                        updateRole({ id: mem.id, role: value as AppRole })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assignable.map((r) => (
                          <SelectItem key={r} value={r}>
                            {getRoleStyle(r).label}
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
                      aria-label={`Remove ${mem.fullName}`}
                      onClick={() => setMemberPendingRemoveal(mem)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={memberPendingmRemoval !== null}
        onOpenChange={(open) => !open && setMemberPendingRemoveal(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {memberPendingmRemoval?.fullName}
            </AlertDialogTitle>
            <AlertDialogDescription>
              They'll immediately lose access to this dashboard. This can't be
              undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              onClick={() => {
                if (memberPendingmRemoval)
                  removeMember(memberPendingmRemoval.id);
                setMemberPendingRemoveal(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
