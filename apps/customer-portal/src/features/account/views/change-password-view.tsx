"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useChangePassword } from "@/src/features/auth/hooks/use-update-profile";
import { AccountContent } from "../components/account-content";
import {
  changePasswordSchema,
  type ChangePasswordField,
} from "../schemas/change-password.schema";

type FieldErrors = Partial<Record<ChangePasswordField, string>>;

const FIELDS: { id: ChangePasswordField; label: string; autoComplete: string }[] = [
  { id: "currentPassword", label: "Current password", autoComplete: "current-password" },
  { id: "newPassword", label: "New password", autoComplete: "new-password" },
  { id: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
];

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordView() {
  const changePassword = useChangePassword();
  const [values, setValues] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateField(field: ChangePasswordField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSuccess(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(false);

    const result = changePasswordSchema.safeParse(values);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as ChangePasswordField;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    changePassword.mutate(
      {
        currentPassword: result.data.currentPassword,
        newPassword: result.data.newPassword,
      },
      {
        onSuccess: () => {
          setValues(EMPTY);
          setFieldErrors({});
          setSuccess(true);
        },
        onError: (error) => {
          // core-api names the field it rejected (a wrong current password, a reused one).
          if (error instanceof ApiError && error.fieldErrors) {
            setFieldErrors(error.fieldErrors as FieldErrors);
            return;
          }
          setFormError(
            error instanceof ApiError ? error.displayMessage : "We couldn't update your password. Please try again.",
          );
        },
      },
    );
  }

  return (
    <AccountContent
      title="Change password"
      description="Update the password used to sign in to your account. Other devices will be signed out."
    >
      <form onSubmit={handleSubmit} noValidate className="flex max-w-sm flex-col gap-4">
        {FIELDS.map((field) => {
          const error = fieldErrors[field.id];
          return (
            <div key={field.id} className="flex flex-col gap-1.5">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                type="password"
                autoComplete={field.autoComplete}
                value={values[field.id]}
                onChange={(event) => updateField(field.id, event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${field.id}-error` : undefined}
                required
              />
              {error && (
                <p id={`${field.id}-error`} className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          );
        })}

        {formError && <p className="text-sm text-destructive">{formError}</p>}
        {success && (
          <p className="text-sm text-emerald-600" role="status">
            Password updated. Other devices have been signed out.
          </p>
        )}

        <Button type="submit" className="w-fit" disabled={changePassword.isPending}>
          {changePassword.isPending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AccountContent>
  );
}
