import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { RequireCustomer } from "@/src/features/auth/components/require-customer";
import { FeedbackView } from "@/src/features/testimonials/views/feedback-view";

export default function FeedbackPage() {
    return (
        <div className="flex min-h-full flex-1 flex-col">
            <SiteHeader />
            <RequireCustomer>
                <FeedbackView />
            </RequireCustomer>
            <SiteFooter />
        </div>
    );
}
