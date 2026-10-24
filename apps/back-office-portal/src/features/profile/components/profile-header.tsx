"use client";

import { Loader2, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAppConfig } from "@/components/providers/app-config-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveMediaUrl } from "@/lib/media";
import { getRoleStyle } from "@/src/features/auth/lib/role-style";
import type { CurrentUser } from "@/src/features/auth/types/auth";

import { PROFILE_IMAGE_TYPES } from "../schemas/profile.schema";

type ProfileHeaderProps = {
  user: CurrentUser;
  isUploadingImage: boolean;
  onImageChange: (file: File | undefined) => void;
};

export function ProfileHeader({
  user,
  isUploadingImage,
  onImageChange,
}: ProfileHeaderProps) {
  const t = useTranslations("Profile");
  const { mediaBaseUrl } = useAppConfig();
  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.username;
  const profileInitials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const role = getRoleStyle(user.role);

  return (
    <section className="flex items-center gap-4 rounded-lg border bg-card p-5 text-card-foreground">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative shrink-0">
          <Label
            htmlFor="profile-image"
            title={t("photoHint")}
            className="group relative block cursor-pointer rounded-full focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          >
            <span className="sr-only">{t("changePhoto")}</span>
            <Avatar className="size-16" size="lg">
              <AvatarImage src={resolveMediaUrl(mediaBaseUrl, user.image)} alt={fullName} />
              <AvatarFallback>{profileInitials || "U"}</AvatarFallback>
            </Avatar>

            <span
              aria-hidden="true"
              className={`absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity ${
                isUploadingImage
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              }`}
            >
              {isUploadingImage ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Pencil className="size-5" />
              )}
            </span>
          </Label>
          <Input
            id="profile-image"
            type="file"
            accept={PROFILE_IMAGE_TYPES.join(",")}
            disabled={isUploadingImage}
            className="sr-only"
            onChange={(event) => {
              onImageChange(event.target.files?.[0]);
              // Let the same file be picked again after a failed upload.
              event.target.value = "";
            }}
          />
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-semibold">{fullName}</h2>
            <span className={`rounded-md px-2 py-1 text-xs font-medium uppercase ${role.badgeClassName}`}>
              {role.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
        </div>
      </div>
    </section>
  );
}
