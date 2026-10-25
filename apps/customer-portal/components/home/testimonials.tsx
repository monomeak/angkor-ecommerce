"use client";

import Image from "next/image";
import Link from "next/link";

import { useAppConfig } from "@/components/providers/app-config-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveMediaUrl } from "@/lib/media";
import { StarRating } from "@/src/features/testimonials/components/star-rating";
import { usePublishedTestimonials } from "@/src/features/testimonials/hooks/use-testimonials";
import type { PublicTestimonial } from "@/src/features/testimonials/types/testimonial";

const SHOWN = 12;
// Below this the duplicated marquee track visibly repeats the same card side by side.
const MARQUEE_MIN = 4;

export function Testimonials() {
    const { data, isLoading, isError } = usePublishedTestimonials(SHOWN);
    const testimonials = data?.items ?? [];

    // A failed fetch hides the section rather than inviting the first review on a page that has some.
    if (isError) {
        return null;
    }

    return (
        <section id="testimonials" className="relative scroll-mt-24 border-y bg-muted/30 py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">What customers say</h2>
                    <Button variant="outline" render={<Link href="/feedback" />} nativeButton={false}>
                        Share your feedback
                    </Button>
                </div>

                {isLoading ? (
                    <div className="mt-10 flex gap-4 overflow-hidden">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <Skeleton key={index} className="h-36 w-72 shrink-0 rounded-xl sm:w-80" />
                        ))}
                    </div>
                ) : testimonials.length === 0 ? (
                    <p className="mt-10 text-sm text-muted-foreground">
                        No reviews yet — be the first to tell us how your order went.
                    </p>
                ) : testimonials.length < MARQUEE_MIN ? (
                    <div className="mt-10 flex flex-wrap gap-4">
                        {testimonials.map((testimonial) => (
                            <TestimonialCard key={testimonial.id} testimonial={testimonial} isDuplicate={false} />
                        ))}
                    </div>
                ) : (
                    <TestimonialMarquee testimonials={testimonials} />
                )}
            </div>
        </section>
    );
}

function TestimonialMarquee({ testimonials }: { readonly testimonials: PublicTestimonial[] }) {
    return (
        <div className="group relative mt-10 overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-muted/30 to-transparent sm:w-24" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-muted/30 to-transparent sm:w-24" />
            <div className="flex w-max gap-4 [animation:testimonial-marquee_34s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">
                {[...testimonials, ...testimonials].map((testimonial, index) => (
                    <TestimonialCard
                        key={`${testimonial.id}-${index}`}
                        testimonial={testimonial}
                        isDuplicate={index >= testimonials.length}
                    />
                ))}
            </div>
        </div>
    );
}

function TestimonialCard({
    testimonial,
    isDuplicate
}: {
    readonly testimonial: PublicTestimonial;
    readonly isDuplicate: boolean;
}) {
    const { mediaBaseUrl } = useAppConfig();
    const imageUrl = resolveMediaUrl(mediaBaseUrl, testimonial.authorImage);

    return (
        <figure
            aria-hidden={isDuplicate || undefined}
            className="flex w-72 shrink-0 flex-col gap-3 rounded-xl border bg-card/70 p-5 sm:w-80"
        >
            <StarRating rating={testimonial.rating} />
            <blockquote className="line-clamp-5 text-sm text-muted-foreground">
                &ldquo;{testimonial.message}&rdquo;
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-2 text-sm font-medium">
                <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs">
                    {imageUrl ? (
                        <Image src={imageUrl} alt="" fill unoptimized sizes="28px" className="object-cover" />
                    ) : (
                        testimonial.authorName.charAt(0)
                    )}
                </span>
                {testimonial.authorName}
            </figcaption>
        </figure>
    );
}
