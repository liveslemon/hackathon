// Student privacy settings (profiles.settings.privacy), enforced server-side
// before student data reaches an employer's browser.

export type ContactVisibility = "employers" | "only_me";

export type PrivacyPrefs = {
  phone_visibility: ContactVisibility;
  email_visibility: ContactVisibility;
};

export const DEFAULT_PRIVACY: PrivacyPrefs = {
  phone_visibility: "employers",
  email_visibility: "employers",
};

// Columns never sent to another user, whatever the settings.
const PRIVATE_COLUMNS = [
  "cv_text",
  "cv_embedding",
  "cv_analysis",
  "settings",
  "notification_preferences",
  "is_admin",
  "onboarding_stage",
  "cv_processing_error",
] as const;

export function readPrivacy(settings: unknown): PrivacyPrefs {
  const privacy =
    settings && typeof settings === "object"
      ? (settings as { privacy?: Partial<Record<string, string>> }).privacy
      : undefined;
  const pick = (value: string | undefined): ContactVisibility =>
    value === "only_me" ? "only_me" : "employers";
  return {
    phone_visibility: pick(privacy?.phone_visibility),
    email_visibility: pick(privacy?.email_visibility),
  };
}

/** Copy of a student's profile safe to show an employer. */
export function maskStudentForEmployer<T extends Record<string, unknown>>(
  profile: T,
): T {
  const prefs = readPrivacy(profile.settings);
  const masked: Record<string, unknown> = { ...profile };
  for (const column of PRIVATE_COLUMNS) delete masked[column];
  if (prefs.phone_visibility === "only_me" && "phone" in masked) masked.phone = null;
  if (prefs.email_visibility === "only_me" && "email" in masked) masked.email = null;
  return masked as T;
}
