# IMPROVEMENT: Employer Onboarding Flow

## Priority: 🟡 MEDIUM

## Effort: Medium (2-3 hours)

## Current State

Single-step form collecting: full_name, company_name, company_description (min 15 chars), company_website (optional), industry, culture (min 10 chars). Saves to profiles table. No logo upload, no verification, no progress indicator.

## Files to Modify

- `app/onboarding/OnboardingClient.tsx` (shared onboarding component)
- `app/onboarding/employer/page.tsx`
- `app/api/onboarding/complete/route.ts`

## Improvements

### 1. Convert to Multi-Step Wizard

Split the single form into 3 clear steps:

```tsx
const [step, setStep] = useState(1);
const totalSteps = 3;

// Step 1: Basic Info
// - Full name (your name as primary contact)
// - Company name
// - Industry
// - Company size (new field)
// - Company location (new field)

// Step 2: Company Profile
// - Company description (min 15 chars)
// - Culture & perks (min 10 chars)
// - Company website
// - LinkedIn URL (optional)

// Step 3: Branding (Optional)
// - Upload company logo
// - Upload company banner
// - "Skip for now" option
```

### 2. Add Progress Indicator

```tsx
<div className="mb-8">
  <div className="flex items-center justify-between mb-2">
    <Typography variant="body2" color="muted">
      Step {step} of {totalSteps}
    </Typography>
    <Typography variant="body2" color="muted">
      {Math.round((step / totalSteps) * 100)}%
    </Typography>
  </div>
  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
    <div
      className="h-full bg-brand rounded-full transition-all duration-500"
      style={{ width: `${(step / totalSteps) * 100}%` }}
    />
  </div>
  <div className="flex justify-between mt-2">
    {["Basic Info", "Company Profile", "Branding"].map((label, i) => (
      <Typography
        key={label}
        variant="caption"
        className={cx(
          i + 1 <= step ? "text-brand font-medium" : "text-slate-400",
        )}
      >
        {label}
      </Typography>
    ))}
  </div>
</div>
```

### 3. Add Logo/Banner Upload During Onboarding

Step 3 allows optional file upload:

```tsx
// Step 3 component:
function BrandingStep({ formData, setFormData, user }) {
  const [logoPreview, setLogoPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Typography variant="h4">Add your company branding</Typography>
        <Typography variant="body2" color="muted">
          Optional — you can always add these later in Settings
        </Typography>
      </div>

      {/* Logo upload */}
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
          {logoPreview ? (
            <Image
              src={logoPreview}
              alt="Logo"
              width={96}
              height={96}
              className="object-cover"
            />
          ) : (
            <Camera className="w-8 h-8 text-slate-300" />
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleLogoSelect(e)}
        />
      </div>

      {/* Banner upload */}
      <div className="w-full h-32 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
        {bannerPreview ? (
          <Image
            src={bannerPreview}
            alt="Banner"
            width={400}
            height={128}
            className="object-cover w-full"
          />
        ) : (
          <div className="text-center">
            <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <Typography variant="caption" color="muted">
              Upload banner image
            </Typography>
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleBannerSelect(e)}
      />
    </div>
  );
}
```

### 4. Add Missing Fields to Onboarding Schema

```tsx
// In the onboarding validation schema for employer:
const employerOnboardingSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  company_name: z.string().min(2, "Company name is required"),
  industry: z.string().min(2, "Industry is required"),
  company_size: z.string().optional(), // NEW
  company_location: z.string().optional(), // NEW
  company_description: z.string().min(15, "At least 15 characters"),
  culture: z.string().min(10, "At least 10 characters"),
  company_website: z.string().url().optional().or(z.literal("")),
  linkedin_url: z.string().url().optional().or(z.literal("")), // NEW
});
```

### 5. Add Verification Reminder

After completing onboarding, show a notice:

```tsx
// After save, redirect to dashboard with a banner:
// In EmployerClient or DashboardShell:
{
  profile?.verified === false && (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
      <div>
        <Typography variant="body2" weight="bold" className="text-amber-800">
          Verification Pending
        </Typography>
        <Typography variant="caption" className="text-amber-600">
          Your company profile is being reviewed by the platform admin. You can
          post internships, but they'll be published once verified.
        </Typography>
      </div>
    </div>
  );
}
```

### 6. Add "What's Next" Final Step

After completing onboarding, show helpful next actions:

```tsx
function OnboardingComplete() {
  return (
    <div className="text-center py-8 space-y-6">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
      <Typography variant="h3">You're all set!</Typography>
      <Typography variant="body1" color="muted">
        Your company profile is ready. Here's what to do next:
      </Typography>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
        <Link href="/dashboard/employer/internships?action=post">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <Plus className="w-6 h-6 text-brand mb-2" />
            <Typography variant="body2" weight="bold">
              Post Your First Internship
            </Typography>
          </Card>
        </Link>
        <Link href="/dashboard/employer/settings">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <Settings className="w-6 h-6 text-brand mb-2" />
            <Typography variant="body2" weight="bold">
              Complete Your Profile
            </Typography>
          </Card>
        </Link>
      </div>
    </div>
  );
}
```

## Integration with Other Roles

- **Student**: Student onboarding already has multi-step with CV upload — employer should match that quality
- **Admin**: Admin should see "unverified" employers in a queue to verify
- **Company Page**: Fields collected during onboarding immediately populate the public company page

## Acceptance Criteria

- [ ] Onboarding split into 3 steps with navigation (Back/Next)
- [ ] Progress indicator (progress bar + step labels)
- [ ] Step 3 allows optional logo/banner upload
- [ ] Company size and location fields added
- [ ] LinkedIn URL field added
- [ ] "Skip for now" option on branding step
- [ ] "What's Next" screen after completion with CTAs
- [ ] Verification pending banner on dashboard (optional if admin verification exists)
- [ ] Form validates per-step before allowing Next
