"use client";

import type { ComponentType } from "react";
import { Check, Mail, Pencil, Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAppConfig } from "@/components/providers/app-config-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveMediaUrl } from "@/lib/media";
import { getRoleStyle } from "@/src/features/auth/lib/role-style";
import type { CurrentUser } from "@/src/features/auth/types/auth";

import { PROFILE_IMAGE_TYPES } from "../schemas/profile.schema";

type ProfileHeaderProps = {
  user: CurrentUser;
  /** Data URL of a photo picked but not yet uploaded. */
  imagePreview: string | null;
  isEditing: boolean;
  isSaving: boolean;
  onStartEditing: () => void;
  onCancel: () => void;
  onImageChange: (file: File | undefined) => void;
};

export function ProfileHeader({
  user,
  imagePreview,
  isEditing,
  isSaving,
  onStartEditing,
  onCancel,
  onImageChange,
}: ProfileHeaderProps) {
  const t = useTranslations("Profile");
  const { mediaBaseUrl } = useAppConfig();
  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.username;
  const profileInitials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;
  const role = getRoleStyle(user.role);

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-5 text-card-foreground md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative shrink-0">
          <Label
            htmlFor="profile-image"
            aria-label={t("changePhoto")}
            className={
              isEditing
                ? "block cursor-pointer rounded-full focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                : "block"
            }
          >
            <Avatar className="size-16" size="lg">
              <AvatarImage
                src={imagePreview ?? resolveMediaUrl(mediaBaseUrl, user.image)}
                alt={fullName}
              />
              <AvatarFallback>{profileInitials || "U"}</AvatarFallback>
            </Avatar>

            {isEditing && (
              <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full border bg-background text-foreground shadow-sm">
                <Pencil className="size-3.5" />
              </span>
            )}
          </Label>
          <Input
            id="profile-image"
            type="file"
            accept={PROFILE_IMAGE_TYPES.join(",")}
            disabled={!isEditing || isSaving}
            className="sr-only"
            onChange={(event) => {
              onImageChange(event.target.files?.[0]);
              // Let the same file be picked again after a cancel.
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
          <p className="text-sm text-muted-foreground">
            {isEditing ? t("photoHint") : `@${user.username}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 md:grid-cols-1">
          <ProfileLine icon={Mail} value={user.email} />
          <ProfileLine icon={Phone} value={user.phone || t("noPhone")} />
        </div>

        <div className="flex gap-2 md:justify-end">
          {isEditing ? (
            <>
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                <X className="size-4" />
                {t("cancel")}
              </Button>
              <Button key="save" type="submit" disabled={isSaving}>
                <Check className="size-4" />
                {isSaving ? t("saving") : t("save")}
              </Button>
            </>
          ) : (
            // Keyed apart from Save: reusing one DOM node would let the click that enters
            // edit mode land on a button that has just become type="submit".
            <Button key="edit" type="button" variant="outline" onClick={onStartEditing}>
              <Pencil className="size-4" />
              {t("editProfile")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function ProfileLine({
  icon: Icon,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}
