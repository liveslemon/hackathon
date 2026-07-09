"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Typography } from "@/components/ui";
import { Globe, Users, Building, MapPin } from "lucide-react";
import InternshipCard from "@/components/InternshipCard";
import type { Internship, Profile } from "@/types/domain";

interface CompanyClientProps {
  employerId: string;
}

interface CompanyProfile extends Partial<Profile> {
  full_name?: string | null;
  company_banner_url?: string | null;
  company_logo_url?: string | null;
  company_description?: string | null;
  company_website?: string | null;
  industry?: string | null;
  culture?: string | null;
}

interface CompanyResponse {
  company: CompanyProfile;
  internships: Internship[];
}

interface InternshipCardItem {
  id: string;
  company: string;
  role: string;
  location: string;
  deadline: string;
  category: string;
  matchPercentage?: number;
  imageUrl?: string;
  applicationStatus?: string;
  poster_id?: string;
}

export default function CompanyClient({ employerId }: CompanyClientProps) {
  const [data, setData] = useState<CompanyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `http://localhost:8000/api/companies/${employerId}`,
        );
        if (!res.ok) throw new Error("Failed to load company");
        const json = (await res.json()) as CompanyResponse;
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load company");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [employerId]);

  if (loading)
    return (
      <div className="p-12 text-center text-slate-500">Loading company...</div>
    );
  if (error)
    return <div className="p-12 text-center text-red-500">{error}</div>;
  if (!data) return null;

  const { company, internships } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="bg-white rounded-3xl border border-slate-100/60 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative">
        <div className="h-56 relative bg-slate-100">
          {company.company_banner_url ? (
            <Image
              src={company.company_banner_url}
              alt={`${company.full_name || "Company"} banner`}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-brand to-brand/70 relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            </div>
          )}
        </div>
        <div className="px-10 pb-10 relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-20 sm:-mt-24 mb-8 gap-4">
            <div className="flex items-end gap-6">
              <div className="w-32 h-32 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                {company.company_logo_url ? (
                  <Image
                    src={company.company_logo_url}
                    alt={company.full_name || "Company"}
                    width={128}
                    height={128}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building className="w-12 h-12 text-slate-300" />
                )}
              </div>
              <div className="mb-2">
                <Typography
                  variant="h2"
                  weight="bold"
                  className="text-slate-900 tracking-tight"
                >
                  {company.full_name}
                </Typography>
                <div className="flex items-center gap-4 mt-3 text-slate-500 text-sm font-medium">
                  {company.industry && (
                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-full text-slate-600 shadow-sm">
                      {company.industry}
                    </span>
                  )}
                  {company.company_website && (
                    <a
                      href={
                        company.company_website.startsWith("http")
                          ? company.company_website
                          : `https://${company.company_website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 hover:text-brand transition-colors bg-brand/5 text-brand px-4 py-1.5 rounded-full"
                    >
                      <Globe className="w-4 h-4" /> Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="md:col-span-2 space-y-10">
              {company.company_description && (
                <section>
                  <Typography
                    variant="h4"
                    weight="bold"
                    className="text-slate-800 mb-4"
                  >
                    About Us
                  </Typography>
                  <Typography
                    variant="body1"
                    className="text-slate-600 leading-relaxed whitespace-pre-wrap"
                  >
                    {company.company_description}
                  </Typography>
                </section>
              )}
              {company.culture && (
                <section>
                  <Typography
                    variant="h4"
                    weight="bold"
                    className="text-slate-800 mb-4"
                  >
                    Culture & Perks
                  </Typography>
                  <Typography
                    variant="body1"
                    className="text-slate-600 leading-relaxed whitespace-pre-wrap"
                  >
                    {company.culture}
                  </Typography>
                </section>
              )}
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-100/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] h-fit space-y-5">
              <Typography
                variant="h5"
                weight="bold"
                className="text-slate-800 mb-6"
              >
                Company Overview
              </Typography>
              <div className="flex items-center gap-4 text-slate-600">
                <div className="w-10 h-10 rounded-full bg-brand/5 flex items-center justify-center text-brand">
                  <Building className="w-5 h-5" />
                </div>
                <span className="font-medium">
                  {company.industry || "Industry unlisted"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-600">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Users className="w-5 h-5" />
                </div>
                <span className="font-medium">Verified Employer</span>
              </div>
              <div className="flex items-center gap-4 text-slate-600">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="font-medium">Global / Remote</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Internships List */}
      <div className="pt-4">
        <Typography
          variant="h3"
          weight="bold"
          className="text-slate-800 mb-6 tracking-tight"
        >
          Open Internships
        </Typography>
        {internships.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <Typography variant="body1" className="text-slate-500">
              No open roles at the moment.
            </Typography>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {internships.map((job) => {
              const cardItem: InternshipCardItem = {
                id: job.id,
                company: job.company,
                role: job.role,
                location: job.location,
                deadline: job.deadline ?? "",
                category: job.category ?? job.field ?? "Internship",
                matchPercentage:
                  typeof job.matchPercentage === "number"
                    ? job.matchPercentage
                    : undefined,
                imageUrl: job.imageUrl ?? undefined,
                applicationStatus:
                  typeof job.applicationStatus === "string"
                    ? job.applicationStatus
                    : undefined,
                poster_id:
                  typeof job.poster_id === "string" ? job.poster_id : undefined,
              };

              return <InternshipCard key={job.id} internship={cardItem} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
