"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { AuthField } from "./auth-field";
import { useLogin } from "../hooks/use-login";
import { loginSchema } from "../schemas/login.schema";
import { safeRedirectPath } from "../lib/redirect";

type LoginFormProps = {
    readonly next?: string;
    readonly passwordChanged?: boolean;
};

export function LoginForm({ next, passwordChanged = false }: LoginFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const login = useLogin();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /*
     * The cookies are already gone, but the cache still holds the old customer. Reset here rather
     * than on the account page: dropping the session there lets RequireCustomer redirect to
     * /login?next=… first and lose this notice. Resetting refetches /me, so it settles on null.
     */
    useEffect(() => {
        if (passwordChanged) {
            void queryClient.resetQueries();
        }
    }, [passwordChanged, queryClient]);

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const result = loginSchema.safeParse({ email, password });

        if (!result.success) {
            setError(result.error.issues[0]?.message ?? "Please check your input.");
            return;
        }

        setError(null);
        login.mutate(result.data, {
            onSuccess: (customer) => {
                toast.success(`Welcome back, ${customer.firstName}!`);
                router.replace(safeRedirectPath(next));
            },
            onError: (cause) => {
                setError(cause instanceof ApiError ? cause.displayMessage : "Could not sign you in. Try again.");
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <div className="flex flex-1 flex-col gap-6 px-8 py-10 sm:px-10 lg:px-12 lg:py-12">
                <BrandLogo className="lg:hidden" />

                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome Back!</h1>
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                        Log in now to explore all the features and benefits of our platform and see what&apos;s new.
                    </p>
                </div>

                {passwordChanged && (
                    <p
                        role="status"
                        className="rounded-md border border-emerald-600/30 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
                    >
                        Your password was changed. Log in again with your new password.
                    </p>
                )}

                <div className="flex flex-col gap-4">
                    <AuthField
                        id="email"
                        label="Enter your email"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        required
                    />
                    <AuthField
                        id="password"
                        label="Enter your Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={setPassword}
                        required
                        endAdornment={
                            <button
                                type="button"
                                onClick={() => setShowPassword((current) => !current)}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        }
                    />

                    <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
                        <Link
                            href="#"
                            className="font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t">
                <p className="px-8 py-6 text-sm text-muted-foreground sm:px-10 lg:px-12">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="font-semibold text-foreground hover:underline">
                        Register Now
                    </Link>
                </p>
                <Button
                    type="submit"
                    size="lg"
                    disabled={login.isPending}
                    className="h-full shrink-0 rounded-none px-10 text-base"
                >
                    {login.isPending ? "Logging in…" : "Login"}
                </Button>
            </div>
        </form>
    );
}
