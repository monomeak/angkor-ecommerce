"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/src/features/auth/hooks/use-current-user";
import type { CurrentUser } from "@/src/features/auth/types/auth";
import { applyServerErrors } from "@/src/features/catalog/products/lib/apply-server-errors";

import { useUpdateProfile, useUploadProfileImage } from "../hooks/use-profile";
import { toProfileFormValues, toUpdateProfilePayload } from "../mappers/profile.mapper";
import {
    PROFILE_IMAGE_MAX_BYTES,
    PROFILE_IMAGE_TYPES,
    profileFormSchema,
    type ProfileFormValues
} from "../schemas/profile.schema";
import { ProfileHeader } from "./profile-header";
import { ProfileInformation } from "./profile-information";

export function ProfileForm() {
    const t = useTranslations("Profile");
    const { data: currentUser, isPending } = useCurrentUser();

    if (isPending) {
        return <Skeleton className="h-96 w-full rounded-lg" />;
    }

    if (!currentUser) {
        return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
    }

    // Keyed so switching accounts starts from that account's values, not the last draft.
    return <ProfileEditor key={currentUser.id} user={currentUser} />;
}

function ProfileEditor({ user }: { user: CurrentUser }) {
    const t = useTranslations("Profile");
    const updateProfile = useUpdateProfile();
    const uploadImage = useUploadProfileImage();

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, dirtyFields, isDirty, isSubmitting }
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: toProfileFormValues(user)
    });

    // The photo has its own endpoint, so it saves on pick rather than waiting for the form.
    const handleImageChange = async (file: File | undefined) => {
        if (!file) return;

        // core-api checks this too (by magic bytes); catching it here saves an upload.
        if (!PROFILE_IMAGE_TYPES.includes(file.type) || file.size > PROFILE_IMAGE_MAX_BYTES) {
            toast.error(t("photoInvalid"));
            return;
        }

        try {
            await uploadImage.mutateAsync(file);
            toast.success(t("photoUpdated"));
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("photoUploadFailed"));
        }
    };

    const submit = handleSubmit(async (values) => {
        const payload = toUpdateProfilePayload(values, dirtyFields);

        if (Object.keys(payload).length === 0) return;

        try {
            const saved = await updateProfile.mutateAsync(payload);
            reset(toProfileFormValues(saved));
            toast.success(t("saved"));
        } catch (error) {
            const message = applyServerErrors(error, setError);
            if (message) toast.error(message);
        }
    });

    return (
        <form onSubmit={submit} noValidate className="w-full space-y-6">
            <ProfileHeader
                user={user}
                isUploadingImage={uploadImage.isPending}
                onImageChange={handleImageChange}
            />
            <ProfileInformation
                user={user}
                register={register}
                errors={errors}
                isDirty={isDirty}
                isSaving={isSubmitting}
                onDiscard={() => reset()}
            />
        </form>
    );
}
