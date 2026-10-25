import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ rating, label }: { readonly rating: number; readonly label: string }) {
    return (
        <div role="img" aria-label={label} className="flex gap-0.5 text-amber-500">
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
