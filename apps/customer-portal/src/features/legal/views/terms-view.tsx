import Link from "next/link";

import { LegalPage, type LegalSection } from "../components/legal-page";

const SECTIONS: LegalSection[] = [
    {
        id: "accounts",
        title: "Your account",
        body: (
            <ul>
                <li>You need an account to place an order, save favorites or leave a review.</li>
                <li>Keep your password to yourself. You are responsible for orders placed from your account.</li>
                <li>Give us accurate details, especially your phone number and delivery address.</li>
                <li>We may suspend an account that is used for fraud or abuse.</li>
            </ul>
        )
    },
    {
        id: "orders",
        title: "Orders and prices",
        body: (
            <>
                <p>
                    Prices are shown in the product&rsquo;s currency and are confirmed by our system when you place the
                    order — the total on your order is the one you pay, even if a price in your cart has since changed.
                </p>
                <p>
                    Placing an order reserves the items for you. An order that is not paid within the payment window may
                    be cancelled automatically, and its items released back to stock.
                </p>
                <p>We may cancel an order if an item turns out to be unavailable or was clearly mispriced.</p>
            </>
        )
    },
    {
        id: "payment",
        title: "Payment and invoices",
        body: (
            <>
                <p>
                    You can pay from your Angkor Commerce wallet or through our payment provider. An order is confirmed
                    only once the payment has been confirmed by the provider — not when you are redirected back to the
                    site.
                </p>
                <p>
                    An invoice is issued automatically once payment is confirmed. You can view and print it from your
                    order history.
                </p>
            </>
        )
    },
    {
        id: "delivery",
        title: "Delivery",
        body: (
            <p>
                We deliver to the saved address you choose at checkout. Delivery times are estimates. If nobody can
                receive the parcel, we will contact you on the phone number on your order.
            </p>
        )
    },
    {
        id: "reviews",
        title: "Reviews and feedback",
        body: (
            <>
                <p>
                    You can leave one review, which you may edit at any time from the{" "}
                    <Link href="/feedback" className="underline underline-offset-4 hover:text-foreground">
                        feedback page
                    </Link>
                    . By submitting it you allow us to display it on the site with your first name and last initial.
                </p>
                <p>
                    We review every submission before publishing it, and we do not publish reviews that are abusive,
                    off-topic, contain personal information, or promote something else. We never edit your words — a
                    review is published as written or not at all.
                </p>
            </>
        )
    },
    {
        id: "acceptable-use",
        title: "Acceptable use",
        body: (
            <ul>
                <li>Don&rsquo;t try to access other customers&rsquo; accounts or data.</li>
                <li>Don&rsquo;t interfere with the site, or scrape it in a way that degrades it for others.</li>
                <li>Don&rsquo;t use the site for anything unlawful in Cambodia.</li>
            </ul>
        )
    },
    {
        id: "liability",
        title: "Liability",
        body: (
            <p>
                We work to keep the site accurate and available, but we cannot promise it will always be error-free or
                uninterrupted. To the extent the law allows, our liability for any order is limited to the amount you
                paid for it.
            </p>
        )
    },
    {
        id: "law",
        title: "Governing law",
        body: <p>These terms are governed by the laws of the Kingdom of Cambodia.</p>
    },
    {
        id: "changes",
        title: "Changes to these terms",
        body: (
            <p>
                We may update these terms from time to time. The date at the top shows when they last changed, and
                orders already placed are governed by the terms in force at the time.
            </p>
        )
    }
];

export function TermsView() {
    return (
        <LegalPage
            title="Terms of Use"
            updated="25 October 2026"
            intro={
                <p>
                    These terms cover using the Angkor Commerce storefront: creating an account, placing orders, paying
                    and leaving reviews. Using the site means you accept them. How we handle your data is covered
                    separately in our{" "}
                    <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                        Privacy Policy
                    </Link>
                    .
                </p>
            }
            sections={SECTIONS}
        />
    );
}
