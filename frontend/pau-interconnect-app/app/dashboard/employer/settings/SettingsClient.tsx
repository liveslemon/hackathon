"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Typography, Button, Input } from "@/components/ui";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types/domain";
import { companySettingsSchema, type CompanySettingsInput } from "@/lib/validations/employer";
import { ExternalLink, CheckCircle2, AlertCircle, Building2, Bell } from "lucide-react";

interface EmployerSettingsProfile extends Partial<Profile> {
  company_name?: string | null;
  company_description?: string | null;
  company_website?: string | null;
  company_logo_url?: string | null;
  company_banner_url?: string | null;
  industry?: string | null;
  culture?: string | null;
  notification_preferences?: {
    email_new_applicant?: boolean;
    email_logbook_submitted?: boolean;
    email_deadline_reminder?: boolean;
  } | null;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred.";
}

interface SettingsClientProps {
  user: User | null;
  profile: EmployerSettingsProfile | null;
}

export default function SettingsClient({ user, profile }: SettingsClientProps) {
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initialNotificationPrefs = profile?.notification_preferences || {
    email_new_applicant: true,
    email_logbook_submitted: true,
    email_deadline_reminder: true,
  };

  const [formData, setFormData] = useState({
    company_name: profile?.company_name || profile?.full_name || "",
    company_description: profile?.company_description || "",
    company_website: profile?.company_website || "",
    company_logo_url: profile?.company_logo_url || "",
    company_banner_url: profile?.company_banner_url || "",
    industry: profile?.industry || "",
    culture: profile?.culture || "",
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    email_new_applicant: initialNotificationPrefs.email_new_applicant ?? true,
    email_logbook_submitted: initialNotificationPrefs.email_logbook_submitted ?? true,
    email_deadline_reminder: initialNotificationPrefs.email_deadline_reminder ?? true,
  });

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(
    profile?.company_logo_url || "",
  );
  const [bannerPreview, setBannerPreview] = useState<string>(
    profile?.company_banner_url || "",
  );

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:"))
        URL.revokeObjectURL(logoPreview);
      if (bannerPreview && bannerPreview.startsWith("blob:"))
        URL.revokeObjectURL(bannerPreview);
    };
  }, [logoPreview, bannerPreview]);

  // Warn about unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleNotificationToggle = (key: keyof typeof notificationPrefs) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasUnsavedChanges(true);
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "company_logo_url" | "company_banner_url",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "File must be under 2MB." });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Only image files (PNG, JPG, WebP) are allowed." });
      return;
    }

    setMessage(null);
    const previewUrl = URL.createObjectURL(file);
    if (field === "company_logo_url") {
      setLogoFile(file);
      setLogoPreview(previewUrl);
    } else {
      setBannerFile(file);
      setBannerPreview(previewUrl);
    }
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setFieldErrors({});

    // 1. Client-side schema validation before touching storage
    const rawPayload: CompanySettingsInput = {
      ...formData,
      notification_preferences: notificationPrefs,
    };

    const validation = companySettingsSchema.safeParse(rawPayload);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const [field, msgs] of Object.entries(validation.error.flatten().fieldErrors)) {
        if (msgs && msgs[0]) {
          errors[field] = msgs[0];
        }
      }
      setFieldErrors(errors);
      setMessage({ type: "error", text: "Please correct the errors in the form before saving." });
      setLoading(false);
      return;
    }

    const uploadedPaths: string[] = [];

    try {
      let logoUrl = formData.company_logo_url;
      let bannerUrl = formData.company_banner_url;

      // 2. Upload logo if changed
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${user?.id}-logo-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from("company_assets")
          .upload(fileName, logoFile, { upsert: true });
        if (error) throw new Error(`Logo upload failed: ${error.message}`);

        uploadedPaths.push(fileName);
        const { data } = supabase.storage
          .from("company_assets")
          .getPublicUrl(fileName);
        logoUrl = data.publicUrl;
      }

      // 3. Upload banner if changed
      if (bannerFile) {
        const fileExt = bannerFile.name.split(".").pop();
        const fileName = `${user?.id}-banner-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from("company_assets")
          .upload(fileName, bannerFile, { upsert: true });
        if (error) {
          // Rollback logo upload if banner fails
          for (const path of uploadedPaths) {
            await supabase.storage.from("company_assets").remove([path]).catch(() => {});
          }
          throw new Error(`Banner upload failed: ${error.message}`);
        }

        uploadedPaths.push(fileName);
        const { data } = supabase.storage
          .from("company_assets")
          .getPublicUrl(fileName);
        bannerUrl = data.publicUrl;
      }

      // 4. Save metadata atomically to backend
      const payload = {
        ...formData,
        company_logo_url: logoUrl,
        company_banner_url: bannerUrl,
        notification_preferences: notificationPrefs,
      };

      const { authenticatedFetch, backendUrl } = await import("@/lib/api");

      try {
        await authenticatedFetch<{ message?: string }>(
          backendUrl("/api/employer/profile"),
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );
      } catch (patchErr) {
        // Rollback uploaded assets if database metadata save fails
        for (const path of uploadedPaths) {
          await supabase.storage.from("company_assets").remove([path]).catch(() => {});
        }
        throw patchErr;
      }

      // Also ensure profile in Supabase table reflects company_name if backend didn't
      if (user?.id) {
        await supabase
          .from("profiles")
          .update({
            company_name: formData.company_name,
            notification_preferences: notificationPrefs,
          })
          .eq("id", user.id);
      }

      setFormData(payload);
      setLogoFile(null);
      setBannerFile(null);
      setHasUnsavedChanges(false);
      setMessage({ type: "success", text: "Company profile updated successfully!" });
    } catch (err: unknown) {
      setMessage({ type: "error", text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Typography variant="h3" className="text-slate-800">
            Company Settings
          </Typography>
          <Typography variant="body1" className="text-slate-500 mt-2">
            Update your company&apos;s public profile, branding, and notification details.
          </Typography>
        </div>
        {user?.id && (
          <Link
            href={`/companies/${user.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-100 self-start"
          >
            <ExternalLink className="w-4 h-4" />
            View Public Profile
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Company Name */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Name
              </label>
              <Input
                name="company_name"
                placeholder="e.g. Acme Tech Solutions"
                value={formData.company_name}
                onChange={handleChange}
              />
              {fieldErrors.company_name && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.company_name}</p>
              )}
            </div>

            {/* Company Website */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Website
              </label>
              <Input
                name="company_website"
                placeholder="https://example.com"
                value={formData.company_website}
                onChange={handleChange}
              />
              {fieldErrors.company_website && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.company_website}</p>
              )}
            </div>

            {/* Company Logo */}
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={48}
                      height={48}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                    <Building2 className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, "company_logo_url")}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Square PNG or JPG recommended. Max 2MB.</p>
            </div>

            {/* Company Banner */}
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Banner
              </label>
              <div className="flex items-center gap-4">
                {bannerPreview ? (
                  <div className="w-20 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                    <Image
                      src={bannerPreview}
                      alt="Banner preview"
                      width={80}
                      height={48}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-12 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                    <Building2 className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, "company_banner_url")}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Wide banner (around 3:1). Max 2MB.</p>
            </div>

            {/* Industry */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Industry
              </label>
              <Input
                name="industry"
                placeholder="e.g. Fintech, Healthcare, Software Engineering"
                value={formData.industry}
                onChange={handleChange}
              />
              {fieldErrors.industry && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.industry}</p>
              )}
            </div>

            {/* Company Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Description
              </label>
              <textarea
                name="company_description"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm placeholder:text-slate-400"
                placeholder="Briefly describe what your company does, its mission and impact..."
                value={formData.company_description}
                onChange={handleChange}
              />
              {fieldErrors.company_description && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.company_description}</p>
              )}
            </div>

            {/* Culture & Perks */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Culture & Perks
              </label>
              <textarea
                name="culture"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm placeholder:text-slate-400"
                placeholder="What is it like to work at your company? Mention mentorship, flexibility, team environment..."
                value={formData.culture}
                onChange={handleChange}
              />
              {fieldErrors.culture && (
                <p className="text-xs text-rose-500 mt-1">{fieldErrors.culture}</p>
              )}
            </div>
          </div>

          <hr className="border-slate-100 my-6" />

          {/* Notification Preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-400" />
              <h4 className="text-sm font-bold text-slate-800">
                Email Notification Preferences
              </h4>
            </div>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.email_new_applicant}
                  onChange={() => handleNotificationToggle("email_new_applicant")}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500/20"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    New applicant notifications
                  </span>
                  <p className="text-xs text-slate-400">
                    Receive an email when a student applies to one of your internship postings.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.email_logbook_submitted}
                  onChange={() => handleNotificationToggle("email_logbook_submitted")}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500/20"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    Logbook entry submissions
                  </span>
                  <p className="text-xs text-slate-400">
                    Receive an email when your intern submits a SIWES logbook entry for weekly review.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationPrefs.email_deadline_reminder}
                  onChange={() => handleNotificationToggle("email_deadline_reminder")}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500/20"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    Application deadline reminders
                  </span>
                  <p className="text-xs text-slate-400">
                    Receive a reminder email 3 days before your posting application deadline closes.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            {message && (
              <div
                className={`flex items-center gap-2 text-sm font-medium ${
                  message.type === "success" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}
            {!message && <span />}
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-indigo-500/25 px-8"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

