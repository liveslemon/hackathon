"use client";

import React, { useState } from "react";
import { FiLock, FiArrowLeft } from "react-icons/fi";
import { useRouter } from "next/navigation";
import {
  Typography,
  Button,
  Card,
  CardContent,
  Input,
} from "@/components/ui";

interface AdminAccount {
  email: string;
  password: string;
}

const adminAccounts: AdminAccount[] = [
  { email: "admin@pau.edu.ng", password: "admin123" },
  { email: "supervisor@pau.edu.ng", password: "super456" },
  { email: "head@pau.edu.ng", password: "admin789" },
];

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@pau.edu.ng");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Please enter your email and password.");
      return;
    }

    // find an admin account that matches the entered email (if any)
    const admin = adminAccounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (admin) {
      if (admin.password === cleanPassword) {
        router.push("/dashboard/admin");
      } else {
        setError("Invalid password for admin account.");
      }
    } else {
      setError("This account is not authorized to access the Admin Portal.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#667eea] bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#667eea]">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden">
          <CardContent className="p-10 md:p-12">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-[#667eea] rounded-[32px] flex items-center justify-center shadow-xl shadow-indigo-100/50 transform -rotate-6">
                <FiLock size={32} className="text-white" />
              </div>
            </div>

            <div className="text-center space-y-2 mb-10">
              <Typography variant="h2" weight="bold">Admin Portal</Typography>
              <Typography color="muted">Sign in to manage the internship ecosystem</Typography>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-6"
            >
              <Input
                label="Email Address"
                placeholder="admin@pau.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-50 border-slate-100 focus:bg-white"
              />

              <Input
                label="Security Key"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                error={error}
                className="bg-slate-50 border-slate-100 focus:bg-white"
              />

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 text-lg shadow-xl shadow-indigo-100"
              >
                Enter Portal
              </Button>
            </form>

            <div className="mt-8 flex justify-center">
              <Button
                variant="ghost"
                leftIcon={<FiArrowLeft />}
                onClick={() => router.push("/")}
                className="text-slate-400 hover:text-slate-600"
              >
                Back to Public Site
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
