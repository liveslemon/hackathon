# IMPROVEMENT: Company Public Profile Page

## Priority: 🟡 MEDIUM

## Effort: Medium (2-3 hours)

## Current State

Fetches from hardcoded `localhost:8000`, shows banner, logo, name, industry, website, description, culture, and active postings. No fallback images, no follow button, no contact info, no social links, no past intern reviews.

## Files to Modify

- `app/companies/[id]/CompanyClient.tsx`
- `app/companies/[id]/page.tsx`

## Improvements

### 1. Fix Backend URL (see bug #001, but repeated here for context)

```tsx
import { getBackendUrl } from "@/lib/env";
// OR use authenticatedFetch for consistency:
import { authenticatedFetch } from "@/lib/api";

// Replace:
const res = await fetch(`http://localhost:8000/api/companies/${employerId}`);
// With:
const res = await fetch(`${getBackendUrl()}/api/companies/${employerId}`);
```

### 2. Add Fallback Images

```tsx
// Banner fallback:
{data.company.company_banner_url ? (
  <Image src={data.company.company_banner_url} alt="Banner" ... />
) : (
  <div className="w-full h-48 bg-gradient-to-r from-slate-100 to-slate-200 flex items-center justify-center">
    <Building className="w-16 h-16 text-slate-300" />
  </div>
)}

// Logo fallback:
{data.company.company_logo_url ? (
  <Image src={data.company.company_logo_url} alt="Logo" ... />
) : (
  <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
    <Typography variant="h3" className="text-slate-400">
      {data.company.full_name?.charAt(0) || "?"}
    </Typography>
  </div>
)}
```

### 3. Add Social Media Links

Display LinkedIn, Twitter, etc. from the profile:

```tsx
<div className="flex items-center gap-3 mt-4">
  {data.company.company_website && (
    <a
      href={data.company.company_website}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-sm text-brand hover:underline"
    >
      <Globe className="w-4 h-4" /> Website
    </a>
  )}
  {data.company.linkedin_url && (
    <a
      href={data.company.linkedin_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
    >
      <Linkedin className="w-4 h-4" /> LinkedIn
    </a>
  )}
  {data.company.twitter_url && (
    <a
      href={data.company.twitter_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-sm text-sky-500 hover:underline"
    >
      <Twitter className="w-4 h-4" /> Twitter
    </a>
  )}
</div>
```

### 4. Add Company Stats Section

Show key numbers:

```tsx
<div className="grid grid-cols-3 gap-4 mt-6">
  <div className="text-center p-4 bg-slate-50 rounded-xl">
    <Typography variant="h4" weight="bold">
      {data.internships.length}
    </Typography>
    <Typography variant="caption" color="muted">
      Active Postings
    </Typography>
  </div>
  <div className="text-center p-4 bg-slate-50 rounded-xl">
    <Typography variant="h4" weight="bold">
      {data.company.company_size || "—"}
    </Typography>
    <Typography variant="caption" color="muted">
      Company Size
    </Typography>
  </div>
  <div className="text-center p-4 bg-slate-50 rounded-xl">
    <Typography variant="h4" weight="bold">
      {data.company.company_location || "—"}
    </Typography>
    <Typography variant="caption" color="muted">
      Location
    </Typography>
  </div>
</div>
```

### 5. Add "Follow Company" Button (for students)

```tsx
const [isFollowing, setIsFollowing] = useState(false);
const [followerCount, setFollowerCount] = useState(0);

// Check if current user follows this company on mount:
useEffect(() => {
  // Fetch from /api/companies/{id}/followers/check
}, []);

const handleFollow = async () => {
  if (isFollowing) {
    await authenticatedFetch(`/api/companies/${employerId}/unfollow`, {
      method: "POST",
    });
    setFollowerCount((c) => c - 1);
  } else {
    await authenticatedFetch(`/api/companies/${employerId}/follow`, {
      method: "POST",
    });
    setFollowerCount((c) => c + 1);
  }
  setIsFollowing(!isFollowing);
};

// UI:
<Button
  variant={isFollowing ? "outline" : "primary"}
  onClick={handleFollow}
  size="sm"
>
  {isFollowing ? "Following" : "Follow"}
  <span className="ml-2 text-xs opacity-70">{followerCount}</span>
</Button>;
```

### 6. Show Past Internships Section

Below active postings, show completed internships:

```tsx
<section className="mt-10">
  <Typography variant="h4" weight="bold" className="mb-4">
    Past Internships
  </Typography>
  {data.pastInternships?.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.pastInternships.map((internship) => (
        <Card key={internship.id} className="opacity-75">
          <CardContent>
            <Typography variant="body1" weight="bold">
              {internship.role}
            </Typography>
            <Typography variant="caption" color="muted">
              Completed · {internship.accepted_count} interns
            </Typography>
          </CardContent>
        </Card>
      ))}
    </div>
  ) : (
    <Typography variant="body2" color="muted">
      No past internships yet.
    </Typography>
  )}
</section>
```

## Database Changes

```sql
-- Company followers table
CREATE TABLE IF NOT EXISTS company_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, company_id)
);
```

## Integration with Other Roles

- **Student**: Can follow companies, see follow count, get notified of new postings from followed companies
- **Employer**: Sees follower count on their dashboard (metric card)
- **Admin**: Can see most-followed companies in platform analytics

## Acceptance Criteria

- [ ] Backend URL uses `getBackendUrl()` instead of hardcoded localhost
- [ ] Fallback images (gradient + icon) when logo/banner missing
- [ ] Social media links (LinkedIn, Twitter) displayed if available
- [ ] Company stats section (postings count, size, location)
- [ ] Follow/Unfollow button for authenticated students
- [ ] Follower count displayed
- [ ] Past internships section shown below active postings
- [ ] Page handles loading and error states gracefully
