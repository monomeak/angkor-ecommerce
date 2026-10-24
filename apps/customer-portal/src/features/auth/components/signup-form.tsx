"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { AuthField } from "./auth-field";
import { useRegister } from "../hooks/use-register";
import { signupSchema } from "../schemas/signup.schema";
import { safeRedirectPath } from "../lib/redirect";

type SignupFormProps = {
  readonly next?: string;
};

export function SignupForm({ next }: SignupFormProps) {
  const router = useRouter();
  const register = useRegister();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = signupSchema.safeParse({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please check your input.");
      return;
    }

    setError(null);
    // confirmPassword is a client-side check only — core-api's register DTO has no such field.
    register.mutate(
      {
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        email: result.data.email,
        password: result.data.password,
      },
      {
        onSuccess: (customer) => {
          toast.success(`Welcome to Angkor Commerce, ${customer.firstName}!`, {
            description: "Your account is ready and you're signed in.",
          });
          router.replace(safeRedirectPath(next));
        },
        onError: (cause) => {
          setError(
            cause instanceof ApiError
              ? cause.displayMessage
              : "Could not create your account. Try again.",
          );
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-6 px-8 py-10 sm:px-10 lg:px-12 lg:py-12">
        <BrandLogo className="lg:hidden" />

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Sign up to track orders, save your details, and check out faster next time.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField
              id="first-name"
              label="First name"
              value={firstName}
              onChange={setFirstName}
              required
            />
            <AuthField
              id="last-name"
              label="Last name"
              value={lastName}
              onChange={setLastName}
              required
            />
          </div>

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

          <AuthField
            id="confirm-password"
            label="Confirm password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
            endAdornment={
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            }
          />

          <p className="text-xs text-muted-foreground">
            Use at least 8 characters with an uppercase letter, a lowercase letter, a number,
            and a special character.
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t">
        <p className="px-8 py-6 text-sm text-muted-foreground sm:px-10 lg:px-12">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-foreground hover:underline">
            Log in
          </Link>
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={register.isPending}
          className="h-full shrink-0 rounded-none px-10 text-base"
        >
          {register.isPending ? "Creating…" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
