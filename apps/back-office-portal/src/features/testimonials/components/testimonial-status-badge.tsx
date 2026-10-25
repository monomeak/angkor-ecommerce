import { Badge } from "@/components/ui/badge";
import type { TestimonialStatus } from "../types/testimonial";

const STATUS_VARIANTS: Record<TestimonialStatus, "default" | "secondary" | "outline"> = {
    pending: "secondary",
    approved: "default",
    rejected: "outline"
};

export function TestimonialStatusBadge({
    status,
    label
}: {
    readonly status: TestimonialStatus;
    readonly label: string;
}) {
    return <Badge variant={STATUS_VARIANTS[status]}>{label}</Badge>;
}
