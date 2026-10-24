"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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

    const [isEditing, setIsEditing] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, dirtyFields, isSubmitting }
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: toProfileFormValues(user)
    });

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    const handleImageChange = (file: File | undefined) => {
        if (!file) return;

        // core-api checks this too (by magic bytes); catching it here saves an upload.
        if (!PROFILE_IMAGE_TYPES.includes(file.type) || file.size > PROFILE_IMAGE_MAX_BYTES) {
            toast.error(t("photoInvalid"));
            return;
        }

        // A data URL rather than an object URL: nothing to revoke, so no cleanup effect.
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            if (typeof reader.result === "string") {
                setImageFile(file);
                setImagePreview(reader.result);
            }
        });
        reader.readAsDataURL(file);
    };

    const cancelEditing = () => {
        reset();
        clearImage();
        setIsEditing(false);
    };

    const submit = handleSubmit(async (values) => {
        const payload = toUpdateProfilePayload(values, dirtyFields);

        try {
            if (Object.keys(payload).length > 0) {
                const saved = await updateProfile.mutateAsync(payload);
                // Reset before the upload so a failed photo doesn't re-send saved fields.
                reset(toProfileFormValues(saved));
            }

            if (imageFile) {
                await uploadImage.mutateAsync(imageFile);
                clearImage();
            }

            setIsEditing(false);
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
                imagePreview={imagePreview}
                isEditing={isEditing}
                isSaving={isSubmitting}
                onStartEditing={() => setIsEditing(true)}
                onCancel={cancelEditing}
                onImageChange={handleImageChange}
            />
            <ProfileInformation user={user} isEditing={isEditing} register={register} errors={errors} />
        </form>
    );
}
