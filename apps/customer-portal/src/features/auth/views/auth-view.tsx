import { AuthShell } from "../components/auth-shell";
import { LoginForm } from "../components/login-form";
import { SignupForm } from "../components/signup-form";
import type { AuthMode } from "../types/auth";

const AUTH_CONFIG: Record<AuthMode, { imageSrc: string; imageAlt: string }> = {
    login: { imageSrc: "/login-gate.png", imageAlt: "Angkor Commerce login" },
    signup: { imageSrc: "/registere-gate.png", imageAlt: "Angkor Commerce sign up" }
};

type AuthViewProps = {
    readonly mode: AuthMode;
    /** Where to land after auth — set by the account guard's `?next=` redirect. */
    readonly next?: string;
    /** Arrived from a password change, which signs every session out. */
    readonly passwordChanged?: boolean;
};

export function AuthView({ mode, next, passwordChanged }: AuthViewProps) {
    const { imageSrc, imageAlt } = AUTH_CONFIG[mode];

    return (
        <AuthShell imageSrc={imageSrc} imageAlt={imageAlt}>
            {mode === "login" ? (
                <LoginForm next={next} passwordChanged={passwordChanged} />
            ) : (
                <SignupForm next={next} />
            )}
        </AuthShell>
    );
}
