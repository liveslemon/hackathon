"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabaseClient";
import { Button, Input, Typography, Stack } from "@/components/ui";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const redirectTo = `${window.location.origin}/login/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setIsSubmitted(true);
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
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
            Reset Password
          </Typography>
          <Typography variant="body2" color="muted" className="mt-1">
            Enter your email and we&apos;ll send you a link to reset your password.
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

        {isSubmitted ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-success-subtle border border-success-subtle text-success-fg text-sm">
              <Typography variant="body2" weight="bold" className="mb-1 text-success-fg">
                Check your inbox
              </Typography>
              <Typography variant="body2" className="text-success-fg">
                If an account exists for that email, we have sent password reset instructions. Follow the link in the email to set a new password.
              </Typography>
            </div>

            <Button
              variant="outline"
              className="w-full !rounded-full"
              onClick={() => router.push("/login/student")}
            >
              Return to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Button
              type="submit"
              className="w-full !rounded-full"
              size="lg"
              isLoading={isLoading}
            >
              Send Reset Link
            </Button>

            <Stack spacing={2} className="mt-6 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => router.push("/login/student")}
                  className="text-xs"
                >
                  Student Login
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => router.push("/login/employer")}
                  className="text-xs"
                >
                  Employer Login
                </Button>
              </div>
            </Stack>
          </form>
        )}
      </div>
    </div>
  );
}
