import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function StarRating({ rating, className }: { readonly rating: number; readonly className?: string }) {
    return (
        <div role="img" aria-label={`Rated ${rating} out of 5`} className={cn("flex gap-0.5 text-accent", className)}>
            {Array.from({ length: 5 }).map((_, index) => (
                <Star
                    key={index}
                    aria-hidden
                    className={cn("size-4", index < rating ? "fill-current" : "text-muted-foreground/40")}
                />
            ))}
        </div>
    );
}
