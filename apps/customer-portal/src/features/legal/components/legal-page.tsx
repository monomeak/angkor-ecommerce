import Link from "next/link";
import type { ReactNode } from "react";

export type LegalSection = {
    id: string;
    title: string;
    body: ReactNode;
};

type LegalPageProps = {
    readonly title: string;
    readonly updated: string;
    readonly intro: ReactNode;
    readonly sections: LegalSection[];
};

/** Shared shell for the static policy pages: title, a jump list, then numbered sections. */
export function LegalPage({ title, updated, intro, sections }: LegalPageProps) {
    return (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>

            <p className="mt-6 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                Angkor Commerce is a demo storefront built as a personal learning project. This page describes how the
                site works; they are not legal advice and no real goods are sold.
            </p>

            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">{intro}</div>

            <nav aria-label="On this page" className="mt-8 rounded-xl border p-4">
                <p className="text-sm font-medium">On this page</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                    {sections.map((section) => (
                        <li key={section.id}>
                            <Link href={`#${section.id}`} className="hover:text-foreground">
                                {section.title}
                            </Link>
                        </li>
                    ))}
                </ol>
            </nav>

            <div className="mt-10 space-y-10">
                {sections.map((section, index) => (
                    <section key={section.id} id={section.id} className="scroll-mt-24">
                        <h2 className="text-xl font-semibold">
                            {index + 1}. {section.title}
                        </h2>
                        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
                            {section.body}
                        </div>
                    </section>
                ))}
            </div>
        </main>
    );
}
