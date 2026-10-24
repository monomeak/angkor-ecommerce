"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyServerErrors } from "../../products/lib/apply-server-errors";
import { useCreateCategory, useUpdateCategory } from "../hooks/use-category-mutations";
import { categoryFormSchema, slugify, type CategoryFormValues } from "../schemas/category-form.schema";
import { toCategoryOptions } from "../lib/category-tree";
import type { Category } from "../types/category";

const NO_PARENT = "none";

type CategoryFormDialogProps = {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly categories: Category[];
    /** Absent when creating. */
    readonly category?: Category | null;
};

export function CategoryFormDialog({ open, onOpenChange, categories, category }: CategoryFormDialogProps) {
    const t = useTranslations("Catalog");
    const isEdit = Boolean(category);
    const createCategory = useCreateCategory();
    const updateCategory = useUpdateCategory();
    const isPending = createCategory.isPending || updateCategory.isPending;

    const {
        register,
        handleSubmit,
        control,
        reset,
        setError,
        setValue,
        watch,
        formState: { errors, dirtyFields }
    } = useForm<CategoryFormValues>({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: { name: "", slug: "", parentId: null, sortOrder: 0 }
    });

    // Reset on open so a second visit doesn't inherit the previous entry.
    useEffect(() => {
        if (!open) return;

        reset(
            category
                ? {
                      name: category.name,
                      slug: category.slug,
                      parentId: category.parentId,
                      sortOrder: category.sortOrder
                  }
                : { name: "", slug: "", parentId: null, sortOrder: 0 }
        );
    }, [open, category, reset]);

    const name = watch("name");

    // Mirror the name into the slug until the user takes it over. On edit the slug is left
    // alone entirely — it is already public in storefront URLs.
    useEffect(() => {
        if (isEdit || dirtyFields.slug) return;

        setValue("slug", slugify(name ?? ""));
    }, [name, isEdit, dirtyFields.slug, setValue]);

    /**
     * A category cannot be its own parent, nor a descendant of itself — that would orphan
     * the whole subtree from the root and break the "Parent › Child" label walk.
     */
    const parentOptions = toCategoryOptions(
        categories.filter((candidate) => {
            if (!category) return true;
            if (candidate.id === category.id) return false;

            let cursor: Category | undefined = candidate;
            const seen = new Set<number>();
            while (cursor && !seen.has(cursor.id)) {
                if (cursor.parentId === category.id) return false;
                seen.add(cursor.id);
                cursor = categories.find((item) => item.id === cursor?.parentId);
            }
            return true;
        })
    );

    const submit = handleSubmit(async (values) => {
        const payload = {
            name: values.name.trim(),
            slug: values.slug.trim(),
            parentId: values.parentId ?? null,
            sortOrder: Number(values.sortOrder ?? 0)
        };

        try {
            if (category) {
                await updateCategory.mutateAsync({ id: category.id, payload });
                toast.success(t("categoryUpdated", { name: payload.name }));
            } else {
                await createCategory.mutateAsync(payload);
                toast.success(t("categoryCreated", { name: payload.name }));
            }
            onOpenChange(false);
        } catch (error) {
            const message = applyServerErrors(error, setError);
            if (message) toast.error(message);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={submit} noValidate>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? t("editCategoryTitle") : t("newCategoryTitle")}</DialogTitle>
                        <DialogDescription>{t("categoryDialogBody")}</DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-4">
                        <Field data-invalid={Boolean(errors.name)}>
                            <FieldLabel htmlFor="category-name">{t("categoryName")}</FieldLabel>
                            <Input id="category-name" {...register("name")} />
                            <FieldError errors={[errors.name]} />
                        </Field>

                        <Field data-invalid={Boolean(errors.slug)}>
                            <FieldLabel htmlFor="category-slug">{t("slug")}</FieldLabel>
                            <Input id="category-slug" {...register("slug")} />
                            <FieldDescription>{isEdit ? t("slugHintEdit") : t("slugHintCreate")}</FieldDescription>
                            <FieldError errors={[errors.slug]} />
                        </Field>

                        <Field data-invalid={Boolean(errors.parentId)}>
                            <FieldLabel htmlFor="category-parent">{t("parent")}</FieldLabel>
                            <Controller
                                control={control}
                                name="parentId"
                                render={({ field }) => (
                                    <Select
                                        items={[
                                            { value: NO_PARENT, label: t("noParent") },
                                            ...parentOptions.map((option) => ({
                                                value: String(option.id),
                                                label: option.label
                                            }))
                                        ]}
                                        value={field.value ? String(field.value) : NO_PARENT}
                                        onValueChange={(value) =>
                                            field.onChange(value === NO_PARENT ? null : Number(value))
                                        }
                                    >
                                        <SelectTrigger id="category-parent">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NO_PARENT}>{t("noParent")}</SelectItem>
                                            {parentOptions.map((option) => (
                                                <SelectItem key={option.id} value={String(option.id)}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            <FieldError errors={[errors.parentId]} />
                        </Field>

                        <Field data-invalid={Boolean(errors.sortOrder)}>
                            <FieldLabel htmlFor="category-sort">{t("sortOrder")}</FieldLabel>
                            <Input id="category-sort" type="number" min={0} step={1} {...register("sortOrder")} />
                            <FieldDescription>{t("sortOrderHint")}</FieldDescription>
                            <FieldError errors={[errors.sortOrder]} />
                        </Field>
                    </FieldGroup>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            {t("cancel")}
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? t("saving") : isEdit ? t("saveChanges") : t("newCategoryTitle")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
