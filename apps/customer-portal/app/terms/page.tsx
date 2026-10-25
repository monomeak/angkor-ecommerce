import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TermsView } from "@/src/features/legal/views/terms-view";

export const metadata: Metadata = {
    title: "Terms of Use — Angkor Commerce",
    description: "The terms for shopping, paying and leaving reviews on Angkor Commerce."
};

export default function TermsPage() {
    return (
        <div className="flex min-h-full flex-1 flex-col">
            <SiteHeader />
            <TermsView />
            <SiteFooter />
        </div>
    );
}
