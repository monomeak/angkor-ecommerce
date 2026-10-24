"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Copy, Eye, EyeOff, KeyRound, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyServerErrors } from "@/src/features/catalog/products/lib/apply-server-errors";

import { getRoleStyle } from "../../auth/lib/role-style";
import type { AppRole } from "../../auth/types/auth";
import { useInviteMember } from "../hooks/use-invite-member";
import { generateStrongPassword } from "../lib/generate-password";
import { assignableRoles } from "../lib/permissions";
import { addMemberSchema, type AddMemberValues } from "../schemas/add-member.schema";

const EMPTY_VALUES: AddMemberValues = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  role: null,
};

interface AddMemberDialogProps {
  readonly actorRole: AppRole;
}

export function AddMemberDialog({ actorRole }: AddMemberDialogProps) {
  const t = useTranslations("Team");
  const roles = assignableRoles(actorRole);
  const roleItems = roles.map((role) => ({ value: role, label: getRoleStyle(role).label }));

  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { mutateAsync: addMember } = useInviteMember();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: EMPTY_VALUES,
  });

  // staff can't do that
  if (roles.length === 0) return null;

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return;
    if (next) {
      reset(EMPTY_VALUES);
      setShowPassword(false);
    }
    setOpen(next);
  };

  const fillGeneratedPassword = () => {
    setValue("password", generateStrongPassword(), { shouldDirty: true, shouldValidate: true });
    // Revealed on purpose: the admin has to pass it on, so they need to see what was made.
    setShowPassword(true);
  };

  const copyPassword = async () => {
    const password = getValues("password");
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      toast.success(t("passwordCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const submit = handleSubmit(async (values) => {
    try {
      const member = await addMember({
        firstName: values.firstName,
        lastName: values.lastName,
        username: values.username,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
        role: values.role as AppRole,
      });
      toast.success(t("memberAdded", { name: member.fullName }));
      setOpen(false);
    } catch (error) {
      const message = applyServerErrors(error, setError);
      if (message) toast.error(message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <UserPlus className="size-3.5" />
        {t("addMember")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{t("addMemberTitle")}</DialogTitle>
            <DialogDescription>{t("addMemberDescription")}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="grid gap-4 py-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.firstName)}>
              <FieldLabel htmlFor="member-first-name">{t("firstName")}</FieldLabel>
              <Input id="member-first-name" autoComplete="off" {...register("firstName")} />
              <FieldError errors={[errors.firstName]} />
            </Field>

            <Field data-invalid={Boolean(errors.lastName)}>
              <FieldLabel htmlFor="member-last-name">{t("lastName")}</FieldLabel>
              <Input id="member-last-name" autoComplete="off" {...register("lastName")} />
              <FieldError errors={[errors.lastName]} />
            </Field>

            <Field data-invalid={Boolean(errors.username)}>
              <FieldLabel htmlFor="member-username">{t("username")}</FieldLabel>
              <Input id="member-username" autoComplete="off" {...register("username")} />
              <FieldError errors={[errors.username]} />
            </Field>

            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="member-email">{t("email")}</FieldLabel>
              <Input id="member-email" type="email" autoComplete="off" {...register("email")} />
              <FieldError errors={[errors.email]} />
            </Field>

            <Field data-invalid={Boolean(errors.phone)}>
              <FieldLabel htmlFor="member-phone">{t("phoneOptional")}</FieldLabel>
              <Input id="member-phone" type="tel" autoComplete="off" {...register("phone")} />
              <FieldError errors={[errors.phone]} />
            </Field>

            <Field data-invalid={Boolean(errors.role)}>
              <FieldLabel htmlFor="member-role">{t("role")}</FieldLabel>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    items={roleItems}
                    value={field.value ?? ""}
                    onValueChange={(value) => field.onChange((value as AppRole) || null)}
                  >
                    <SelectTrigger id="member-role" className="w-full">
                      <SelectValue placeholder={t("selectRole")} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.role]} />
            </Field>

            <Field data-invalid={Boolean(errors.password)} className="sm:col-span-2">
              <FieldLabel htmlFor="member-password">{t("password")}</FieldLabel>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="member-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-9 font-mono"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPassword}
                  aria-label={t("copyPassword")}
                >
                  <Copy className="size-4" />
                </Button>
                <Button type="button" variant="outline" className="gap-1.5" onClick={fillGeneratedPassword}>
                  <KeyRound className="size-4" />
                  {t("generatePassword")}
                </Button>
              </div>
              <FieldDescription>{t("passwordHint")}</FieldDescription>
              <FieldError errors={[errors.password]} />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("adding") : t("addMember")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
