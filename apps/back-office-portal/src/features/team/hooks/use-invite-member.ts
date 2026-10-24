import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppConfig } from "@/components/providers/app-config-provider";

import { createTeamMember } from "../api/team-api";
import { teamKeys } from "../lib/query-keys";
import type { CreateMemberPayload, TeamMember } from "../types/team";

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { apiBaseUrl } = useAppConfig();

  return useMutation<TeamMember, unknown, CreateMemberPayload>({
    mutationFn: (payload) => createTeamMember(apiBaseUrl, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamKeys.all }),
  });
}
