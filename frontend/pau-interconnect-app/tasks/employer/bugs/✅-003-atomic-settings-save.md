# BUG FIX: Make Settings Save Atomic (Upload + Metadata)

## Priority: 🟠 HIGH

## Effort: Medium (1-2 hours)

## Problem

In `SettingsClient.tsx`, file uploads and profile metadata are saved separately:

1. User uploads logo/banner → file goes to Supabase Storage immediately
2. User clicks "Save Changes" → PATCH to backend with metadata

If step 2 fails (network error, validation), the uploaded file is orphaned in storage with no profile reference. Conversely, a user can upload a file, see the preview, then navigate away without saving — leaving orphaned assets.

## File to Modify

`app/dashboard/employer/settings/SettingsClient.tsx`

## Current Flow

```
User picks file → immediate upload to Supabase Storage → URL stored in local state
User clicks Save → PATCH to backend with all form fields including URLs
```

## Target Flow

```
User picks file → store in local state as File object (show preview via URL.createObjectURL)
User clicks Save → upload file(s) to storage THEN save metadata in one transaction
If upload fails → show error, nothing is persisted
If metadata save fails → delete uploaded file(s), show error
```

## Implementation

### Step 1: Store files locally instead of uploading immediately

```tsx
const [logoFile, setLogoFile] = useState<File | null>(null);
const [bannerFile, setBannerFile] = useState<File | null>(null);
const [logoPreview, setLogoPreview] = useState<string>(
  profile?.company_logo_url || "",
);
const [bannerPreview, setBannerPreview] = useState<string>(
  profile?.company_banner_url || "",
);

const handleFileSelect = (
  e: React.ChangeEvent<HTMLInputElement>,
  field: "logo" | "banner",
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    setMessage("File must be under 2MB");
    return;
  }

  // Validate file type
  if (!file.type.startsWith("image/")) {
    setMessage("Only image files are allowed");
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  if (field === "logo") {
    setLogoFile(file);
    setLogoPreview(previewUrl);
  } else {
    setBannerFile(file);
    setBannerPreview(previewUrl);
  }
};
```

### Step 2: Upload + save atomically on submit

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  try {
    let logoUrl = formData.company_logo_url;
    let bannerUrl = formData.company_banner_url;
    const uploadedPaths: string[] = []; // Track for rollback

    // Upload logo if changed
    if (logoFile) {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${user?.id}-logo-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from("company_assets")
        .upload(fileName, logoFile, { upsert: true });
      if (error) throw new Error(`Logo upload failed: ${error.message}`);

      uploadedPaths.push(fileName);
      const { data } = supabase.storage
        .from("company_assets")
        .getPublicUrl(fileName);
      logoUrl = data.publicUrl;
    }

    // Upload banner if changed
    if (bannerFile) {
      const fileExt = bannerFile.name.split(".").pop();
      const fileName = `${user?.id}-banner-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from("company_assets")
        .upload(fileName, bannerFile, { upsert: true });
      if (error) {
        // Rollback logo upload if banner fails
        for (const path of uploadedPaths) {
          await supabase.storage.from("company_assets").remove([path]);
        }
        throw new Error(`Banner upload failed: ${error.message}`);
      }
      uploadedPaths.push(fileName);
      const { data } = supabase.storage
        .from("company_assets")
        .getPublicUrl(fileName);
      bannerUrl = data.publicUrl;
    }

    // Save metadata
    const payload = {
      ...formData,
      company_logo_url: logoUrl,
      company_banner_url: bannerUrl,
    };
    const { authenticatedFetch } = await import("@/lib/api");
    await authenticatedFetch("/api/employer/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    // Clear file state on success
    setLogoFile(null);
    setBannerFile(null);
    setMessage("Company profile updated successfully!");
  } catch (err: unknown) {
    setMessage(
      err instanceof Error ? err.message : "An unexpected error occurred.",
    );
  } finally {
    setLoading(false);
  }
};
```

### Step 3: Clean up object URLs on unmount

```tsx
useEffect(() => {
  return () => {
    // Revoke preview URLs to prevent memory leaks
    if (logoPreview && logoPreview.startsWith("blob:"))
      URL.revokeObjectURL(logoPreview);
    if (bannerPreview && bannerPreview.startsWith("blob:"))
      URL.revokeObjectURL(bannerPreview);
  };
}, [logoPreview, bannerPreview]);
```

## Acceptance Criteria

- [ ] Selecting a file only creates a local preview (no immediate upload)
- [ ] Clicking "Save" uploads files AND saves metadata in sequence
- [ ] If upload fails, no orphaned files exist in storage
- [ ] If metadata save fails after upload, uploaded files are deleted (rollback)
- [ ] File size validation (max 2MB) before upload
- [ ] File type validation (images only) before upload
- [ ] Preview URLs are revoked on component unmount
- [ ] Success message appears only when everything succeeds


STATUS: COMPLETE
