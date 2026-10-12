"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Typography,
  Button,
  Input,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  PageHeader,
} from "@/components/ui";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types/domain";
import {
  companySettingsSchema,
  type CompanySettingsInput,
} from "@/lib/validations/employer";
import {
  ExternalLink,
  Building2,
  Bell,
  Save,
  Upload,
  Globe,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

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
    email_logbook_submitted:
      initialNotificationPrefs.email_logbook_submitted ?? true,
    email_deadline_reminder:
      initialNotificationPrefs.email_deadline_reminder ?? true,
  });

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
      toast.error("File size must be under 2MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files (PNG, JPG, WebP) are allowed.");
      return;
    }

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
    setFieldErrors({});

    // 1. Client-side schema validation before touching storage
    const rawPayload: CompanySettingsInput = {
      ...formData,
      notification_preferences: notificationPrefs,
    };

    const validation = companySettingsSchema.safeParse(rawPayload);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const [field, msgs] of Object.entries(
        validation.error.flatten().fieldErrors,
      )) {
        if (msgs && msgs[0]) {
          errors[field] = msgs[0];
        }
      }
      setFieldErrors(errors);
      toast.error("Please correct the highlighted form errors before saving.");
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
            await supabase.storage
              .from("company_assets")
              .remove([path])
              .catch(() => {});
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
          await supabase.storage
            .from("company_assets")
            .remove([path])
            .catch(() => {});
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
      toast.success("Company profile and branding saved successfully!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <PageHeader
        title="Company Settings"
        description="Manage your organization profile, visual brand identity, and recruitment notifications."
        actions={
          user?.id ? (
            <Link
              href={`/companies/${user.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                View Public Profile
              </Button>
            </Link>
          ) : undefined
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand Identity & Visual Assets */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-medium text-xs">
              <Building2 className="w-4 h-4" />
              <span>BRANDING & ASSETS</span>
            </div>
            <CardTitle className="text-base">Organization Identity</CardTitle>
            <CardDescription>
              Upload high-resolution company emblems and banner artwork shown to students.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Company Legal / Trading Name"
                  name="company_name"
                  placeholder="e.g. Acme Tech Solutions"
                  value={formData.company_name}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.company_name && (
                  <p className="text-danger-fg text-xs mt-1 font-medium">
                    {fieldErrors.company_name}
                  </p>
                )}
              </div>

              <div>
                <Input
                  label="Official Website URL"
                  name="company_website"
                  placeholder="https://example.com"
                  value={formData.company_website}
                  onChange={handleChange}
                />
                {fieldErrors.company_website && (
                  <p className="text-danger-fg text-xs mt-1 font-medium">
                    {fieldErrors.company_website}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Logo Upload & Preview */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-fg">
                  Company Emblem / Logo
                </label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="w-14 h-14 rounded-xl bg-surface-raised overflow-hidden border border-border shrink-0 shadow-xs">
                      <Image
                        src={logoPreview}
                        alt="Logo preview"
                        width={56}
                        height={56}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-surface-sunken flex items-center justify-center border border-border shrink-0 text-muted-fg">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <input
                      type="file"
                      id="logo-upload"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, "company_logo_url")}
                      className="hidden"
                    />
                    <label htmlFor="logo-upload">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-2"
                        onClick={() =>
                          document.getElementById("logo-upload")?.click()
                        }
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Choose Logo
                      </Button>
                    </label>
                    <p className="text-xs text-muted-fg mt-1">
                      Square PNG or JPG recommended. Max 2MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner Upload & Preview */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-fg">
                  Company Cover Banner
                </label>
                <div className="flex items-center gap-4">
                  {bannerPreview ? (
                    <div className="w-24 h-14 rounded-xl bg-surface-raised overflow-hidden border border-border shrink-0 shadow-xs">
                      <Image
                        src={bannerPreview}
                        alt="Banner preview"
                        width={96}
                        height={56}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-14 rounded-xl bg-surface-sunken flex items-center justify-center border border-border shrink-0 text-muted-fg">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <input
                      type="file"
                      id="banner-upload"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, "company_banner_url")}
                      className="hidden"
                    />
                    <label htmlFor="banner-upload">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer gap-2"
                        onClick={() =>
                          document.getElementById("banner-upload")?.click()
                        }
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Choose Banner
                      </Button>
                    </label>
                    <p className="text-xs text-muted-fg mt-1">
                      Wide banner (approx 3:1). Max 2MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Input
                label="Primary Industry Sector"
                name="industry"
                placeholder="e.g. Fintech, Healthcare, Software Engineering"
                value={formData.industry}
                onChange={handleChange}
              />
              {fieldErrors.industry && (
                <p className="text-danger-fg text-xs mt-1 font-medium">
                  {fieldErrors.industry}
                </p>
              )}
            </div>

            <div>
              <Textarea
                label="Company Mission & Description"
                name="company_description"
                rows={4}
                placeholder="Briefly describe what your organization does, its mission and impact..."
                value={formData.company_description}
                onChange={handleChange}
              />
              {fieldErrors.company_description && (
                <p className="text-danger-fg text-xs mt-1 font-medium">
                  {fieldErrors.company_description}
                </p>
              )}
            </div>

            <div>
              <Textarea
                label="Company Culture, Perks & Mentorship"
                name="culture"
                rows={3}
                placeholder="What is it like to work at your organization? Mention mentorship, tools, student growth..."
                value={formData.culture}
                onChange={handleChange}
              />
              {fieldErrors.culture && (
                <p className="text-danger-fg text-xs mt-1 font-medium">
                  {fieldErrors.culture}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Notification Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary font-medium text-xs">
              <Bell className="w-4 h-4" />
              <span>NOTIFICATIONS</span>
            </div>
            <CardTitle className="text-base">Email Notification Preferences</CardTitle>
            <CardDescription>
              Configure automated notifications dispatched to your verified employer address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-canvas/50 transition-colors">
              <input
                type="checkbox"
                checked={notificationPrefs.email_new_applicant}
                onChange={() => handleNotificationToggle("email_new_applicant")}
                className="mt-0.5 rounded text-primary focus:ring-primary border-border"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-fg">
                  New Applicant Alerts
                </span>
                <p className="text-xs text-muted-fg">
                  Receive real-time notifications when a PAU student applies to an active opening.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-canvas/50 transition-colors">
              <input
                type="checkbox"
                checked={notificationPrefs.email_logbook_submitted}
                onChange={() =>
                  handleNotificationToggle("email_logbook_submitted")
                }
                className="mt-0.5 rounded text-primary focus:ring-primary border-border"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-fg">
                  SIWES Logbook Submissions
                </span>
                <p className="text-xs text-muted-fg">
                  Receive an email alert whenever an intern submits a logbook activity for employer sign-off.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-canvas/50 transition-colors">
              <input
                type="checkbox"
                checked={notificationPrefs.email_deadline_reminder}
                onChange={() =>
                  handleNotificationToggle("email_deadline_reminder")
                }
                className="mt-0.5 rounded text-primary focus:ring-primary border-border"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-fg">
                  Application Deadline Reminders
                </span>
                <p className="text-xs text-muted-fg">
                  Receive a prompt 3 days before any of your active internship deadlines expire.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            isLoading={loading}
            className="gap-2 px-6"
          >
            <Save className="w-4 h-4" />
            Save Profile & Preferences
          </Button>
        </div>
      </form>
    </div>
  );
}


