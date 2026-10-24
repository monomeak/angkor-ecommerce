"use client";
import { formatLongDate, getGreeting } from "@/lib/utils";
import { useCurrentUser } from "@/src/features/auth/hooks/use-current-user";
import WaveIcon from "@/src/features/dashboard-overview/components/wave-icon";
import { DashboardOverviewView } from "@/src/features/dashboard-overview/views/dashboard-overview-view";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export default function Dashboard() {
    const { data: currentUser } = useCurrentUser();
    const mounted = useSyncExternalStore(
        subscribe,
        () => true,
        () => false
    );
    const date = mounted ? new Date() : null;

    const greeting = date ? getGreeting(date) : "Hello";

    return (
        <main className="flex flex-col gap-2">
            <div>
                <span className="text-muted-foreground">{date ? formatLongDate(date) : "\u00a0"}</span>
                <div className="flex flex-row gap-2">
                    <h1 className="flex flex-col items-left gap-2 text-2xl font-semibold pt-2">
                        <span>
                            {greeting}, {date ? currentUser?.firstName : null}
                        </span>
                    </h1>
                    <WaveIcon />
                </div>
            </div>

            <DashboardOverviewView />
        </main>
    );
}
