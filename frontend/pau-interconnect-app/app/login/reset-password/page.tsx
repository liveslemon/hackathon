"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabaseClient";
import { Button, Input, Typography } from "@/components/ui";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(6, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setHasSession(Boolean(data.session));
        setIsReady(true);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === "PASSWORD_RECOVERY" || session) {
          setHasSession(true);
          setIsReady(true);
        }
      },
    );

    checkSession();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (data: ResetPasswordForm) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login/student");
      }, 2500);
    } catch {
      setErrorMessage("Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-surface rounded-3xl border border-border shadow-xl overflow-hidden p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative w-16 h-16 mb-4">
            <Image
              src="/favicon.ico"
              alt="PAU Interconnect"
              width={64}
              height={64}
              className="object-contain rounded-xl shadow-sm"
              priority
            />
          </div>
          <Typography variant="h4" weight="bold">
            Set New Password
          </Typography>
          <Typography variant="body2" color="muted" className="mt-1">
            Create a strong, secure password for your account.
          </Typography>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 px-4 py-3 rounded-2xl bg-danger-subtle text-danger-fg border border-danger-subtle text-sm font-medium"
          >
            {errorMessage}
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-success-subtle border border-success-subtle text-success-fg text-sm">
              <Typography variant="body2" weight="bold" className="mb-1 text-success-fg">
                Password updated successfully!
              </Typography>
              <Typography variant="body2" className="text-success-fg">
                Your password has been changed. Redirecting you to login...
              </Typography>
            </div>

            <Button
              className="w-full !rounded-full"
              onClick={() => router.push("/login/student")}
            >
              Sign In Now
            </Button>
          </div>
        ) : isReady && !hasSession ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-warning-subtle border border-warning-subtle text-warning-fg text-sm text-left">
              <Typography variant="body2" weight="bold" className="mb-1 text-warning-fg">
                Session expired or invalid link
              </Typography>
              <Typography variant="body2" className="text-warning-fg">
                The password reset link is invalid or has expired. Please request a new link to proceed.
              </Typography>
            </div>

            <Button
              className="w-full !rounded-full"
              onClick={() => router.push("/login/forgot-password")}
            >
              Request New Reset Link
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              id="password"
              label="New Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            <Input
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <Button
              type="submit"
              className="w-full !rounded-full"
              size="lg"
              isLoading={isLoading}
            >
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
