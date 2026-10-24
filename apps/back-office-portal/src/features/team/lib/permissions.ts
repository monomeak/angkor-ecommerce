import { ROLE } from "@/src/shared/role.type";
import { getRoleRank } from "../../auth/lib/role-hierarchy";
import { AppRole } from "../../auth/types/auth";
import { TeamMember } from "../types/team";
export function canManageTeam(actorRole: AppRole): boolean {
  return actorRole === ROLE.SUPER_ADMIN || actorRole === ROLE.SHOP_ADMIN;
}

export function canEditMember(
  actorRole: AppRole,
  actorUserId: number,
  target: TeamMember,
): boolean {
  if (!canManageTeam(actorRole)) return false;
  if (actorUserId === target.id) return false; // his / him self edit
  if (target.status !== "active") return false;

  return getRoleRank(actorRole) >= getRoleRank(target.role);
}

// assignable role
export function assignableRoles(actorRole: AppRole): AppRole[] {
  if (actorRole === ROLE.SUPER_ADMIN || actorRole === ROLE.SHOP_ADMIN) {
    return [ROLE.SHOP_ADMIN, ROLE.STAFF];
  }

  return [];
}
