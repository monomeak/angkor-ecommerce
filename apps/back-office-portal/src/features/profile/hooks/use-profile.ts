"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppConfig } from "@/components/providers/app-config-provider";
import { authKeys } from "@/src/features/auth/lib/query-keys";
import type { CurrentUser } from "@/src/features/auth/types/auth";

import { updateProfile, uploadProfileImage } from "../api/profile-api";
import type { UpdateProfilePayload } from "../types/profile";

/*
 * The profile *is* the current user, so there is no profile query: both mutations write
 * their response straight into the /auth/me cache, which also updates the sidebar avatar
 * and name without a refetch.
 */

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const { apiBaseUrl } = useAppConfig();

    return useMutation<CurrentUser, unknown, UpdateProfilePayload>({
        mutationFn: (payload) => updateProfile(apiBaseUrl, payload),
        onSuccess: (user) => queryClient.setQueryData(authKeys.currentUser(), user)
    });
}

export function useUploadProfileImage() {
    const queryClient = useQueryClient();
    const { apiBaseUrl } = useAppConfig();

    return useMutation<CurrentUser, unknown, File>({
        mutationFn: (file) => uploadProfileImage(apiBaseUrl, file),
        onSuccess: (user) => queryClient.setQueryData(authKeys.currentUser(), user)
    });
}
