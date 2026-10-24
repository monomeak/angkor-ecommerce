import { apiFetch, parseResponse } from "@/lib/api-client";
import type { AppRole } from "@/src/features/auth/types/auth";

import { mapToTeamMember } from "../mappers/team.mapper";
import { teamMemberDtoSchema, teamMemberListDtoSchema } from "../schemas/team-api.schema";
import type { CreateMemberPayload, TeamMember } from "../types/team";

const USERS_BASE = "/users";

/** core-api caps a page at 100. A shop's staff list fits in one, so there is no pager. */
const ROSTER_LIMIT = 100;

export async function fetchTeamMembers(apiBaseUrl: string): Promise<TeamMember[]> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${USERS_BASE}?limit=${ROSTER_LIMIT}`);
    return parseResponse(teamMemberListDtoSchema, data).users.map(mapToTeamMember);
}

export async function createTeamMember(apiBaseUrl: string, payload: CreateMemberPayload): Promise<TeamMember> {
    const data = await apiFetch<unknown>(apiBaseUrl, USERS_BASE, {
        method: "POST",
        body: JSON.stringify(payload)
    });
    return mapToTeamMember(parseResponse(teamMemberDtoSchema, data));
}

export async function updateTeamMemberRole(apiBaseUrl: string, id: number, role: AppRole): Promise<TeamMember> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${USERS_BASE}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role })
    });
    return mapToTeamMember(parseResponse(teamMemberDtoSchema, data));
}

/** Soft delete: core-api sets the account INACTIVE, which blocks login and token refresh. */
export async function deactivateTeamMember(apiBaseUrl: string, id: number): Promise<TeamMember> {
    const data = await apiFetch<unknown>(apiBaseUrl, `${USERS_BASE}/archive/${id}`, { method: "PATCH" });
    return mapToTeamMember(parseResponse(teamMemberDtoSchema, data));
}
