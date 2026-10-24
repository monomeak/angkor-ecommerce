import { useQuery } from "@tanstack/react-query";

import { useAppConfig } from "@/components/providers/app-config-provider";

import { fetchTeamMembers } from "../api/team-api";
import { teamKeys } from "../lib/query-keys";

/** `enabled` is false for staff: GET /users is admin-only and would just 403. */
export function useTeam(enabled: boolean) {
  const { apiBaseUrl } = useAppConfig();

  return useQuery({
    queryKey: teamKeys.roster(),
    queryFn: () => fetchTeamMembers(apiBaseUrl),
    staleTime: 60 * 1000,
    enabled,
  });
}
