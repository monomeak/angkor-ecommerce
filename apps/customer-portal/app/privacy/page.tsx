import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PrivacyView } from "@/src/features/legal/views/privacy-view";

export const metadata: Metadata = {
    title: "Privacy Policy — Angkor Commerce",
    description: "How Angkor Commerce collects, uses and protects your information."
};

export default function PrivacyPage() {
    return (
        <div className="flex min-h-full flex-1 flex-col">
            <SiteHeader />
            <PrivacyView />
            <SiteFooter />
        </div>
    );
}
