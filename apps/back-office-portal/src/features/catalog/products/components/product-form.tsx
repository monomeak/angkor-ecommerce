"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, useForm, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppConfig } from "@/components/providers/app-config-provider";
import { resolveMediaUrl } from "@/lib/media";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useCategoryOptions } from "../../categories/hooks/use-categories";
import {
    discountOptions,
    PRICE_SLIDER_MAX,
    PRICE_SLIDER_MIN,
    PRICE_SLIDER_STEP,
    SUPPORTED_CURRENCIES
} from "../lib/constants";
import { useUnsavedChangesWarning } from "../hooks/use-unsaved-changes-warning";
import { productFormSchema, type ProductFormValues } from "../schemas/product-form.schema";
import { ProductVariantRows } from "./product-variant-rows";

type ProductFormApi = UseFormReturn<ProductFormValues>;

export interface ProductFormHelpers {
    /** RHF's per-field dirty map — the input to buildPatchBody() on the edit route. */
    dirtyFields: Record<string, unknown>;
    setError: ProductFormApi["setError"];
    /** Call with the submitted values to clear isDirty before navigating away. */
    reset: ProductFormApi["reset"];
}

export type ProductFormSubmit = (values: ProductFormValues, helpers: ProductFormHelpers) => Promise<void>;

type ProductFormProps = {
    readonly mode: "create" | "edit";
    readonly defaultValues: ProductFormValues;
    readonly onSubmit: ProductFormSubmit;
    readonly isSubmitting: boolean;
    readonly cancelHref: string;
    /** Rendered next to the submit button — the edit page puts Archive here. */
    readonly secondaryAction?: React.ReactNode;
};

/**
 * One form for both routes. The mode only changes labels and which fields are offered —
 * the field set, validation and layout stay identical, so the two cannot drift.
 */
