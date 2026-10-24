"use client";

import { ShieldCheck, User } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FieldErrors, UseFormRegisterReturn, UseFormRegister } from "react-hook-form";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getRoleStyle } from "@/src/features/auth/lib/role-style";
import type { CurrentUser } from "@/src/features/auth/types/auth";

import type { ProfileFormValues } from "../schemas/profile.schema";

type ProfileInformationProps = {
  user: CurrentUser;
  isEditing: boolean;
  register: UseFormRegister<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
};

export function ProfileInformation({
  user,
  isEditing,
  register,
  errors,
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
            <ReadOnlyField id="profile-id" label={t("userId")} value={user.id} />
            <ReadOnlyField id="profile-username" label={t("username")} value={user.username} />
            <EditableField
              id="profile-first-name"
              label={t("firstName")}
              readOnly={!isEditing}
              registration={register("firstName")}
              error={errors.firstName}
            />
            <EditableField
              id="profile-last-name"
              label={t("lastName")}
              readOnly={!isEditing}
              registration={register("lastName")}
              error={errors.lastName}
            />
            <EditableField
              id="profile-email"
              label={t("email")}
              type="email"
              readOnly={!isEditing}
              registration={register("email")}
              error={errors.email}
            />
            <EditableField
              id="profile-phone"
              label={t("phone")}
              type="tel"
              readOnly={!isEditing}
              registration={register("phone")}
              error={errors.phone}
            />
          </FieldGroup>
        </CardContent>
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

// readOnly rather than disabled: RHF drops disabled inputs' values on submit.
function EditableField({
  id,
  label,
  type = "text",
  readOnly,
  registration,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  readOnly: boolean;
  registration: UseFormRegisterReturn;
  error?: { message?: string };
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        className="read-only:cursor-default read-only:bg-muted/30"
        {...registration}
      />
      <FieldError errors={[error]} />
    </Field>
  );
}

function ReadOnlyField({ id, label, value }: { id: string; label: string; value: string | number }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} value={value} disabled className="disabled:cursor-default disabled:opacity-100" />
    </Field>
  );
}
