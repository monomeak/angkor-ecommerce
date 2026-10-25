"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { PaginationControls } from "@/lib/pagination-control";
import { TestimonialCard } from "../components/testimonial-card";
import { useTestimonialListParams } from "../hooks/use-testimonial-list-params";
import { useReviewTestimonial, useTestimonials } from "../hooks/use-testimonials";
import { FILTERS, PAGE_SIZE_OPTIONS } from "../lib/search-params";
import type { ReviewOutcome } from "../types/testimonial";

/**
 * The review queue. Nothing reaches the storefront home page until it is approved here, and a
 * customer's edit sends it back to pending — so "pending" is the default tab.
 */
export function TestimonialsView() {
    const t = useTranslations("Testimonials");
    const { params, page, setParams } = useTestimonialListParams();
    const { data, isLoading, isError, error, isFetching, refetch } = useTestimonials(params);
    const review = useReviewTestimonial();

    const total = data?.total ?? 0;
    const pageCount = Math.max(1, Math.ceil(total / params.limit));

    function handleReview(id: number, status: ReviewOutcome) {
        review.mutate(
            { id, status },
            {
                onSuccess: () => toast.success(status === "approved" ? t("approvedToast") : t("rejectedToast")),
                onError: (cause) => toast.error(cause instanceof ApiError ? cause.displayMessage : t("reviewError"))
            }
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

            <div role="group" aria-label={t("status")} className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                    <Button
                        key={filter}
                        size="sm"
                        variant={params.filter === filter ? "default" : "outline"}
                        aria-pressed={params.filter === filter}
                        onClick={() => setParams({ filter })}
                    >
                        {t(`filter_${filter}`)}
                    </Button>
                ))}
            </div>

            {isError ? (
                <div className="space-y-3">
                    <p className="text-sm text-destructive">
                        {error instanceof ApiError && (error.status === 401 || error.status === 403)
                            ? t("forbidden")
                            : t("error")}
                    </p>
                    <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
                        {isFetching ? t("loading") : t("retry")}
                    </Button>
                </div>
            ) : isLoading ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-44 rounded-xl" />
                    ))}
                </div>
            ) : data && data.testimonials.length > 0 ? (
                <div className={`grid gap-4 lg:grid-cols-2 ${isFetching ? "opacity-60" : ""}`}>
                    {data.testimonials.map((testimonial) => (
                        <TestimonialCard
                            key={testimonial.id}
                            testimonial={testimonial}
                            isReviewing={review.isPending && review.variables?.id === testimonial.id}
                            onReview={(status) => handleReview(testimonial.id, status)}
                        />
                    ))}
                </div>
            ) : (
                <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    {t(`empty_${params.filter}`)}
                </p>
            )}

            {total > 0 && (
                <PaginationControls
                    currentPage={page}
                    pageCount={pageCount}
                    total={total}
                    pageSize={params.limit}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    itemLabel="testimonial"
                    onPageChange={(next) => setParams({ page: next })}
                    onPageSizeChange={(limit) => setParams({ limit })}
                />
            )}
        </div>
    );
}
