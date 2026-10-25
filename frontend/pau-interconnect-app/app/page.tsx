import Link from "next/link";
import { Briefcase, Building2, TrendingUp } from "lucide-react";
import "./_landing/landing.css";
import { landingMono, landingSans, landingSerif } from "./_landing/fonts";
import { Hero } from "./_landing/Hero";
import { Nav } from "./_landing/Nav";
import { Reveal } from "./_landing/Reveal";

const SERVICES = [
  {
    title: "Student CV Upload & Tailoring",
    desc: "Students upload their CV, which is parsed by AI. They can instantly tailor it per internship role with a single click.",
    icon: Briefcase,
  },
  {
    title: "AI Match Scoring",
    desc: "Each application is scored by AI against job requirements, surfacing matched skills and gaps so employers can decide faster.",
    icon: TrendingUp,
  },
  {
    title: "Employer Application Review",
    desc: "Employers log in to see ranked applicants, review CV scores, and accept or reject candidates directly from their dashboard.",
    icon: Building2,
  },
];

const FOOTER_COLUMNS = [
  { heading: "Company", items: ["About Us", "Customers", "Newsroom", "Events"] },
  { heading: "Industries", items: ["Finance Technology", "Software Dev", "Data Science", "Cybersecurity"] },
];

export default function LandingPage() {
  return (
    <div className={`landing ${landingSans.variable} ${landingSerif.variable} ${landingMono.variable} min-h-screen overflow-x-clip`}>
      <Nav />

      <main>
        <Hero />

        {/* Call to action */}
        <section className="px-4 sm:px-8 lg:px-12" aria-labelledby="cta-title">
          <Reveal className="relative mx-auto max-w-[1344px] overflow-hidden rounded-[28px] bg-[var(--panel)] text-[var(--panel-ink)] ring-1 ring-[var(--hairline)]">
            <div aria-hidden className="landing-grid-lines absolute inset-0" />
            <div
              aria-hidden
              className="absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
              style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 45%, transparent), transparent 70%)" }}
            />
            <div className="relative px-6 py-20 text-center sm:px-12 sm:py-24">
              <h2 id="cta-title" className="mx-auto max-w-[760px] text-balance text-[clamp(2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
                From Application to Placement{" "}
                <span className="landing-serif font-normal italic tracking-[-0.01em]">in Days</span>
              </h2>
              <p className="mx-auto mt-5 max-w-[560px] text-pretty text-[16.5px] leading-[1.65] text-[var(--panel-muted)]">
                Accelerate your hiring with our technology. Reduce downtime and optimize headcount. Get a special offer now!
              </p>
              <Link
                href="/onboarding?role=employer"
                className="mt-10 inline-flex h-12 items-center rounded-full bg-[var(--panel-ink)] px-7 text-[15px] font-medium text-[var(--panel)] transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--panel-ink)]"
              >
                Work With Us
              </Link>
            </div>
          </Reveal>
        </section>

        {/* What it does */}
        <section className="mx-auto max-w-[1344px] px-5 pb-28 pt-28 sm:px-8 lg:px-12 lg:pb-36 lg:pt-36" aria-labelledby="services-title">
          <Reveal className="mx-auto max-w-[620px] text-center">
            <h2 id="services-title" className="text-balance text-[clamp(1.9rem,3.6vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              What PAU Interconnect Does
            </h2>
            <p className="mt-4 text-[16.5px] leading-[1.6] text-[var(--muted)]">
              A complete pipeline from student signup to employer placement.
            </p>
          </Reveal>

          <ol className="mt-16 grid overflow-hidden rounded-[22px] border border-[var(--hairline-strong)] bg-[var(--paper-raised)] md:grid-cols-3">
            {SERVICES.map((svc, i) => {
              const Icon = svc.icon;
              return (
                <Reveal
                  as="li"
                  key={svc.title}
                  delay={i * 0.08}
                  className="group relative border-[var(--hairline-strong)] p-8 transition-colors duration-300 hover:bg-[var(--card)] max-md:[&:not(:first-child)]:border-t md:[&:not(:first-child)]:border-l lg:p-10"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-8 top-0 h-[2px] origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100 lg:inset-x-10"
                  />
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                      <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="landing-mono text-[12px] tracking-[0.08em] text-[var(--subtle)]" aria-hidden>
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-10 text-[19px] font-semibold leading-[1.25] tracking-[-0.015em]">{svc.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.65] text-[var(--muted)]">{svc.desc}</p>
                </Reveal>
              );
            })}
          </ol>
        </section>
      </main>

      {/* Footer: ink in both themes */}
      <footer className="bg-[#0b0c10] text-[#ecebe6] dark:border-t dark:border-white/[0.06] dark:bg-[#08090c]">
        <div className="mx-auto max-w-[1344px] px-5 pb-10 pt-20 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-12">
            <div className="col-span-2 md:col-span-5">
              <div className="flex items-center gap-2.5">
                <span aria-hidden className="relative h-7 w-7 rounded-full bg-[#8d8ffa]">
                  <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0b0c10]" />
                </span>
                <span className="text-[16px] font-semibold tracking-[-0.01em]">PAU Interconnect</span>
              </div>
              <p className="mt-6 max-w-[300px] text-[14.5px] leading-[1.65] text-white/60">
                Our solutions make placements faster and cheaper. Contact us for more information.
              </p>
            </div>

            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading} className="md:col-span-2">
                <p className="landing-mono text-[11.5px] uppercase tracking-[0.12em] text-white/45">{col.heading}</p>
                <ul className="mt-6 space-y-3.5 text-[14.5px] text-white/70">
                  {col.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="col-span-2 md:col-span-3">
              <p className="landing-mono text-[11.5px] uppercase tracking-[0.12em] text-white/45">Get In Touch</p>
              <p className="mt-6 text-[14.5px] text-white/70">hello@pauinterconnect.edu</p>
              <div className="mt-6 flex gap-2" aria-hidden>
                {[Briefcase, TrendingUp].map((Icon, i) => (
                  <span key={i} className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.07] text-white/80">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-[13.5px] text-white/45 md:flex-row">
            <p>© 2024 PAU Interconnect, All rights reserved</p>
            <div className="flex gap-8">
              <span>Terms & Conditions</span>
              <span>Privacy Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
