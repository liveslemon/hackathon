"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { readPrivacy } from "@/lib/privacy";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input, Button, Modal } from "@/components/ui";
import {
  ArrowLeft,
  Shield,
  Bell,
  Eye,
  LogOut,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  Monitor,
  Download,
  KeyRound,
} from "lucide-react";
import { cx } from "@/utils/cx";
import { useTheme } from "@/components/ThemeProvider";

type NotificationPrefs = {
  application_updates: boolean;
  employer_messages: boolean;
};

type PrivacyPrefs = {
  phone_visibility: "employers" | "only_me";
  email_visibility: "employers" | "only_me";
};

type SettingsState = {
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
};

export default function StudentSettingsClient({
  initialSettings,
}: {
  initialSettings: unknown;
}) {
  const router = useRouter();
  const { theme, setTheme, mounted } = useTheme();
  const [settings, setSettings] = useState<SettingsState>(() => {
    const saved = (initialSettings ?? {}) as {
      notifications?: Partial<Record<keyof NotificationPrefs, unknown>>;
    };
    return {
      notifications: {
        application_updates:
          saved.notifications?.application_updates !== false,
        employer_messages: saved.notifications?.employer_messages !== false,
      },
      privacy: readPrivacy(initialSettings),
    };
  });
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("You must be logged in to save settings.");

      const { error } = await supabase
        .from("profiles")
        .update({
          settings: settings,
        })
        .eq("id", userId);

      if (error) throw error;
      setHasUnsavedChanges(false);
      setStatus({ type: "success", message: "Settings saved successfully." });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setStatus({
        type: "error",
        message: "Password must be at least 6 characters.",
      });
      return;
    }

    setIsSaving(true);
    setStatus(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });
      if (error) throw error;
      setStatus({ type: "success", message: "Password updated successfully." });
      setIsChangingPassword(false);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to change password",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login/student");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    setStatus(null);
    try {
      const { authenticatedFetch, backendUrl } = await import("@/lib/api");
      await authenticatedFetch(
        backendUrl("/api/me/delete"),
        {
          method: "POST",
          body: JSON.stringify({ confirm: "DELETE" }),
        },
        30000,
      );
      await supabase.auth.signOut();
      router.push("/login/student?deleted=1");
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Could not delete your account.",
      });
      setIsDeleting(false);
    }
  };

  const toggleNotification = (key: keyof NotificationPrefs) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
    setHasUnsavedChanges(true);
  };

  const updatePrivacy = (
    key: keyof PrivacyPrefs,
    value: PrivacyPrefs[keyof PrivacyPrefs],
  ) => {
    setSettings((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value },
    }));
    setHasUnsavedChanges(true);
  };

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/student"
        className="inline-flex items-center gap-2 text-xs font-semibold text-fg-muted hover:text-brand transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Dashboard</span>
      </Link>

      {status && (
        <div
          className={cx(
            "p-4 rounded-xl flex items-center gap-3 text-xs font-medium border",
            status.type === "success"
              ? "bg-success-subtle text-success-fg border-success/20"
              : "bg-danger-subtle text-danger-fg border-danger/20",
          )}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Appearance Section: In Sync with TopBar ThemeToggle */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Monitor className="w-5 h-5 text-brand" />
          <h2 className="text-sm font-bold text-fg">Interface Theme</h2>
        </div>
        <div className="p-6">
          <p className="text-xs text-fg-muted mb-4">
            Select your preferred display mode. Stays in sync across your session.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={mounted && theme === value}
                className={cx(
                  "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                  mounted && theme === value
                    ? "border-brand bg-brand-subtle text-brand shadow-xs"
                    : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg hover:bg-surface-sunken",
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Bell className="w-5 h-5 text-brand" />
          <h2 className="text-sm font-bold text-fg">Notification Channels</h2>
        </div>
        <div className="p-6 space-y-4">
          {(
            [
              {
                key: "application_updates",
                label: "Application updates by email",
                desc: "Receive email alerts when employers advance your stage, schedule interviews, or issue placement offers.",
              },
              {
                key: "employer_messages",
                label: "Employer inbox messages",
                desc: "Surface in-app badge notifications and push alerts when an employer messages you.",
              },
            ] as const
          ).map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-none"
            >
              <div className="pr-4">
                <p className="text-xs font-semibold text-fg">{label}</p>
                <p className="text-xs text-fg-muted mt-0.5">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleNotification(key)}
                className={cx(
                  "relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                  settings.notifications[key]
                    ? "bg-brand"
                    : "bg-surface-sunken border border-border",
                )}
                aria-label={`Toggle ${label}`}
              >
                <span
                  className={cx(
                    "absolute top-0.5 w-5 h-5 rounded-full shadow-xs transition-transform",
                    settings.notifications[key]
                      ? "bg-fg-inverse translate-x-[22px]"
                      : "bg-fg-muted translate-x-0.5",
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Preferences */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Eye className="w-5 h-5 text-brand" />
          <h2 className="text-sm font-bold text-fg">Data & Privacy Visibility</h2>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-xs text-fg-muted leading-relaxed">
            Your profile and uploaded CV are private. They are only shared with verified employers for positions you apply to. Other students cannot search or view your profile.
          </p>
          {(
            [
              { key: "phone_visibility", label: "Phone Number Visibility" },
              { key: "email_visibility", label: "Email Address Visibility" },
            ] as const
          ).map(({ key, label }) => (
            <div
              key={key}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2"
            >
              <p className="text-xs font-semibold text-fg">{label}</p>
              <select
                value={settings.privacy[key]}
                onChange={(e) =>
                  updatePrivacy(key, e.target.value as PrivacyPrefs[typeof key])
                }
                className="h-10 rounded-xl border border-border bg-surface px-3 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-focus-ring cursor-pointer"
              >
                <option value="employers">Employers I apply to</option>
                <option value="only_me">Only me (Strict privacy)</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Account & Security */}
      <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <Shield className="w-5 h-5 text-brand" />
          <h2 className="text-sm font-bold text-fg">Security & Account Management</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Change Password */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-fg">Account Password</p>
                <p className="text-xs text-fg-muted mt-0.5">
                  Update your credentials for secure authentication.
                </p>
              </div>
              {!isChangingPassword && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                  className="text-xs"
                >
                  <KeyRound className="w-3.5 h-3.5 mr-1" /> Change
                </Button>
              )}
            </div>
            {isChangingPassword && (
              <div className="space-y-3 p-4 bg-surface-sunken rounded-xl border border-border">
                <Input
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  className="text-xs"
                />
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="text-xs"
                />
                <div className="flex gap-2 pt-1">
                  <Button
                    colorType="primary"
                    size="sm"
                    onClick={handleChangePassword}
                    isLoading={isSaving}
                  >
                    Update Password
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordForm({
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Download Data */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-fg">Export Personal Data</p>
              <p className="text-xs text-fg-muted mt-0.5">
                Download a complete JSON export of your profile, CV analyses, and SIWES logbook entries.
              </p>
            </div>
            <a
              href="/api/me/export"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-border hover:bg-surface-sunken text-fg transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Archive</span>
            </a>
          </div>

          <hr className="border-border" />

          {/* Sign Out */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-fg">Active Session</p>
              <p className="text-xs text-fg-muted mt-0.5">
                Sign out of your session on this browser.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
            </Button>
          </div>

          <hr className="border-border" />

          {/* Delete Account */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl bg-danger-subtle/30 border border-danger/20">
            <div>
              <p className="text-xs font-bold text-danger-fg">
                Delete Student Account
              </p>
              <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                Permanently deletes your account, uploaded CV, internship matches, and recorded logbooks. This action cannot be reversed.
              </p>
            </div>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-danger-fg border-danger/30 hover:bg-danger-subtle shrink-0 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Account
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2 items-center shrink-0">
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  aria-label="Type DELETE to confirm"
                  className="w-28 h-9 px-2 text-xs rounded-xl border border-danger/40 bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-danger"
                />
                <Button
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || isDeleting}
                  isLoading={isDeleting}
                  className="bg-danger text-fg-inverse hover:opacity-90 text-xs"
                >
                  Delete Forever
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Settings Bar */}
      <div className="flex items-center justify-between pt-2">
        {hasUnsavedChanges ? (
          <span className="text-xs text-warning-fg font-semibold animate-pulse">
            ● You have unsaved changes
          </span>
        ) : (
          <span />
        )}
        <Button
          colorType="primary"
          onClick={handleSaveSettings}
          isLoading={isSaving}
          className="gap-1.5 px-6"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Preferences</span>
        </Button>
      </div>
    </div>
  );
}
