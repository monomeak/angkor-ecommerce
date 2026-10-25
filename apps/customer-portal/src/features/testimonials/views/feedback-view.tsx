"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { StarRatingInput } from "../components/star-rating-input";
import { useMyTestimonial, useSaveMyTestimonial } from "../hooks/use-testimonials";
import {
    MESSAGE_MAX,
    testimonialFormSchema,
    type TestimonialFormField,
    type TestimonialFormValues
} from "../schemas/testimonial-form.schema";
import type { MyTestimonial, TestimonialStatus } from "../types/testimonial";

type FieldErrors = Partial<Record<TestimonialFormField, string>>;

const STATUS_COPY: Record<
    TestimonialStatus,
    { label: string; note: string; variant: "secondary" | "default" | "destructive" }
> = {
    pending: {
        label: "In review",
        note: "Thanks! We review every piece of feedback before it appears on the home page.",
        variant: "secondary"
    },
    approved: {
        label: "Published",
        note: "Your review is live on the home page. Editing it sends it back for review.",
        variant: "default"
    },
    rejected: {
        label: "Not published",
        note: "We read it, but it won't appear on the home page. You can edit and resubmit.",
        variant: "destructive"
    }
};

export function FeedbackView() {
    const { data: existing, isPending } = useMyTestimonial();

    return (
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Share your feedback</h1>
            <p className="mt-2 text-sm text-muted-foreground">
                How was shopping with Angkor Commerce? Rate us and tell us about it — reviews we publish appear on the
                home page under your first name and last initial.
            </p>

            {isPending ? (
                <div className="mt-8 flex flex-col gap-4">
                    <Skeleton className="h-10 w-56" />
                    <Skeleton className="h-36 w-full" />
                </div>
            ) : (
                <FeedbackForm existing={existing ?? null} />
            )}
        </main>
    );
}

/** Mounted only once the saved review has loaded, so it can prefill from it without an effect. */
function FeedbackForm({ existing }: { readonly existing: MyTestimonial | null }) {
    const save = useSaveMyTestimonial();
    const [values, setValues] = useState<TestimonialFormValues>({
        rating: existing?.rating ?? 0,
        message: existing?.message ?? ""
    });
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);

    function updateField<K extends TestimonialFormField>(field: K, value: TestimonialFormValues[K]) {
        setValues((current) => ({ ...current, [field]: value }));
        setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setFormError(null);

        const result = testimonialFormSchema.safeParse(values);
        if (!result.success) {
            const errors: FieldErrors = {};
            for (const issue of result.error.issues) {
                const field = issue.path[0] as TestimonialFormField;
                errors[field] ??= issue.message;
            }
            setFieldErrors(errors);
            return;
        }

        save.mutate(result.data, {
            onSuccess: () => toast.success(existing ? "Your feedback was updated." : "Thanks for your feedback!"),
            onError: (error) => {
                if (error instanceof ApiError && error.fieldErrors) {
                    setFieldErrors(error.fieldErrors as FieldErrors);
                    return;
                }
                setFormError(
                    error instanceof ApiError
                        ? error.displayMessage
                        : "We couldn't save your feedback. Please try again."
                );
            }
        });
    }

    const status = existing ? STATUS_COPY[existing.status] : null;

    return (
        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6 rounded-3xl bg-card p-6 sm:p-8">
            {status && (
                <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:gap-3">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <p className="text-sm text-muted-foreground">{status.note}</p>
                </div>
            )}

            <div className="flex flex-col gap-1.5">
                <StarRatingInput
                    value={values.rating}
                    onChange={(rating) => updateField("rating", rating)}
                    invalid={Boolean(fieldErrors.rating)}
                    describedBy={fieldErrors.rating ? "rating-error" : undefined}
                />
                {fieldErrors.rating && (
                    <p id="rating-error" className="text-sm text-destructive">
                        {fieldErrors.rating}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="message">Your feedback</Label>
                <Textarea
                    id="message"
                    rows={5}
                    maxLength={MESSAGE_MAX}
                    placeholder="What did you buy, and how did it go?"
                    value={values.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    aria-invalid={Boolean(fieldErrors.message)}
                    aria-describedby={fieldErrors.message ? "message-error" : "message-count"}
                    className="min-h-32"
                />
                <div className="flex justify-between gap-4 text-sm">
                    <p id="message-error" className="text-destructive">
                        {fieldErrors.message}
                    </p>
                    <span id="message-count" className="shrink-0 text-muted-foreground">
                        {values.message.length}/{MESSAGE_MAX}
                    </span>
                </div>
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <Button type="submit" className="w-fit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : existing ? "Update feedback" : "Submit feedback"}
            </Button>
        </form>
    );
}
