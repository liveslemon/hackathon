"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Typography, Button, Input } from "@/components/ui";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types/domain";

interface EmployerSettingsProfile extends Partial<Profile> {
  company_description?: string | null;
  company_website?: string | null;
  company_logo_url?: string | null;
  company_banner_url?: string | null;
  industry?: string | null;
  culture?: string | null;
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
  const [formData, setFormData] = useState({
    company_description: profile?.company_description || "",
    company_website: profile?.company_website || "",
    company_logo_url: profile?.company_logo_url || "",
    company_banner_url: profile?.company_banner_url || "",
    industry: profile?.industry || "",
    culture: profile?.culture || "",
  });
  const [message, setMessage] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>(
    profile?.company_logo_url || "",
  );
  const [bannerPreview, setBannerPreview] = useState<string>(
    profile?.company_banner_url || "",
  );

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith("blob:"))
        URL.revokeObjectURL(logoPreview);
      if (bannerPreview && bannerPreview.startsWith("blob:"))
        URL.revokeObjectURL(bannerPreview);
    };
  }, [logoPreview, bannerPreview]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "company_logo_url" | "company_banner_url",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage("File must be under 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Only image files are allowed");
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      let logoUrl = formData.company_logo_url;
      let bannerUrl = formData.company_banner_url;
      const uploadedPaths: string[] = [];

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

      if (bannerFile) {
        const fileExt = bannerFile.name.split(".").pop();
        const fileName = `${user?.id}-banner-${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage
          .from("company_assets")
          .upload(fileName, bannerFile, { upsert: true });
        if (error) {
          for (const path of uploadedPaths) {
            await supabase.storage.from("company_assets").remove([path]);
          }
          throw new Error(`Banner upload failed: ${error.message}`);
        }

        uploadedPaths.push(fileName);
        const { data } = supabase.storage
          .from("company_assets")
          .getPublicUrl(fileName);
        bannerUrl = data.publicUrl;
      }

      const payload = {
        ...formData,
        company_logo_url: logoUrl,
        company_banner_url: bannerUrl,
      };
      const { authenticatedFetch, backendUrl } = await import("@/lib/api");

      await authenticatedFetch<{ success?: boolean }>(backendUrl("/api/employer/profile"), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setFormData(payload);
      setLogoFile(null);
      setBannerFile(null);
      setMessage("Company profile updated successfully!");
    } catch (err: unknown) {
      setMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Typography variant="h3" className="text-slate-800">
          Company Settings
        </Typography>
        <Typography variant="body1" className="text-slate-500 mt-2">
          Update your company&apos;s public profile details.
        </Typography>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, "company_logo_url")}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 transition-all cursor-pointer"
                />
              </div>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Banner
              </label>
              <div className="flex items-center gap-4">
                {bannerPreview && (
                  <div className="w-20 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                    <Image
                      src={bannerPreview}
                      alt="Banner preview"
                      width={80}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, "company_banner_url")}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 transition-all cursor-pointer"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Industry
              </label>
              <Input
                name="industry"
                placeholder="e.g. Fintech, Healthcare, E-commerce"
                value={formData.industry}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Description
              </label>
              <textarea
                name="company_description"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm placeholder:text-slate-400"
                placeholder="Briefly describe what your company does..."
                value={formData.company_description}
                onChange={handleChange}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company Culture & Perks
              </label>
              <textarea
                name="culture"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm placeholder:text-slate-400"
                placeholder="What is it like to work at your company? Mention perks, values, etc."
                value={formData.culture}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            {message && (
              <span
                className={`text-sm font-medium ${message.includes("success") ? "text-green-600" : "text-red-600"}`}
              >
                {message}
              </span>
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
