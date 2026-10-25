import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Separator } from "@/components/ui/separator";
import { getAppConfig } from "@/lib/app-config.server";
import { fetchCategories } from "@/src/features/categories/api/category-api";
import { getTopLevelCategories } from "@/src/features/categories/lib/category-helpers";

// Server component, so the shop links are in the HTML rather than filled in after hydration.
export async function SiteFooter() {
    const navCategories = getTopLevelCategories(await fetchCategories(getAppConfig().apiBaseUrl));

    return (
        <footer className="border-t bg-muted/30">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
                <div className="space-y-3 md:col-span-2">
                    <BrandLogo size="sm" />
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Khmer clothing storefront — traditional krama and sampot alongside everyday essentials for men,
                        women, and children.
                    </p>
                </div>

                <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Shop</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        {navCategories.map((category) => (
                            <li key={category.id}>
                                <Link href={`/product/${category.slug}`} className="hover:text-foreground">
                                    {category.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Account</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>
                            <Link href="/login" className="hover:text-foreground">
                                Login
                            </Link>
                        </li>
                        <li>
                            <Link href="/signup" className="hover:text-foreground">
                                Sign up
                            </Link>
                        </li>
                        <li>
                            <Link href="/feedback" className="hover:text-foreground">
                                Share feedback
                            </Link>
                        </li>
                        <li>
                            <Link href="#" className="hover:text-foreground">
                                Home
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>

            <Separator />

            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span>© {new Date().getFullYear()} Angkor Commerce. All rights reserved.</span>
                <nav aria-label="Legal" className="flex gap-4">
                    <Link href="/privacy" className="hover:text-foreground">
                        Privacy Policy
                    </Link>
                    <Link href="/terms" className="hover:text-foreground">
                        Terms of Use
                    </Link>
                </nav>
            </div>
        </footer>
    );
}
