# IMPROVEMENT: Company Settings Page

## Priority: 🟡 MEDIUM

## Effort: Medium (3-4 hours)

## Current State

Form with: company website, logo upload, banner upload, industry, description, culture. Uploads go directly to Supabase storage. Metadata save calls hardcoded `localhost:8000`. No image constraints, no team management, no notification preferences.

## Files to Modify

- `app/dashboard/employer/settings/SettingsClient.tsx` (main changes)
- `app/dashboard/employer/settings/page.tsx` (pass additional props if needed)

## Improvements

### 1. Add Image Dimension/Size Validation

```tsx
const validateImage = (
  file: File,
  type: "logo" | "banner",
): Promise<string | null> => {
  return new Promise((resolve) => {
    // Size check
    const maxSize = type === "logo" ? 1 * 1024 * 1024 : 2 * 1024 * 1024; // 1MB logo, 2MB banner
    if (file.size > maxSize) {
      resolve(`File too large. Max ${type === "logo" ? "1MB" : "2MB"}.`);
      return;
    }

    // Dimension check
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (type === "logo") {
        // Logo: should be roughly square (aspect ratio between 0.8 and 1.2)
        const ratio = img.width / img.height;
        if (ratio < 0.8 || ratio > 1.2) {
          resolve("Logo should be roughly square (1:1 ratio)");
          return;
        }
        if (img.width < 100 || img.width > 1000) {
          resolve("Logo should be between 100px and 1000px wide");
          return;
        }
      } else {
        // Banner: should be wide (aspect ratio between 2:1 and 5:1)
        const ratio = img.width / img.height;
        if (ratio < 2 || ratio > 5) {
          resolve("Banner should be wide (around 3:1 or 4:1 ratio)");
          return;
        }
        if (img.width < 600) {
          resolve("Banner should be at least 600px wide");
          return;
        }
      }
      resolve(null); // Valid
    };
    img.onerror = () => resolve("Invalid image file");
    img.src = URL.createObjectURL(file);
  });
};
```

### 2. Add Missing Fields

Add to the form:

```tsx
// Social media links
<div className="sm:col-span-2">
  <label className="block text-sm font-medium text-slate-700 mb-1">Social Media</label>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <Input
      name="linkedin_url"
      placeholder="LinkedIn URL"
      value={formData.linkedin_url}
      onChange={handleChange}
      leftIcon={<LinkedinIcon className="w-4 h-4" />}
    />
    <Input
      name="twitter_url"
      placeholder="Twitter/X URL"
      value={formData.twitter_url}
      onChange={handleChange}
    />
  </div>
</div>

// Company size
<div>
  <label className="block text-sm font-medium text-slate-700 mb-1">Company Size</label>
  <select
    name="company_size"
    value={formData.company_size}
    onChange={handleChange}
    className="w-full border rounded-xl px-4 py-2.5 text-sm"
  >
    <option value="">Select size</option>
    <option value="1-10">1-10 employees</option>
    <option value="11-50">11-50 employees</option>
    <option value="51-200">51-200 employees</option>
    <option value="201-1000">201-1000 employees</option>
    <option value="1000+">1000+ employees</option>
  </select>
</div>

// Location
<Input
  name="company_location"
  label="Office Location"
  placeholder="e.g. Lagos, Nigeria"
  value={formData.company_location}
  onChange={handleChange}
/>
```

### 3. Add Notification Preferences Section

```tsx
<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 mt-6">
  <Typography variant="h4" className="mb-4">
    Notification Preferences
  </Typography>

  <div className="space-y-4">
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={preferences.email_new_applicant}
        onChange={(e) =>
          setPreferences({
            ...preferences,
            email_new_applicant: e.target.checked,
          })
        }
        className="rounded"
      />
      <span className="text-sm text-slate-700">
        Email me when someone applies to my postings
      </span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={preferences.email_logbook_submitted}
        onChange={(e) =>
          setPreferences({
            ...preferences,
            email_logbook_submitted: e.target.checked,
          })
        }
        className="rounded"
      />
      <span className="text-sm text-slate-700">
        Email me when an intern submits a logbook entry
      </span>
    </label>

    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={preferences.email_deadline_reminder}
        onChange={(e) =>
          setPreferences({
            ...preferences,
            email_deadline_reminder: e.target.checked,
          })
        }
        className="rounded"
      />
      <span className="text-sm text-slate-700">
        Remind me 3 days before posting deadlines
      </span>
    </label>
  </div>
</div>
```

### 4. Add Unsaved Changes Warning

```tsx
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Track changes:
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
  setHasUnsavedChanges(true);
};

// Warn on navigation:
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [hasUnsavedChanges]);
```

### 5. Add Form Sections with Tabs

Organize the long form into tabs:

```tsx
const [activeTab, setActiveTab] = useState<
  "profile" | "branding" | "notifications"
>("profile");

<div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
  {(["profile", "branding", "notifications"] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={cx(
        "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        activeTab === tab
          ? "bg-white shadow-sm text-slate-900"
          : "text-slate-500",
      )}
    >
      {tab.charAt(0).toUpperCase() + tab.slice(1)}
    </button>
  ))}
</div>;
```

## Database Changes

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_location TEXT;

-- Notification preferences (could be a separate table or JSONB column)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_new_applicant": true, "email_logbook_submitted": true, "email_deadline_reminder": true}';
```

## Integration with Other Roles

- **Student**: New fields (social links, company size, location) display on company public page
- **Admin**: Admin can see/edit employer notification preferences if needed
- **Email system**: Notification preferences feed into the email notification feature (task #020)

## Acceptance Criteria

- [ ] Image dimension validation (logo ~1:1, banner ~3:1)
- [ ] Image size validation (logo max 1MB, banner max 2MB)
- [ ] Social media link fields added (LinkedIn, Twitter)
- [ ] Company size dropdown added
- [ ] Company location field added
- [ ] Notification preferences section with checkboxes
- [ ] Unsaved changes warning on navigation
- [ ] Form organized into tabs (Profile, Branding, Notifications)
- [ ] All new fields saved to database
- [ ] New fields appear on company public page
