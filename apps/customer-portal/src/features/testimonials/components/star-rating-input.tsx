"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

type StarRatingInputProps = {
    readonly value: number;
    readonly onChange: (value: number) => void;
    readonly invalid?: boolean;
    readonly describedBy?: string;
};

/**
 * Native radios under the stars, so arrow keys, focus and screen readers come for free;
 * the stars are only the picture of the checked one.
 */
export function StarRatingInput({ value, onChange, invalid, describedBy }: StarRatingInputProps) {
    const [hovered, setHovered] = useState(0);
    const shown = hovered || value;

    return (
        <fieldset aria-invalid={invalid || undefined} aria-describedby={describedBy} className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Your rating</legend>
            <div className="flex items-center gap-3">
                <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
                    {LABELS.map((label, index) => {
                        const star = index + 1;
                        return (
                            <label
                                key={star}
                                onMouseEnter={() => setHovered(star)}
                                className="cursor-pointer rounded-md p-0.5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                            >
                                <input
                                    type="radio"
                                    name="rating"
                                    value={star}
                                    checked={value === star}
                                    onChange={() => onChange(star)}
                                    className="sr-only"
                                />
                                <span className="sr-only">
                                    {star} {star === 1 ? "star" : "stars"} — {label}
                                </span>
                                <Star
                                    aria-hidden
                                    className={cn(
                                        "size-8 transition-colors",
                                        star <= shown ? "fill-accent text-accent" : "text-muted-foreground/40"
                                    )}
                                />
                            </label>
                        );
                    })}
                </div>
                <span aria-hidden className="text-sm text-muted-foreground">
                    {shown ? LABELS[shown - 1] : ""}
                </span>
            </div>
        </fieldset>
    );
}
