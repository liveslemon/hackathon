# Landing page `/`

**File:** `app/page.tsx` (895 lines)  **Seen:** ✅ full page, dark; light from code

## Today
- Nav: How It Works · For Students · For Employers · SIWES · Admin · Employer · Student.
- Hero: "Where Ambition Meets Opportunity, Powered by AI", Student Portal / Employer Portal buttons, "University
  coordinator or supervisor? Sign in as Admin".
- Three preview cards (AI Role Matching, Ranked Applicant Pool, Digital SIWES Logbook).
- Stats band: 100% / 94%+ / 150+ / 48 hrs.
- 4-step "How it works", a For Students section, a For Employers section, "Official SIWES & Internship Compliance"
  (Student / Industry Mentor / PAU Coordinator), a CTA band and the footer.

## Problems
1. **Made-up numbers and claims** (P0-6): 94%+ accuracy, 150+ partners, 48 hrs response, "officially sanctioned".
2. Promises roles that don't exist yet: PAU Coordinator, Industry Mentor, "assign verified academic grade units".
3. "Admin" in the public nav, and "Sign in as Admin" in the hero, invite probing.
4. It's long and text-heavy; the four sections repeat the same benefits.
5. No real product imagery. The preview cards are good, so lean on them.

## Redesign (keep the visual style; it works in both themes)
| Section | Content |
|---|---|
| Nav | Logo · For students · For employers · How SIWES works · **Sign in** (menu: Student / Employer / Staff) · **Get started** |
| Hero | One sentence: "Find your SIWES placement. Log it. Get it signed. All in one place." Two CTAs: *I'm a PAU student* / *I'm hiring interns*. A short looping product video or an animated mock of a match card. |
| Live counters (W-3) | Real numbers from `platform_stats`: students placed this session, open roles, partner companies, logbook days signed. Hide a counter until it's meaningful (e.g. > 20). |
| How it works | 4 steps with real screenshots: Build profile → Get matched → Apply & interview → Log & get signed off. |
| For employers | "Hire PAU interns in a week": ranked candidates, one-click shortlist, SIWES paperwork handled. CTA *Post a role*. |
| Trust | Partner logos (only with permission); a testimonial quote from the pilot; "Built with PAU [office]" only once it's agreed. |
| FAQ | Is it free? Who can sign up? How does matching work? What does the employer see about me? (links to `/privacy`) |
| Footer | Privacy, Terms, Accessibility, Contact, status page link. |

## Technical
- Make it static (or ISR, 5 min). Today it renders dynamically for no reason.
- Lighthouse targets: LCP < 2.0 s on 4G, CLS < 0.05, all images `next/image` with sizes.
- Add OpenGraph and Twitter cards with a branded image, `sitemap.xml` and `robots.txt`.
