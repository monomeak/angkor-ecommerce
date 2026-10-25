import Link from "next/link";

import { LegalPage, type LegalSection } from "../components/legal-page";

const SECTIONS: LegalSection[] = [
    {
        id: "what-we-collect",
        title: "What we collect",
        body: (
            <>
                <p>We only collect what running the shop needs:</p>
                <ul>
                    <li>
                        <strong>Account details</strong> — your name, email, phone number, an optional company name and
                        tax number, and an optional profile photo. Your password is stored only as a one-way hash; we
                        cannot read it.
                    </li>
                    <li>
                        <strong>Delivery addresses</strong> — up to three saved addresses, and the map pin for each if
                        you place one.
                    </li>
                    <li>
                        <strong>Orders and payments</strong> — what you bought, the prices at the time, your invoices
                        and receipts, and your wallet balance and transactions.
                    </li>
                    <li>
                        <strong>Favorites and reviews</strong> — products you save for later, and any rating and
                        feedback you send us.
                    </li>
                </ul>
            </>
        )
    },
    {
        id: "how-we-use-it",
        title: "How we use it",
        body: (
            <ul>
                <li>To sign you in and keep your account secure.</li>
                <li>To take, deliver and invoice your orders, and to show you your order history.</li>
                <li>To process payments through our payment providers.</li>
                <li>To review and, if approved, publish your feedback on the home page.</li>
            </ul>
        )
    },
    {
        id: "reviews",
        title: "Reviews you publish",
        body: (
            <p>
                When you{" "}
                <Link href="/feedback" className="underline underline-offset-4 hover:text-foreground">
                    share feedback
                </Link>
                , our team reads it before anything is published. An approved review shows your rating, your words, your
                first name with your last initial (for example &ldquo;Sokha P.&rdquo;) and your profile photo if you
                have one — never your full name or email. Editing a review sends it back for review, and we can
                unpublish it at any time.
            </p>
        )
    },
    {
        id: "sharing",
        title: "Who we share it with",
        body: (
            <>
                <p>We do not sell your data. We share it only where the service needs it:</p>
                <ul>
                    <li>
                        <strong>Payment providers</strong> such as ABA PayWay, which receive what is needed to take a
                        payment. We never see or store your full card details.
                    </li>
                    <li>
                        <strong>OpenStreetMap (Nominatim)</strong> — when you drop a pin on the address map, its
                        coordinates are sent to OpenStreetMap to look up the street name. Your account details are not
                        sent with them.
                    </li>
                    <li>
                        <strong>Authorities</strong>, when Cambodian law requires it.
                    </li>
                </ul>
            </>
        )
    },
    {
        id: "cookies",
        title: "Cookies and local storage",
        body: (
            <>
                <p>We use two cookies, both strictly necessary to keep you signed in:</p>
                <ul>
                    <li>
                        <code>accessToken</code> — lasts 15 minutes.
                    </li>
                    <li>
                        <code>refreshToken</code> — lasts 10 days and renews your session.
                    </li>
                </ul>
                <p>
                    Both are <em>httpOnly</em>, so scripts on the page cannot read them, and both are cleared when you
                    log out or change your password. Your shopping cart and theme preference are kept in your
                    browser&rsquo;s local storage and never leave your device until you place an order. We do not use
                    advertising or tracking cookies.
                </p>
            </>
        )
    },
    {
        id: "retention",
        title: "How long we keep it",
        body: (
            <p>
                Invoices, receipts and payment records are kept for as long as accounting rules require, even if you
                close your account. Other records are archived rather than deleted, so an order you placed stays
                accurate. Saved favorites and addresses can be removed by you at any time.
            </p>
        )
    },
    {
        id: "your-rights",
        title: "Your choices",
        body: (
            <ul>
                <li>
                    View and update your profile, addresses and password from{" "}
                    <Link href="/account" className="underline underline-offset-4 hover:text-foreground">
                        your account
                    </Link>
                    .
                </li>
                <li>Edit your review, or ask us to remove it.</li>
                <li>Ask us for a copy of your data, or to close your account.</li>
            </ul>
        )
    },
    {
        id: "changes",
        title: "Changes to this policy",
        body: (
            <p>
                If we change how we handle your data, we will update this page and the date at the top. Significant
                changes will be announced on the site before they take effect.
            </p>
        )
    }
];

export function PrivacyView() {
    return (
        <LegalPage
            title="Privacy Policy"
            updated="25 October 2026"
            intro={
                <p>
                    This policy explains what information Angkor Commerce collects when you shop with us, why we need
                    it, and what control you have over it.
                </p>
            }
            sections={SECTIONS}
        />
    );
}
