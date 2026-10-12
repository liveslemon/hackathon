"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Button,
  Container,
  Typography,
  Card,
  Badge,
} from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Building2,
  Sparkles,
  GraduationCap,
  ArrowRight,
  FileCheck2,
  Search,
  ShieldCheck,
  Award,
  Users,
  ChevronRight,
  CalendarCheck,
  BrainCircuit,
  Lock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="bg-background min-h-screen text-fg overflow-x-hidden selection:bg-brand/20">
      {/* Navbar Minimalist */}
      <header className="px-4 sm:px-6 lg:px-12 py-3.5 flex justify-between items-center bg-surface/85 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <Link
          href="/"
          className="flex items-center gap-2.5 sm:gap-3 no-underline group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-lg"
          aria-label="PAU InterConnect Home"
        >
          <Image
            src="/favicon.ico"
            alt="PAU Logo"
            width={32}
            height={32}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain shadow-xs"
          />
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold text-fg tracking-tight group-hover:text-brand transition-colors">
              PAU InterConnect
            </span>
            <span className="text-[10px] text-fg-muted font-medium hidden sm:block -mt-1">
              Pan-Atlantic University
            </span>
          </div>
        </Link>

        {/* Navigation links (Desktop) */}
        <nav
          className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-fg-muted"
          aria-label="Main Navigation"
        >
          <a
            href="#how-it-works"
            className="hover:text-fg transition-colors"
          >
            How It Works
          </a>
          <a
            href="#for-students"
            className="hover:text-fg transition-colors"
          >
            For Students
          </a>
          <a
            href="#for-employers"
            className="hover:text-fg transition-colors"
          >
            For Employers
          </a>
          <a
            href="#siwes"
            className="hover:text-fg transition-colors"
          >
            SIWES
          </a>
        </nav>

        {/* Action controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle variant="icon-cycle" />
          <Button
            variant="ghost"
            href="/login/admin"
            className="hidden lg:inline-flex text-xs px-2.5 h-8 text-fg-muted hover:text-fg"
          >
            Admin
          </Button>
          <Button
            variant="outline"
            href="/login/employer"
            className="text-xs sm:text-sm px-2.5 sm:px-3.5 h-8 sm:h-9"
          >
            Employer
          </Button>
          <Button
            href="/login/student"
            className="text-xs sm:text-sm px-3 sm:px-4 h-8 sm:h-9 dark:bg-indigo-600 font-bold"
          >
            Student
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-28 overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center opacity-40 dark:opacity-20"
        >
          <div className="w-[600px] h-[350px] bg-brand/20 blur-[120px] rounded-full" />
          <div className="w-[450px] h-[300px] bg-brand-secondary/20 blur-[100px] rounded-full -translate-y-20" />
        </div>

        <Container maxWidth="lg" className="relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-subtle border border-brand/20 text-brand dark:text-indigo-300 text-xs sm:text-sm font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pan-Atlantic University Internship &amp; SIWES Portal</span>
              </div>

              <Typography
                variant="h1"
                className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-fg mb-6 leading-[1.12]"
              >
                Where Ambition Meets Opportunity,{" "}
                <span className="text-brand dark:text-indigo-400">Powered by AI</span>
              </Typography>

              <Typography
                variant="body1"
                className="text-base sm:text-lg text-fg-muted mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed"
              >
                Connect PAU students to premier internships and certified SIWES
                placements. Instant CV tailoring, AI skill matching, and seamless
                digital logbook verification.
              </Typography>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
                <Button
                  size="lg"
                  href="/login/student"
                  className="w-full sm:w-auto px-6 font-bold dark:bg-indigo-600"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Student Portal
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  href="/login/employer"
                  className="w-full sm:w-auto px-6 font-bold"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Employer Portal
                </Button>
              </div>

              <p className="text-xs text-fg-muted">
                University coordinator or supervisor?{" "}
                <Link
                  href="/login/admin"
                  className="text-brand dark:text-indigo-400 hover:underline font-bold inline-flex items-center gap-0.5"
                >
                  Sign in as Admin <ChevronRight className="w-3 h-3" />
                </Link>
              </p>
            </div>
          </div>

          {/* Interactive Feature Previews */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* Card 1: AI Match Preview */}
            <div className="transition-transform duration-300">
              <Card className="h-full p-5 sm:p-6 bg-surface border-border hover:border-brand/40 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <Badge variant="success" className="text-xs">
                    94% Fit Score
                  </Badge>
                </div>
                <Typography variant="h6" weight="bold" className="text-fg mb-1">
                  AI Role Matching
                </Typography>
                <Typography variant="caption" className="text-fg-muted block mb-4">
                  Software Engineering Intern &bull; Paystack
                </Typography>
                <div className="space-y-2 text-xs bg-surface-sunken p-3 rounded-lg border border-border-subtle mb-4">
                  <div className="flex items-center justify-between text-fg">
                    <span className="font-medium">Matched Skills:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      React, TS, Python
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-fg-muted">
                    <span>Gap Identified:</span>
                    <span className="text-amber-600 dark:text-amber-400">Docker, CI/CD</span>
                  </div>
                </div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Instant CV analysis provides personalized suggestions to improve your match score before applying.
                </p>
              </Card>
            </div>

            {/* Card 2: Employer Queue Preview */}
            <div className="transition-transform duration-300">
              <Card className="h-full p-5 sm:p-6 bg-surface border-border hover:border-brand/40 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="primary" className="text-xs font-semibold dark:text-indigo-300">
                    Verified Talent
                  </Badge>
                </div>
                <Typography variant="h6" weight="bold" className="text-fg mb-1">
                  Ranked Applicant Pool
                </Typography>
                <Typography variant="caption" className="text-fg-muted block mb-4">
                  School of Science and Technology (SST)
                </Typography>
                <div className="space-y-2 text-xs bg-surface-sunken p-3 rounded-lg border border-border-subtle mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-fg font-medium">Pending Review:</span>
                    <span className="font-bold text-fg">14 Candidates</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-fg-muted">Shortlisted:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">4 Interviews</span>
                  </div>
                </div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Employers evaluate pre-vetted candidates with AI-ranked relevance scores and verified academic standings.
                </p>
              </Card>
            </div>

            {/* Card 3: SIWES Logbook Preview */}
            <div className="transition-transform duration-300">
              <Card className="h-full p-5 sm:p-6 bg-surface border-border hover:border-brand/40 transition-all shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <Badge variant="neutral" className="text-xs font-semibold">
                    Week 6 Approved
                  </Badge>
                </div>
                <Typography variant="h6" weight="bold" className="text-fg mb-1">
                  Digital SIWES Logbook
                </Typography>
                <Typography variant="caption" className="text-fg-muted block mb-4">
                  Weekly Logs &amp; Supervisor Sign-off
                </Typography>
                <div className="space-y-2 text-xs bg-surface-sunken p-3 rounded-lg border border-border-subtle mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-fg-muted">Industry Supervisor:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Signed
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-fg-muted">Academic Coordinator:</span>
                    <span className="text-fg font-semibold">Verified</span>
                  </div>
                </div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Eliminate lost paper records. Seamless weekly submissions, attendance tracking, and grading for university credit.
                </p>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* Trust & Metric Highlights */}
      <section className="py-12 bg-surface-sunken border-y border-border">
        <Container maxWidth="lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4">
              <Typography variant="h3" weight="bold" className="text-fg mb-1">
                100%
              </Typography>
              <Typography variant="body2" className="text-fg-muted font-medium">
                Digital SIWES Compliance
              </Typography>
            </div>
            <div className="p-4">
              <Typography variant="h3" weight="bold" className="text-fg mb-1">
                94%+
              </Typography>
              <Typography variant="body2" className="text-fg-muted font-medium">
                Skill Match Accuracy
              </Typography>
            </div>
            <div className="p-4">
              <Typography variant="h3" weight="bold" className="text-fg mb-1">
                150+
              </Typography>
              <Typography variant="body2" className="text-fg-muted font-medium">
                Vetted Industry Partners
              </Typography>
            </div>
            <div className="p-4">
              <Typography variant="h3" weight="bold" className="text-fg mb-1">
                48 hrs
              </Typography>
              <Typography variant="body2" className="text-fg-muted font-medium">
                Avg. Employer Response
              </Typography>
            </div>
          </div>
        </Container>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-background">
        <Container maxWidth="lg">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="neutral" className="mb-3 text-xs font-semibold">
              Simple 4-Step Process
            </Badge>
            <Typography variant="h2" weight="bold" className="text-fg mb-4">
              How PAU InterConnect Works
            </Typography>
            <Typography variant="body1" className="text-fg-muted">
              From student enrollment to final supervisor grading, our platform
              streamlines every stage of your practical training.
            </Typography>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Complete Profile",
                desc: "Sign up with your PAU institutional credentials and select your degree programme and interests.",
                icon: <GraduationCap className="w-5 h-5" />,
              },
              {
                step: "02",
                title: "Upload & Tailor CV",
                desc: "Our AI model analyzes your resume, identifies strengths, and tailors keywords for each application.",
                icon: <BrainCircuit className="w-5 h-5" />,
              },
              {
                step: "03",
                title: "Apply to Top Roles",
                desc: "Explore curated internships from verified partner organizations and track your applications in real time.",
                icon: <Briefcase className="w-5 h-5" />,
              },
              {
                step: "04",
                title: "Log SIWES Progress",
                desc: "Submit weekly log entries, upload diagrams and reports, and receive feedback from both supervisors.",
                icon: <CalendarCheck className="w-5 h-5" />,
              },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="p-6 bg-surface border-border flex flex-col justify-between relative overflow-hidden group hover:border-brand/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-2xl font-black text-brand dark:text-indigo-400 tracking-tight">
                      {item.step}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-surface-sunken text-fg-muted group-hover:text-brand group-hover:bg-brand-subtle transition-colors flex items-center justify-center">
                      {item.icon}
                    </div>
                  </div>
                  <Typography variant="h6" weight="bold" className="text-fg mb-2">
                    {item.title}
                  </Typography>
                  <Typography variant="body2" className="text-fg-muted leading-relaxed">
                    {item.desc}
                  </Typography>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* For Students Section */}
      <section id="for-students" className="py-16 sm:py-24 bg-surface border-y border-border">
        <Container maxWidth="lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <Badge variant="primary" className="mb-3 text-xs font-semibold dark:text-indigo-300">
                For Students
              </Badge>
              <Typography variant="h2" weight="bold" className="text-fg mb-4">
                Launch Your Career with Confidence
              </Typography>
              <Typography variant="body1" className="text-fg-muted mb-6 leading-relaxed">
                Take the guesswork out of internship search. Get tailored recommendations,
                track employer status, and fulfill your degree requirements without paper logbooks.
              </Typography>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <Typography variant="body2" className="text-fg">
                    <strong>AI CV Tailoring:</strong> Optimize your resume per job description with actionable keyword suggestions.
                  </Typography>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <Typography variant="body2" className="text-fg">
                    <strong>Verified Companies:</strong> Apply directly to vetted partner organizations seeking PAU talent.
                  </Typography>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <Typography variant="body2" className="text-fg">
                    <strong>Never Lose SIWES Credit:</strong> Secure, cloud-synced logbook records approved by industry and university mentors.
                  </Typography>
                </div>
              </div>

              <Button size="lg" href="/login/student" className="font-bold dark:bg-indigo-600">
                Enter Student Portal <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-5 bg-surface-sunken border-border">
                  <Briefcase className="w-6 h-6 text-brand dark:text-indigo-400 mb-3" />
                  <Typography variant="h6" weight="bold" className="text-fg mb-1">
                    Direct Applications
                  </Typography>
                  <Typography variant="body2" className="text-fg-muted text-xs leading-relaxed">
                    One-click submission using your active, tailored CV with immediate receipt confirmation.
                  </Typography>
                </Card>

                <Card className="p-5 bg-surface-sunken border-border">
                  <TrendingUp className="w-6 h-6 text-brand dark:text-indigo-400 mb-3" />
                  <Typography variant="h6" weight="bold" className="text-fg mb-1">
                    Application Tracker
                  </Typography>
                  <Typography variant="body2" className="text-fg-muted text-xs leading-relaxed">
                    Real-time status updates from Under Review, Interview Scheduled, to Offer Received.
                  </Typography>
                </Card>

                <Card className="p-5 bg-surface-sunken border-border">
                  <ShieldCheck className="w-6 h-6 text-brand dark:text-indigo-400 mb-3" />
                  <Typography variant="h6" weight="bold" className="text-fg mb-1">
                    University Verification
                  </Typography>
                  <Typography variant="body2" className="text-fg-muted text-xs leading-relaxed">
                    Placements are reviewed and cleared by academic staff before starting work.
                  </Typography>
                </Card>

                <Card className="p-5 bg-surface-sunken border-border">
                  <Award className="w-6 h-6 text-brand dark:text-indigo-400 mb-3" />
                  <Typography variant="h6" weight="bold" className="text-fg mb-1">
                    Certified Completion
                  </Typography>
                  <Typography variant="body2" className="text-fg-muted text-xs leading-relaxed">
                    Export completed, signed logbooks as official documentation for graduation clearance.
                  </Typography>
                </Card>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* For Employers Section */}
      <section id="for-employers" className="py-16 sm:py-24 bg-background">
        <Container maxWidth="lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-5 bg-surface border-border">
                  <Building2 className="w-6 h-6 text-brand dark:text-indigo-400 mb-3" />
                  <Typography variant="h6" weight="bold" className="text-fg mb-1">
                    Pre-Vetted Academic Talent
                  </Typography>
                  <Typography variant="body2" className="text-fg-muted text-xs leading-relaxed">
                    Direct access to Pan-Atlantic University students from Computer Science, Media, and Engineering.
                  </Typography>
                </Card>

                <Card className="p-5 bg-surface border-border">
                  <Search className="w-6 h-6 text-brand dark:text-indigo-400 mb-3" />
                  <Typography variant="h6" weight="bold" className="text-fg mb-1">
                    AI-Ranked Screening
                  </Typography>
                  <Typography variant="body2" className="text-fg-muted text-xs leading-relaxed">
                    Save screening hours with algorithm-ranked candidate lists based on exact role requirements.
                  </Typography>
                </Card>

                <Card className="p-5 bg-surface border-border">
                  <CalendarCheck className="w-6 h-6 text-brand dark:text-indigo-400 mb-3" />
                  <Typography variant="h6" weight="bold" className="text-fg mb-1">
                    Fast Sign-Off Workflows
                  </Typography>
                  <Typography variant="body2" className="text-fg-muted text-xs leading-relaxed">
                    Quickly approve weekly student tasks and submit midterm evaluations in just a few clicks.
                  </Typography>
                </Card>

                <Card className="p-5 bg-surface border-border">
                  <Lock className="w-6 h-6 text-brand dark:text-indigo-400 mb-3" />
                  <Typography variant="h6" weight="bold" className="text-fg mb-1">
                    Secure &amp; Dedicated Portal
                  </Typography>
                  <Typography variant="body2" className="text-fg-muted text-xs leading-relaxed">
                    Role-isolated access ensures company job postings and candidate data remain fully protected.
                  </Typography>
                </Card>
              </div>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2">
              <Badge variant="primary" className="mb-3 text-xs font-semibold dark:text-indigo-300">
                For Employers
              </Badge>
              <Typography variant="h2" weight="bold" className="text-fg mb-4">
                Hire Vetted, High-Calibre PAU Talent
              </Typography>
              <Typography variant="body1" className="text-fg-muted mb-6 leading-relaxed">
                Connect directly with Pan-Atlantic University&apos;s brightest interns.
                Post roles, review scored candidates, and manage your intern cohort with zero friction.
              </Typography>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-subtle text-brand dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <Typography variant="body2" className="text-fg">
                    <strong>Zero Clutter:</strong> Ranked applicant lists highlight matching skills and courses immediately.
                  </Typography>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-subtle text-brand dark:text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <Typography variant="body2" className="text-fg">
                    <strong>Direct Engagement:</strong> Schedule interviews and make offers directly within the portal.
                  </Typography>
                </div>
              </div>

              <Button size="lg" variant="outline" href="/login/employer" className="font-bold">
                Employer Sign In <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* SIWES Compliance Section */}
      <section id="siwes" className="py-16 sm:py-24 bg-surface-sunken border-t border-border">
        <Container maxWidth="md" className="text-center">
          <Badge variant="neutral" className="mb-3 text-xs font-semibold">
            University Certified
          </Badge>
          <Typography variant="h2" weight="bold" className="text-fg mb-4">
            Official SIWES &amp; Internship Compliance
          </Typography>
          <Typography variant="body1" className="text-fg-muted mb-10 max-w-2xl mx-auto leading-relaxed">
            PAU InterConnect is officially sanctioned by Pan-Atlantic University to provide
            digital logbook tracking, weekly supervisor sign-offs, and final grading
            for academic credits.
          </Typography>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <Card className="p-5 bg-surface border-border">
              <Typography variant="h6" weight="bold" className="text-fg mb-1">
                Student
              </Typography>
              <p className="text-xs text-fg-muted leading-relaxed">
                Log weekly work entries, upload technical artifacts, and monitor university supervisor reviews.
              </p>
            </Card>
            <Card className="p-5 bg-surface border-border">
              <Typography variant="h6" weight="bold" className="text-fg mb-1">
                Industry Mentor
              </Typography>
              <p className="text-xs text-fg-muted leading-relaxed">
                Weekly digital stamp and comments confirming the student&apos;s physical or remote attendance and work.
              </p>
            </Card>
            <Card className="p-5 bg-surface border-border">
              <Typography variant="h6" weight="bold" className="text-fg mb-1">
                PAU Coordinator
              </Typography>
              <p className="text-xs text-fg-muted leading-relaxed">
                Review midterm assessments, audit student performance, and assign verified academic grade units.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 sm:py-20 bg-background">
        <Container maxWidth="lg">
          <Card className="p-8 sm:p-12 bg-gradient-to-br from-brand to-brand-secondary text-white text-center rounded-2xl shadow-xl relative overflow-hidden border-0">
            <div className="relative z-10 max-w-2xl mx-auto">
              <Typography variant="h2" color="white" className="mb-4">
                Ready to Accelerate Your Career or Hire Top Talent?
              </Typography>
              <Typography variant="body1" className="text-white/90 mb-8 leading-relaxed">
                Join students and employers across Nigeria leveraging Pan-Atlantic
                University&apos;s unified placement platform.
              </Typography>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  colorType="secondary"
                  href="/login/student"
                  className="w-full sm:w-auto bg-surface text-fg hover:bg-surface-sunken font-bold"
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Get Started as Student
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  href="/login/employer"
                  className="w-full sm:w-auto border-surface/40 text-surface hover:bg-surface/20 font-bold"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Partner as Employer
                </Button>
              </div>
            </div>
          </Card>
        </Container>
      </section>

      {/* Accessible Footer */}
      <footer className="bg-surface-sunken border-t border-border pt-16 pb-12 text-fg-muted">
        <Container maxWidth="lg">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 mb-12">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2.5 mb-4">
                <Image
                  src="/favicon.ico"
                  alt="PAU Logo"
                  width={28}
                  height={28}
                  className="rounded-md object-contain"
                />
                <span className="font-bold text-fg tracking-tight">
                  PAU InterConnect
                </span>
              </div>
              <p className="text-xs text-fg-muted leading-relaxed max-w-sm mb-4">
                Pan-Atlantic University&apos;s intelligent internship matching
                and SIWES logbook platform. Bridging classroom theory with corporate excellence.
              </p>
              <p className="text-xs text-fg-muted">
                Km 52, Lekki-Epe Expressway, Ibeju-Lekki, Lagos, Nigeria.
              </p>
            </div>

            <div className="col-span-6 md:col-span-2">
              <Typography weight="bold" className="text-xs uppercase tracking-wider text-fg mb-4">
                Portals
              </Typography>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/login/student" className="hover:text-fg transition-colors">
                    Student Login
                  </Link>
                </li>
                <li>
                  <Link href="/login/employer" className="hover:text-fg transition-colors">
                    Employer Login
                  </Link>
                </li>
                <li>
                  <Link href="/login/admin" className="hover:text-fg transition-colors">
                    Admin Portal
                  </Link>
                </li>
                <li>
                  <Link href="/onboarding" className="hover:text-fg transition-colors">
                    Onboarding
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-6 md:col-span-2">
              <Typography weight="bold" className="text-xs uppercase tracking-wider text-fg mb-4">
                Programmes
              </Typography>
              <ul className="space-y-2 text-xs">
                <li>
                  <span className="text-fg-muted">SST (Science &amp; Tech)</span>
                </li>
                <li>
                  <span className="text-fg-muted">SMC (Media &amp; Comm)</span>
                </li>
                <li>
                  <span className="text-fg-muted">EBS (Business School)</span>
                </li>
                <li>
                  <span className="text-fg-muted">SIWES Accreditation</span>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <Typography weight="bold" className="text-xs uppercase tracking-wider text-fg mb-4">
                Support
              </Typography>
              <p className="text-xs text-fg-muted mb-3">
                Have questions or need assistance with your placement account?
              </p>
              <a
                href="mailto:interconnect@pau.edu.ng"
                className="text-xs text-brand dark:text-indigo-400 hover:underline font-semibold"
              >
                interconnect@pau.edu.ng
              </a>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-fg-muted">
            <p>&copy; {new Date().getFullYear()} Pan-Atlantic University. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/login/student" className="hover:text-fg transition-colors">
                Privacy
              </Link>
              <Link href="/login/student" className="hover:text-fg transition-colors">
                Terms
              </Link>
              <Link href="/login/admin" className="hover:text-fg transition-colors">
                Coordinator Access
              </Link>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
