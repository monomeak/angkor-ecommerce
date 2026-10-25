"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import type { ReviewOutcome, Testimonial } from "../types/testimonial";
import { StarRating } from "./star-rating";
import { TestimonialStatusBadge } from "./testimonial-status-badge";

type TestimonialCardProps = {
    readonly testimonial: Testimonial;
    readonly isReviewing: boolean;
    readonly onReview: (status: ReviewOutcome) => void;
};

export function TestimonialCard({ testimonial, isReviewing, onReview }: TestimonialCardProps) {
    const t = useTranslations("Testimonials");

    return (
        <Card>
            <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <StarRating rating={testimonial.rating} label={t("ratedOutOf", { rating: testimonial.rating })} />
                    <TestimonialStatusBadge status={testimonial.status} label={t(`status_${testimonial.status}`)} />
                </div>

                <blockquote className="text-sm whitespace-pre-line">{testimonial.message}</blockquote>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <dl className="grid gap-0.5 text-xs text-muted-foreground">
                        <div>
                            <dt className="sr-only">{t("author")}</dt>
                            <dd>
                                <span className="font-medium text-foreground">{testimonial.authorName}</span> ·{" "}
                                {t("customerId", { id: testimonial.customerId })}
                            </dd>
                        </div>
                        <div className="flex gap-1">
                            <dt>{t("submitted")}</dt>
                            <dd>{formatDateTime(testimonial.updatedAt)}</dd>
                        </div>
                        {testimonial.reviewedAt && (
                            <div className="flex gap-1">
                                <dt>{t("reviewed")}</dt>
                                <dd>{formatDateTime(testimonial.reviewedAt)}</dd>
                            </div>
                        )}
                    </dl>

                    {/* Only the moves that change something: no "approve" on an approved one. */}
                    <div className="flex gap-2">
                        {testimonial.status !== "rejected" && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isReviewing}
                                onClick={() => onReview("rejected")}
                            >
                                <X />
                                {testimonial.status === "approved" ? t("unpublish") : t("reject")}
                            </Button>
                        )}
                        {testimonial.status !== "approved" && (
                            <Button size="sm" disabled={isReviewing} onClick={() => onReview("approved")}>
                                <Check />
                                {t("approve")}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
