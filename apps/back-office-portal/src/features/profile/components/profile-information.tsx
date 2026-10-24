"use client";

import { Check, ShieldCheck, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FieldErrors, UseFormRegisterReturn, UseFormRegister } from "react-hook-form";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getRoleStyle } from "@/src/features/auth/lib/role-style";
import type { CurrentUser } from "@/src/features/auth/types/auth";

import type { ProfileFormValues } from "../schemas/profile.schema";

type ProfileInformationProps = {
  user: CurrentUser;
  register: UseFormRegister<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
  isDirty: boolean;
  isSaving: boolean;
  onDiscard: () => void;
};

export function ProfileInformation({
  user,
  register,
  errors,
  isDirty,
  isSaving,
  onDiscard,
}: ProfileInformationProps) {
  const t = useTranslations("Profile");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-4" />
            {t("personalTitle")}
          </CardTitle>
          <CardDescription>{t("personalDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField id="profile-username" label={t("username")} value={user.username} />
            <EditableField
              id="profile-first-name"
              label={t("firstName")}
              registration={register("firstName")}
              error={errors.firstName}
            />
            <EditableField
              id="profile-last-name"
              label={t("lastName")}
              registration={register("lastName")}
              error={errors.lastName}
            />
            <EditableField
              id="profile-email"
              label={t("email")}
              type="email"
              registration={register("email")}
              error={errors.email}
            />
            <EditableField
              id="profile-phone"
              label={t("phone")}
              type="tel"
              registration={register("phone")}
              error={errors.phone}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDiscard} disabled={!isDirty || isSaving}>
            <X className="size-4" />
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={!isDirty || isSaving}>
            <Check className="size-4" />
            {isSaving ? t("saving") : t("save")}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            {t("accessTitle")}
          </CardTitle>
          <CardDescription>{t("accessDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{t("roleManaged")}</p>
            <span className="w-fit rounded-md border bg-background px-2.5 py-1 text-xs font-medium uppercase text-muted-foreground">
              {getRoleStyle(user.role).label}
            </span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function EditableField({
  id,
  label,
  type = "text",
  registration,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  registration: UseFormRegisterReturn;
  error?: { message?: string };
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        aria-invalid={Boolean(error)}
        {...registration}
      />
      <FieldError errors={[error]} />
    </Field>
  );
}

function ReadOnlyField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={value} disabled className="disabled:cursor-default disabled:opacity-100" />
    </Field>
  );
}
