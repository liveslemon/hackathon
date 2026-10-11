# IMPROVEMENT: Post Internship Form

## Priority: 🟡 MEDIUM

## Effort: Medium (3-4 hours)

## Current State

Modal form in `PostInternshipButton` with fields: role, field, category, description, requirements, tags (comma-separated), deadline, recruiter link. Inserts directly to Supabase. Uses `window.location.reload()` after success.

## File to Modify

`app/dashboard/employer/EmployerClient.tsx`

## Improvements

### 1. Add Missing Fields

Add these fields to the form and the Supabase insert:

```tsx
const [formData, setFormData] = useState({
  role: "",
  field: "",
  category: "",
  description: "",
  requirements: "",
  tags: "",
  deadline: "",
  link: "",
  // NEW FIELDS:
  location: "", // City or campus name
  duration: "", // e.g. "3 months", "12 weeks"
  stipend: "", // e.g. "₦50,000/month" or "Unpaid"
  required_skills: "", // Comma-separated skills
  slots: "1", // Number of positions available
});
```

**Form inputs to add:**

```tsx
<Input
  label="Location"
  value={formData.location}
  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
  placeholder="e.g. Lagos, PAU Campus, Remote"
/>
<Input
  label="Duration"
  value={formData.duration}
  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
  placeholder="e.g. 3 months, 12 weeks"
/>
<Input
  label="Stipend / Compensation"
  value={formData.stipend}
  onChange={(e) => setFormData({ ...formData, stipend: e.target.value })}
  placeholder="e.g. ₦50,000/month or Unpaid"
/>
<Input
  label="Required Skills"
  value={formData.required_skills}
  onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
  placeholder="e.g. Python, React, Data Analysis"
  helperText="Comma-separated"
/>
<Input
  label="Number of Positions"
  type="number"
  min="1"
  value={formData.slots}
  onChange={(e) => setFormData({ ...formData, slots: e.target.value })}
/>
```

### 2. Add Field Validation

Before submitting:

```tsx
const validate = (): string[] => {
  const errors: string[] = [];
  if (formData.role.length < 3)
    errors.push("Role must be at least 3 characters");
  if (!formData.field) errors.push("Field is required");
  if (!formData.category) errors.push("Category is required");
  if (formData.description.length < 20)
    errors.push("Description must be at least 20 characters");
  if (formData.requirements.length < 10)
    errors.push("Requirements must be at least 10 characters");
  if (formData.deadline && new Date(formData.deadline) < new Date()) {
    errors.push("Deadline must be in the future");
  }
  if (formData.link && !formData.link.startsWith("http")) {
    errors.push("Recruiter link must be a valid URL");
  }
  return errors;
};
```

### 3. Add Preview Step Before Publishing

Convert the modal to a 2-step flow:

```tsx
const [step, setStep] = useState<"form" | "preview">("form");

// In the modal:
{
  step === "form" ? (
    <> {/* all form fields */} </>
  ) : (
    <div className="space-y-4">
      <Typography variant="h4">Preview Your Posting</Typography>
      <div className="bg-slate-50 rounded-xl p-6 space-y-3">
        <p>
          <strong>Role:</strong> {formData.role}
        </p>
        <p>
          <strong>Field:</strong> {formData.field}
        </p>
        <p>
          <strong>Category:</strong> {formData.category}
        </p>
        <p>
          <strong>Location:</strong> {formData.location || "Not specified"}
        </p>
        <p>
          <strong>Duration:</strong> {formData.duration || "Not specified"}
        </p>
        <p>
          <strong>Stipend:</strong> {formData.stipend || "Not specified"}
        </p>
        <p>
          <strong>Deadline:</strong> {formData.deadline || "No deadline"}
        </p>
        <p>
          <strong>Description:</strong>
        </p>
        <p className="text-sm text-slate-600 whitespace-pre-wrap">
          {formData.description}
        </p>
        <p>
          <strong>Requirements:</strong>
        </p>
        <p className="text-sm text-slate-600 whitespace-pre-wrap">
          {formData.requirements}
        </p>
      </div>
    </div>
  );
}

// Footer buttons change based on step:
{
  step === "form" ? (
    <Button
      onClick={() => {
        if (validate().length === 0) setStep("preview");
      }}
    >
      Preview
    </Button>
  ) : (
    <>
      <Button variant="ghost" onClick={() => setStep("form")}>
        Back to Edit
      </Button>
      <Button onClick={handleCreate} isLoading={creating}>
        Publish
      </Button>
    </>
  );
}
```

### 4. Replace `window.location.reload()` with `router.refresh()`

```tsx
import { useRouter } from "next/navigation";

const router = useRouter();

// After successful create:
setIsOpen(false);
router.refresh(); // Revalidates server components without full page reload
```

### 5. Add "Save as Draft" Option

Allow employers to save without publishing:

```tsx
const handleSaveDraft = async () => {
  // Same insert but with status: "draft"
  const { error } = await supabase.from("internships").insert([
    {
      ...payload,
      status: "draft", // Not visible to students
    },
  ]);
};
```

This requires a `status` column on the `internships` table (see migration below).

### Database Migration Needed

```sql
-- Add new columns to internships table
ALTER TABLE internships ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS stipend TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS required_skills TEXT[];
ALTER TABLE internships ADD COLUMN IF NOT EXISTS slots INTEGER DEFAULT 1;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'expired'));
```

## Integration with Other Roles

- **Student**: New fields (location, duration, stipend) should appear on internship cards and detail pages
- **Admin**: Admin post form should have the same fields
- **Search**: Students should be able to filter by location, duration, stipend range

## Acceptance Criteria

- [ ] Form includes: location, duration, stipend, required skills, number of positions
- [ ] Client-side validation with inline error messages
- [ ] Preview step before publishing
- [ ] `router.refresh()` replaces `window.location.reload()`
- [ ] Optional "Save as Draft" functionality
- [ ] New fields display correctly on student-facing internship cards
- [ ] Deadline must be in the future (validated)
