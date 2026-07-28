"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui";
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
} from "lucide-react";
import { cx } from "@/utils/cx";
import { useTheme } from "next-themes";

type NotificationPrefs = {
  new_matches: boolean;
  application_updates: boolean;
  interview_invitations: boolean;
  employer_messages: boolean;
  saved_reminders: boolean;
  weekly_digest: boolean;
};

type PrivacyPrefs = {
  profile_visibility: "everyone" | "employers" | "only_me";
  cv_visibility: "everyone" | "employers" | "only_me";
  phone_visibility: "everyone" | "employers" | "only_me";
  email_visibility: "everyone" | "employers" | "only_me";
};

type SettingsState = {
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
};

const defaultNotifications: NotificationPrefs = {
  new_matches: true,
  application_updates: true,
  interview_invitations: true,
  employer_messages: true,
  saved_reminders: false,
  weekly_digest: true,
};

const defaultPrivacy: PrivacyPrefs = {
  profile_visibility: "employers",
  cv_visibility: "employers",
  phone_visibility: "only_me",
  email_visibility: "employers",
};

export default function StudentSettingsClient({
  initialSettings,
}: {
  initialSettings: SettingsState | null;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      ...defaultNotifications,
      ...(initialSettings?.notifications ?? {}),
    },
    privacy: {
      ...defaultPrivacy,
      ...(initialSettings?.privacy ?? {}),
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      const { error } = await supabase
        .from("profiles")
        .update({
          settings: settings,
        })
        .eq("id", userId);

      if (error) throw error;
      setStatus({ type: "success", message: "Settings saved!" });
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
      setStatus({ type: "error", message: "Passwords do not match" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setStatus({
        type: "error",
        message: "Password must be at least 6 characters",
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
      setStatus({ type: "success", message: "Password updated successfully!" });
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
    setStatus({
      type: "error",
      message:
        "Account deletion requires admin approval. Please contact support.",
    });
    setShowDeleteConfirm(false);
  };

  const toggleNotification = (key: keyof NotificationPrefs) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key],
      },
    });
  };

  const updatePrivacy = (
    key: keyof PrivacyPrefs,
    value: PrivacyPrefs[keyof PrivacyPrefs],
  ) => {
    setSettings({
      ...settings,
      privacy: { ...settings.privacy, [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/dashboard/student")}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Dashboard
      </button>

      {status && (
        <div
          className={cx(
            "p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
            status.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
              : "bg-rose-50 text-rose-700 border border-rose-100",
          )}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Account Settings */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <Shield className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-800">
            Account & Security
          </h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Change Password */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Password</p>
                <p className="text-xs text-slate-400">
                  Change your account password
                </p>
              </div>
              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Change
                </button>
              )}
            </div>
            {isChangingPassword && (
              <div className="space-y-3 pl-0 md:pl-4 border-l-2 border-indigo-100 ml-0 md:ml-2">
                <Input
                  type="password"
                  placeholder="New password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  className="bg-transparent border-slate-150 rounded-xl max-w-sm"
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
                  className="bg-transparent border-slate-150 rounded-xl max-w-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={isSaving}
                    className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    {isSaving ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordForm({
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 text-sm font-semibold text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Sign Out */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Sign Out</p>
              <p className="text-xs text-slate-400">
                Sign out of your account on this device
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Delete Account */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-600">
                Delete Account
              </p>
              <p className="text-xs text-slate-400">
                Permanently delete your account and all data
              </p>
            </div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <Bell className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-800">Notifications</h2>
        </div>
        <div className="p-6 space-y-4">
          {(
            [
              {
                key: "new_matches",
                label: "New internship matches",
                desc: "When AI finds internships matching your profile",
              },
              {
                key: "application_updates",
                label: "Application updates",
                desc: "Status changes on your applications",
              },
              {
                key: "interview_invitations",
                label: "Interview invitations",
                desc: "When an employer invites you for an interview",
              },
              {
                key: "employer_messages",
                label: "Employer messages",
                desc: "Direct messages from employers",
              },
              {
                key: "saved_reminders",
                label: "Saved internship reminders",
                desc: "Deadline reminders for saved internships",
              },
              {
                key: "weekly_digest",
                label: "Weekly digest",
                desc: "Weekly summary of new opportunities",
              },
            ] as const
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <button
                onClick={() => toggleNotification(key)}
                className={cx(
                  "relative w-10 h-6 rounded-full transition-colors",
                  settings.notifications[key]
                    ? "bg-indigo-500"
                    : "bg-slate-200",
                )}
              >
                <span
                  className={cx(
                    "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                    settings.notifications[key]
                      ? "translate-x-[18px]"
                      : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <Eye className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-800">Privacy</h2>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-400">
            Control who can see your information
          </p>
          {(
            [
              { key: "profile_visibility", label: "Profile" },
              { key: "cv_visibility", label: "CV / Resume" },
              { key: "phone_visibility", label: "Phone Number" },
              { key: "email_visibility", label: "Email Address" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <select
                value={settings.privacy[key]}
                onChange={(e) =>
                  updatePrivacy(key, e.target.value as PrivacyPrefs[typeof key])
                }
                className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="everyone">Everyone</option>
                <option value="employers">Employers Only</option>
                <option value="only_me">Only Me</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <Monitor className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-bold text-slate-800">Appearance</h2>
        </div>
        <div className="p-6">
          <p className="text-xs text-slate-400 mb-4">Choose your theme</p>
          <div className="flex gap-3">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  theme === value
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className={cx(
            "flex items-center gap-2 px-6 py-2.5 bg-slate-800 rounded-lg text-sm font-semibold text-white hover:bg-slate-700 transition-all shadow-sm",
            isSaving && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Save Settings
        </button>
      </div>
    </div>
  );
}
