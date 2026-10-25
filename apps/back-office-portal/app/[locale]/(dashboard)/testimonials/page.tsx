import { Suspense } from "react";
import { TestimonialsView } from "@/src/features/testimonials/views/testimonials-view";

/** The Suspense boundary is required: the view reads useSearchParams(). */
export default function TestimonialsPage() {
    return (
        <Suspense>
            <TestimonialsView />
        </Suspense>
    );
}
