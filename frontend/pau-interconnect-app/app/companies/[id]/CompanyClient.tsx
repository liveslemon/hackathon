"use client";
import React from "react";
import Image from "next/image";
import { Typography, Card, Badge, EmptyState } from "@/components/ui";
import { Globe, Users, Building, Briefcase } from "lucide-react";
import InternshipCard from "@/components/InternshipCard";
import type { Internship } from "@/types/domain";

export interface CompanyPublicProfile {
  id: string;
  role?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  company_banner_url?: string | null;
  company_logo_url?: string | null;
  company_description?: string | null;
  company_website?: string | null;
  industry?: string | null;
  culture?: string | null;
}

interface CompanyClientProps {
  company: CompanyPublicProfile;
  internships: Internship[];
}

export default function CompanyClient({
  company,
  internships,
}: CompanyClientProps) {
  const companyName =
    company.company_name || company.full_name || "Company";

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <Card className="rounded-3xl border border-border overflow-hidden relative">
        <div className="h-56 relative bg-surface-sunken border-b border-border">
          {company.company_banner_url ? (
            <Image
              src={company.company_banner_url}
              alt={`${companyName} banner`}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 via-primary/10 to-transparent relative">
              <div className="absolute inset-0 bg-radial from-primary/10 to-transparent opacity-50" />
            </div>
          )}
        </div>
        <div className="px-6 sm:px-10 pb-10 relative">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-20 sm:-mt-24 mb-8 gap-4">
            <div className="flex items-end gap-6">
              <div className="w-32 h-32 rounded-2xl bg-surface border-4 border-surface shadow-md overflow-hidden flex items-center justify-center shrink-0">
                {company.company_logo_url ? (
                  <Image
                    src={company.company_logo_url}
                    alt={companyName}
                    width={128}
                    height={128}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building className="w-12 h-12 text-fg-subtle" />
                )}
              </div>
              <div className="mb-2">
                <Typography
                  variant="h2"
                  weight="bold"
                  className="text-fg tracking-tight"
                >
                  {companyName}
                </Typography>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-fg-muted text-sm font-medium">
                  {company.industry && (
                    <Badge variant="neutral" size="md">
                      {company.industry}
                    </Badge>
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
                      className="flex items-center gap-1.5 hover:text-primary transition-colors bg-primary/10 text-primary px-3.5 py-1.5 rounded-full text-xs font-semibold"
                    >
                      <Globe className="w-3.5 h-3.5" /> Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              {company.company_description && (
                <section>
                  <Typography
                    variant="h4"
                    weight="bold"
                    className="text-fg mb-3"
                  >
                    About Us
                  </Typography>
                  <Typography
                    variant="body1"
                    className="text-fg-muted leading-relaxed whitespace-pre-wrap"
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
                    className="text-fg mb-3"
                  >
                    Culture & Perks
                  </Typography>
                  <Typography
                    variant="body1"
                    className="text-fg-muted leading-relaxed whitespace-pre-wrap"
                  >
                    {company.culture}
                  </Typography>
                </section>
              )}
            </div>

            <div className="bg-surface-sunken/40 rounded-2xl p-6 border border-border h-fit space-y-4">
              <Typography
                variant="h5"
                weight="bold"
                className="text-fg mb-4"
              >
                Company Overview
              </Typography>
              <div className="flex items-center gap-3 text-fg-muted text-sm">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <span className="font-medium">
                  {company.industry || "Industry unlisted"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-fg-muted text-sm">
                <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-medium">Verified Employer Partner</span>
              </div>
              <div className="flex items-center gap-3 text-fg-muted text-sm">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className="font-medium">
                  {internships.length}{" "}
                  {internships.length === 1 ? "Open Role" : "Open Roles"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Internships List */}
      <div className="pt-2">
        <Typography
          variant="h3"
          weight="bold"
          className="text-fg mb-6 tracking-tight"
        >
          Open Internships
        </Typography>
        {internships.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-10 h-10 text-fg-subtle" />}
            title="No open roles at the moment"
            description="This company currently has no active internship postings. Check back later or browse other listings."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {internships.map((job) => {
              const cardItem = {
                id: job.id,
                company: job.company || companyName,
                role: job.role || "Intern",
                location: job.location || "Lagos, Nigeria",
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
