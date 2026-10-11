# NEW FEATURE: Posting Templates & Drafts

## Priority: 🟢 LOW

## Effort: Medium (3 hours)

## Overview

Allow employers to save posting templates for recurring roles and save drafts that can be finished later. Reduces friction for employers who post similar roles frequently.

## Implementation

### 1. Database Schema

```sql
-- Templates table
CREATE TABLE IF NOT EXISTS internship_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g. "Summer UX Intern"
  role TEXT,
  field TEXT,
  category TEXT,
  description TEXT,
  requirements TEXT,
  tags TEXT[],
  location TEXT,
  duration TEXT,
  stipend TEXT,
  recruiter_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_templates_employer ON internship_templates(employer_id);
```

### 2. Save as Template Action

After creating a posting, or from the postings list:

```tsx
const handleSaveAsTemplate = async (internship: EmployerInternship) => {
  const name = prompt("Template name (e.g. 'Summer UX Intern'):");
  if (!name) return;

  await fetch("/api/internships/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      role: internship.role,
      field: internship.field,
      category: internship.category,
      description: internship.description,
      requirements: internship.requirements,
      tags: internship.interests,
      location: internship.location,
      duration: internship.duration,
      stipend: internship.stipend,
      recruiter_link: internship.recruiter_link,
    }),
  });
};
```

### 3. Template Picker in Post Modal

When creating a new posting, show "Start from template" option:

```tsx
function PostInternshipButton({ employerProfile }) {
  const [templates, setTemplates] = useState([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  useEffect(() => {
    // Fetch templates on mount
    fetch("/api/internships/templates")
      .then((res) => res.json())
      .then(setTemplates);
  }, []);

  return (
    <Modal ...>
      {showTemplatePicker ? (
        <div className="space-y-3">
          <Typography variant="h4">Choose a Template</Typography>
          <button
            onClick={() => { setShowTemplatePicker(false); /* start blank */ }}
            className="w-full p-4 border-2 border-dashed rounded-xl text-center hover:border-brand"
          >
            Start from scratch
          </button>
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                setFormData({
                  role: template.role || "",
                  field: template.field || "",
                  category: template.category || "",
                  description: template.description || "",
                  requirements: template.requirements || "",
                  tags: template.tags?.join(", ") || "",
                  // Don't pre-fill deadline
                  deadline: "",
                  link: template.recruiter_link || "",
                });
                setShowTemplatePicker(false);
              }}
              className="w-full p-4 border rounded-xl text-left hover:border-brand hover:bg-brand/5"
            >
              <Typography variant="body2" weight="bold">{template.name}</Typography>
              <Typography variant="caption" color="muted">{template.role} · {template.category}</Typography>
            </button>
          ))}
        </div>
      ) : (
        <>{/* Normal form */}</>
      )}
    </Modal>
  );
}
```

### 4. Draft Support

Postings with `status: "draft"` are saved but not visible to students:

```tsx
// In the post modal, add "Save as Draft" next to "Publish":
<div className="flex gap-2">
  <Button variant="ghost" onClick={() => handleCreate("draft")}>
    Save as Draft
  </Button>
  <Button onClick={() => handleCreate("active")}>Publish</Button>
</div>;

const handleCreate = async (status: "active" | "draft") => {
  // Same insert logic but with the status field
  const { error } = await supabase.from("internships").insert([
    {
      ...payload,
      status,
    },
  ]);
};
```

### 5. Drafts Section in My Postings

Show drafts in a separate section:

```tsx
const draftPostings = initialInternships.filter((j) => j.status === "draft");
const activePostings = initialInternships.filter((j) => j.status !== "draft");

{
  draftPostings.length > 0 && (
    <div className="mb-8">
      <Typography
        variant="h4"
        weight="bold"
        className="mb-4 flex items-center gap-2"
      >
        <FileText className="w-5 h-5 text-slate-400" />
        Drafts ({draftPostings.length})
      </Typography>
      <div className="grid gap-3">
        {draftPostings.map((draft) => (
          <Card key={draft.id} className="opacity-75 border-dashed">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <Typography variant="body2" weight="bold">
                  {draft.role || "Untitled"}
                </Typography>
                <Typography variant="caption" color="muted">
                  Last edited {formatDate(draft.updated_at)}
                </Typography>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(draft.id)}
                >
                  Edit
                </Button>
                <Button size="sm" onClick={() => handlePublish(draft.id)}>
                  Publish
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### 6. API Routes

**Templates CRUD:** `app/api/internships/templates/route.ts`

```tsx
export async function GET(req: Request) {
  // List templates for current employer
}
export async function POST(req: Request) {
  // Create new template
}
```

**Template delete:** `app/api/internships/templates/[id]/route.ts`

```tsx
export async function DELETE(req: Request, { params }) {
  // Delete template (verify ownership)
}
```

## Integration with Other Roles

- **Student**: No direct impact — students only see published (active) postings
- **Admin**: Admin could provide system-wide templates for common internship types
- **Employer**: Templates save time; drafts prevent losing work

## Acceptance Criteria

- [ ] `internship_templates` table created
- [ ] "Save as Template" action in postings list menu
- [ ] Template picker shown when creating new posting (if templates exist)
- [ ] "Start from scratch" option always available
- [ ] "Save as Draft" button in post modal
- [ ] Drafts section shown in My Postings page
- [ ] Drafts can be edited and published later
- [ ] Drafts NOT visible to students
- [ ] Templates can be deleted
- [ ] Maximum 20 templates per employer (prevent abuse)


STATUS: COMPLETE
