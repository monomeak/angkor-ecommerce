import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppConfig } from "@/components/providers/app-config-provider";

import { deactivateTeamMember } from "../api/team-api";
import { teamKeys } from "../lib/query-keys";
import type { TeamMember } from "../types/team";

/** Deactivates rather than deletes, so the row stays and its status flips. */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { apiBaseUrl } = useAppConfig();

  return useMutation<TeamMember, unknown, number>({
    mutationFn: (id) => deactivateTeamMember(apiBaseUrl, id),
    onSuccess: (updated) => {
      queryClient.setQueryData<TeamMember[]>(teamKeys.roster(), (old) =>
        old?.map((member) => (member.id === updated.id ? updated : member)),
      );
    },
  });
}
