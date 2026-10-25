// src/components/layout/sidebar-navigation.ts

import { AppRole } from "@/src/features/auth/types/auth";
import {
    FileText,
    LayoutDashboard,
    Settings,
    Users,
    UserRoundCog,
    ChartNoAxesCombined,
    ChartPie,
    UserRound,
    Palette,
    LockKeyhole,
    LayoutGrid,
    Package,
    FolderTree,
    Boxes,
    MessageSquareQuote
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SideBarMenu = {
    titleKey: string;
    href: string;
    icon: LucideIcon;
    allowedRoles?: AppRole[];
    items?: SidebarSubMenuItem[];
};

type SidebarSubMenuItem = Omit<SideBarMenu, "items">;
export const sidebarNavigation: SideBarMenu[] = [
    {
        titleKey: "overview",
        href: "/overview",
        icon: LayoutDashboard
    },
    {
        titleKey: "invoices",
        href: "/invoices",
        icon: FileText
    },
    {
        titleKey: "customers",
        href: "/customers",
        icon: Users
    },
    {
        titleKey: "testimonials",
        href: "/testimonials",
        icon: MessageSquareQuote
    },
    {
        titleKey: "reports",
        href: "/reports",
        icon: ChartNoAxesCombined
    },
    {
        titleKey: "analytics",
        href: "/analytics",
        icon: ChartPie
    },
    {
        titleKey: "team",
        href: "/team",
        icon: UserRoundCog,
        allowedRoles: ["super_admin", "shop_admin"]
    },
    {
        titleKey: "catalog",
        href: "/catalog",
        icon: LayoutGrid,
        items: [
            {
                titleKey: "products",
                href: "/catalog/products",
                icon: Package
            },
            {
                titleKey: "categories",
                href: "/catalog/categories",
                icon: FolderTree
            },
            {
                titleKey: "inventory",
                href: "/catalog/inventory",
                icon: Boxes
            }
        ]
    },
    {
        titleKey: "settings",
        href: "/settings",
        icon: Settings,
        items: [
            {
                titleKey: "profile",
                href: "/settings/profile",
                icon: UserRound
            },
            {
                titleKey: "appearance",
                href: "/settings/appearance",
                icon: Palette
            },
            {
                titleKey: "privacySecurity",
                href: "/settings/privacy-security",
                icon: LockKeyhole,
                allowedRoles: ["super_admin", "shop_admin"]
            }
        ]
    }
];