export function ProductForm({
    mode,
    defaultValues,
    onSubmit,
    isSubmitting,
    cancelHref,
    secondaryAction
}: ProductFormProps) {
    const t = useTranslations("Catalog");
    const { options: categoryOptions, isLoading: isLoadingCategories } = useCategoryOptions();

    const {
        register,
        handleSubmit,
        control,
        setError,
        reset,
        trigger,
        watch,
        formState: { errors, dirtyFields, isDirty }
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema),
        defaultValues,
        mode: "onBlur"
    });

    useUnsavedChangesWarning(isDirty && !isSubmitting);

    /*
     * Creating is a two-step flow: base details first, variants second. Editing shows
     * everything at once, because by then the product exists and the user is usually here
     * to change one thing.
     *
     * Both steps still submit in a single POST. core-api's CreateProductRequest marks
     * variants @NotEmpty — a product carries no stock or SKU of its own — so there is no
     * "save the simple product now, add variants later" call to make. Step 2 is where that
     * requirement gets collected, and images follow on the edit screen once an id exists.
     */
    const isWizard = mode === "create";
    const [step, setStep] = useState<1 | 2>(1);

    const goToVariants = async () => {
        // Validate only what step 1 owns, so its errors surface here rather than on a
        // screen the user has already left behind.
        const valid = await trigger(["name", "description", "categoryId", "price", "currency", "discountPercentage"]);
        if (valid) setStep(2);
    };

    const showDetails = !isWizard || step === 1;
    const showVariants = !isWizard || step === 2;

    const currency = watch("currency");
    const { mediaBaseUrl } = useAppConfig();
    // defaultValues holds the object key the API returned; it is never edited here.
    const thumbnailSrc = resolveMediaUrl(mediaBaseUrl, defaultValues.thumbnailUrl);

    const submit = handleSubmit(async (values) => {
        await onSubmit(values, { dirtyFields: dirtyFields as Record<string, unknown>, setError, reset });
    });

    return (
        <form onSubmit={submit} className="space-y-6" noValidate>
            {isWizard && (
                <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{t("stepOf", { step, total: 2 })}</span>
                    <span className="font-medium">{step === 1 ? t("stepDetails") : t("stepVariants")}</span>
                </div>
            )}

            {showDetails && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("details")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <Field data-invalid={Boolean(errors.name)}>
                                    <FieldLabel htmlFor="product-name">{t("name")}</FieldLabel>
                                    <Input id="product-name" {...register("name")} />
                                    <FieldError errors={[errors.name]} />
                                </Field>

                                <Field data-invalid={Boolean(errors.description)}>
                                    <FieldLabel htmlFor="product-description">{t("description")}</FieldLabel>
                                    <Textarea id="product-description" rows={4} {...register("description")} />
                                    <FieldError errors={[errors.description]} />
                                </Field>

                                <Field data-invalid={Boolean(errors.categoryId)}>
                                    <FieldLabel htmlFor="product-category">{t("category")}</FieldLabel>
                                    {/* Controller rather than register: the Select is not a native
                                input, so RHF cannot bind to it by ref. */}
                                    <Controller
                                        control={control}
                                        name="categoryId"
                                        render={({ field }) => (
                                            <Select
                                                items={categoryOptions.map((option) => ({
                                                    value: String(option.id),
                                                    label: option.label
                                                }))}
                                                value={field.value ? String(field.value) : ""}
                                                onValueChange={(value) =>
                                                    field.onChange(value ? Number(value) : undefined)
                                                }
                                            >
                                                <SelectTrigger id="product-category">
                                                    <SelectValue
                                                        placeholder={
                                                            isLoadingCategories ? t("loading") : t("selectCategory")
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categoryOptions.map((option) => (
                                                        <SelectItem key={option.id} value={String(option.id)}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <FieldError errors={[errors.categoryId]} />
                                </Field>

                                {/*
                                 * Record status is deliberately not editable here. It stays in the
                                 * schema and defaultValues so the value round-trips untouched — it
                                 * is never dirty, so buildPatchBody never sends it — but lifecycle
                                 * changes belong to the confirmed Archive/Restore actions rather
                                 * than to a dropdown that can be changed by accident mid-edit.
                                 * The list still shows the status as a read-only badge and filters
                                 * on it.
                                 */}
                            </FieldGroup>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("pricing")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FieldGroup>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field data-invalid={Boolean(errors.price)}>
                                        <FieldLabel htmlFor="product-price">{t("basePrice")}</FieldLabel>
                                        <Controller
                                            control={control}
                                            name="price"
                                            render={({ field }) => {
                                                /*
                                                 * Slider and number box are two views of one value, so both go
                                                 * through this single Controller. Registering the input
                                                 * separately would leave it uncontrolled: dragging the slider
                                                 * updated the form state but never the number the user could
                                                 * see, so the two disagreed.
                                                 */
                                                const numeric = Number(field.value);
                                                const hasValue =
                                                    field.value !== "" &&
                                                    field.value !== null &&
                                                    field.value !== undefined &&
                                                    Number.isFinite(numeric);
                                                const sliderValue = hasValue
                                                    ? Math.max(PRICE_SLIDER_MIN, numeric)
                                                    : PRICE_SLIDER_MIN;

                                                return (
                                                    <div className="flex items-center gap-3">
                                                        <Slider
                                                            // The ceiling lifts for a product that is already priced
                                                            // above it, so opening an expensive record and saving an
                                                            // unrelated field cannot quietly clamp its price to 100.
                                                            min={PRICE_SLIDER_MIN}
                                                            max={Math.max(PRICE_SLIDER_MAX, Math.ceil(sliderValue))}
                                                            step={PRICE_SLIDER_STEP}
                                                            value={sliderValue}
                                                            onValueChange={(value) =>
                                                                field.onChange(Array.isArray(value) ? value[0] : value)
                                                            }
                                                            className="flex-1"
                                                            aria-label={t("basePrice")}
                                                        />
                                                        {/* Dragging finds the rough figure; money still needs an
                                                            exact box, since a 0.5 step cannot land on 12.50 and
                                                            prices above the ceiling must stay typeable. */}
                                                        <Input
                                                            id="product-price"
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            className="w-28"
                                                            /*
                                                             * z.coerce.number() types its *input* as unknown, so
                                                             * the value is stringified here rather than passed
                                                             * through. "" keeps the input controlled from the
                                                             * first render — an undefined value would make React
                                                             * flip it from uncontrolled to controlled the moment
                                                             * a price was set.
                                                             */
                                                            value={
                                                                hasValue || field.value === ""
                                                                    ? String(field.value)
                                                                    : ""
                                                            }
                                                            onChange={(event) => {
                                                                const raw = event.target.value;
                                                                // Keep "" as "" rather than coercing to 0, so a
                                                                // cleared box reads as empty and fails the
                                                                // "required" rule instead of silently becoming free.
                                                                field.onChange(raw === "" ? "" : Number(raw));
                                                            }}
                                                            onBlur={field.onBlur}
                                                            ref={field.ref}
                                                        />
                                                    </div>
                                                );
                                            }}
                                        />
                                        <FieldDescription>{t("basePriceHint")}</FieldDescription>
                                        <FieldError errors={[errors.price]} />
                                    </Field>

                                    <Field data-invalid={Boolean(errors.currency)}>
                                        <FieldLabel>{t("currency")}</FieldLabel>
                                        {/* A free-text ISO code let anyone type a currency the shop
                                    does not trade in and only fail on submit. */}
                                        <Controller
                                            control={control}
                                            name="currency"
                                            render={({ field }) => (
                                                <RadioGroup
                                                    value={field.value}
                                                    onValueChange={(value) => field.onChange(String(value))}
                                                    className="flex flex-row gap-6 pt-1"
                                                >
                                                    {SUPPORTED_CURRENCIES.map((code) => (
                                                        <label
                                                            key={code}
                                                            className="flex cursor-pointer items-center gap-2 text-sm"
                                                        >
                                                            <RadioGroupItem value={code} />
                                                            {code}
                                                        </label>
                                                    ))}
                                                </RadioGroup>
                                            )}
                                        />
                                        <FieldError errors={[errors.currency]} />
                                    </Field>
                                </div>

                                <Field data-invalid={Boolean(errors.discountPercentage)}>
                                    <FieldLabel>{t("discount")}</FieldLabel>
                                    <Controller
                                        control={control}
                                        name="discountPercentage"
                                        render={({ field }) => (
                                            <RadioGroup
                                                // "None" is 0, not null: core-api's PATCH skips null
                                                // fields, so sending null would leave an existing
                                                // discount in place instead of clearing it.
                                                value={String(field.value ?? 0)}
                                                onValueChange={(value) => field.onChange(Number(value))}
                                                className="flex flex-row flex-wrap gap-x-6 gap-y-2 pt-1"
                                            >
                                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                                    <RadioGroupItem value="0" />
                                                    {t("discountNone")}
                                                </label>
                                                {discountOptions(Number(defaultValues.discountPercentage ?? 0)).map(
                                                    (value) => (
                                                        <label
                                                            key={value}
                                                            className="flex cursor-pointer items-center gap-2 text-sm"
                                                        >
                                                            <RadioGroupItem value={String(value)} />
                                                            {value}%
                                                        </label>
                                                    )
                                                )}
                                            </RadioGroup>
                                        )}
                                    />
                                    <FieldError errors={[errors.discountPercentage]} />
                                </Field>

                                {/* `unit` is not exposed: core-api defaults it to "piece" and nothing in
                            the catalogue sells by any other unit yet. It stays in the schema so
                            the payload shape is unchanged, and can come back as a field the day
                            a product needs kg or metres. */}
                            </FieldGroup>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("thumbnail")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/*
                             * Read-only preview rather than an editable field. The value is a MinIO
                             * object key, not a URL — showing that raw string was meaningless to
                             * read and easy to corrupt by hand. core-api sets it from the first
                             * uploaded image and re-points it automatically when that image is
                             * deleted, so the images panel below is the real control.
                             */}
                            <div className="flex items-center gap-4">
                                <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-md border">
                                    {thumbnailSrc ? (
                                        <Image
                                            src={thumbnailSrc}
                                            alt=""
                                            fill
                                            sizes="80px"
                                            className="object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="text-muted-foreground flex size-full items-center justify-center">
                                            <ImageOff className="size-5" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-muted-foreground text-sm">
                                    {mode === "create"
                                        ? t("thumbnailCreateHint")
                                        : thumbnailSrc
                                          ? t("thumbnailHint")
                                          : t("thumbnailEmptyHint")}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {showVariants && (
                <Card>
                    <CardContent className="space-y-4 pt-6">
                        {isWizard && <p className="text-muted-foreground text-sm">{t("stepVariantsHint")}</p>}
                        <ProductVariantRows control={control} register={register} errors={errors} currency={currency} />
                    </CardContent>
                </Card>
            )}

            <div className="flex items-center justify-between gap-3">
                <div>{secondaryAction}</div>
                <div className="flex items-center gap-3">
                    {isWizard && step === 2 ? (
                        <Button type="button" variant="outline" onClick={() => setStep(1)}>
                            {t("back")}
                        </Button>
                    ) : (
                        /*
                         * nativeButton={false}: this renders an <a>, so Base UI has to apply its
                         * non-native handling rather than assume a real <button>. No type either —
                         * an anchor cannot submit the form.
                         */
                        <Button
                            variant="outline"
                            nativeButton={false}
                            render={<Link href={cancelHref}>{t("cancel")}</Link>}
                        />
                    )}

                    {isWizard && step === 1 ? (
                        /*
                         * type="button": submitting here would post a product with an empty
                         * SKU on the placeholder variant row and come back a 400.
                         */
                        <Button type="button" onClick={() => void goToVariants()}>
                            {t("next")}
                        </Button>
                    ) : (
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? mode === "create"
                                    ? t("creating")
                                    : t("saving")
                                : mode === "create"
                                  ? t("createProduct")
                                  : t("saveChanges")}
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
