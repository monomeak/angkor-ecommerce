import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppConfig } from "@/components/providers/app-config-provider";

import { updateTeamMemberRole } from "../api/team-api";
import { teamKeys } from "../lib/query-keys";
import type { AppRole } from "../../auth/types/auth";
import type { TeamMember } from "../types/team";

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { apiBaseUrl } = useAppConfig();

  return useMutation<TeamMember, unknown, { id: number; role: AppRole }>({
    mutationFn: ({ id, role }) => updateTeamMemberRole(apiBaseUrl, id, role),
    onSuccess: (updated) => {
      queryClient.setQueryData<TeamMember[]>(teamKeys.roster(), (old) =>
        old?.map((member) => (member.id === updated.id ? updated : member)),
      );
    },
  });
}
