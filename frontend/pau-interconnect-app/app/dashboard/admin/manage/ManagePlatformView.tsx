"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Stack,
  Badge,
  Button,
  Input,
  ConfirmDialog,
  Avatar,
  Card,
  EmptyState,
} from "@/components/ui";
import {
  FiUsers,
  FiBriefcase,
  FiCheckCircle,
  FiAlertTriangle,
  FiSearch,
  FiSlash,
  FiRefreshCw,
} from "react-icons/fi";
import { authenticatedFetch } from "@/lib/api";

export type DirectoryProfile = {
  id: string;
  role?: string | null;
  company_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  company_description?: string | null;
  course?: string | null;
  level?: string | null;
  cv_url?: string | null;
  is_admin?: boolean | null;
  is_suspended?: boolean | null;
  is_verified?: boolean | null;
  created_at?: string | null;
};

interface DirectoryApiResponse {
  data: DirectoryProfile[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export default function ManagePlatformView() {
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "verify" | "unverify" | "suspend" | "reinstate" | null;
    profile: DirectoryProfile | null;
  }>({
    isOpen: false,
    type: null,
    profile: null,
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = searchQuery
        ? `/admin/directory?page=1&page_size=100&search=${encodeURIComponent(searchQuery)}`
        : `/admin/directory?page=1&page_size=100`;

      const response = await authenticatedFetch<DirectoryApiResponse | DirectoryProfile[]>(url);

      if (Array.isArray(response)) {
        setProfiles(response);
      } else if (response && Array.isArray(response.data)) {
        setProfiles(response.data);
      } else {
        setProfiles([]);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch directory:", err);
      setError(err instanceof Error ? err.message : "Failed to load directory.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDirectory();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDirectory]);

  // Employer Verification Action
  const executeVerification = async (emp: DirectoryProfile) => {
    setActionLoadingId(emp.id);
    const endpoint = emp.is_verified
      ? `/admin/employers/${emp.id}/unverify`
      : `/admin/employers/${emp.id}/verify`;

    try {
      await authenticatedFetch(endpoint, { method: "POST" });
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === emp.id ? { ...p, is_verified: !emp.is_verified } : p,
        ),
      );
      showNotification(
        "success",
        emp.is_verified
          ? `Removed verification for ${emp.company_name || "employer"}.`
          : `Verified ${emp.company_name || "employer"} successfully.`,
      );
    } catch (err) {
      console.error("Verification failed:", err);
      showNotification("error", "Action failed. Please try again.");
    } finally {
      setActionLoadingId(null);
      setConfirmDialog({ isOpen: false, type: null, profile: null });
    }
  };

  // User Suspension Action
  const executeSuspension = async (user: DirectoryProfile) => {
    if (user.is_admin) {
      showNotification("error", "Cannot suspend an administrator account.");
      setConfirmDialog({ isOpen: false, type: null, profile: null });
      return;
    }

    setActionLoadingId(user.id);
    const isSuspended = Boolean(user.is_suspended);
    const endpoint = isSuspended
      ? `/admin/users/${user.id}/reinstate`
      : `/admin/users/${user.id}/suspend`;

    try {
      await authenticatedFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ reason: isSuspended ? null : "Admin policy action" }),
      });
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === user.id ? { ...p, is_suspended: !isSuspended } : p,
        ),
      );
      showNotification(
        "success",
        isSuspended
          ? `Reinstated ${user.full_name || user.company_name || "user"}.`
          : `Suspended ${user.full_name || user.company_name || "user"}.`,
      );
    } catch (err) {
      console.error("Suspension toggle failed:", err);
      showNotification("error", "Action failed. Cannot suspend admins or target.");
    } finally {
      setActionLoadingId(null);
      setConfirmDialog({ isOpen: false, type: null, profile: null });
    }
  };

  const handleOpenConfirm = (
    type: "verify" | "unverify" | "suspend" | "reinstate",
    profile: DirectoryProfile,
  ) => {
    setConfirmDialog({
      isOpen: true,
      type,
      profile,
    });
  };

  const employers = profiles.filter((p) => !!p && p.role === "employer");
  const students = profiles.filter(
    (p) => !!p && (!p.role || p.role === "student" || p.role === "admin"),
  );
  const verifiedEmployersCount = employers.filter((e) => e.is_verified).length;
  const suspendedCount = profiles.filter((p) => p.is_suspended).length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Toast Notification */}
      {notification && (
        <div
          role="alert"
          className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-bottom-4 ${
            notification.type === "success"
              ? "bg-success-subtle text-success-fg border-success-subtle"
              : "bg-danger-subtle text-danger-fg border-danger-subtle"
          }`}
        >
          {notification.type === "success" ? (
            <FiCheckCircle className="w-5 h-5 text-success-fg shrink-0" />
          ) : (
            <FiAlertTriangle className="w-5 h-5 text-danger-fg shrink-0" />
          )}
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header and Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Typography variant="h3" weight="bold">
            Platform Management
          </Typography>
          <Typography variant="body1" color="muted">
            Inspect directory, verify employers, and manage platform safety.
          </Typography>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="px-5 py-3 bg-surface rounded-2xl border border-border shadow-sm flex items-center gap-3">
            <FiBriefcase className="text-brand w-5 h-5" />
            <div>
              <Typography variant="caption" weight="bold" color="muted">
                Companies ({verifiedEmployersCount} verified)
              </Typography>
              <Typography variant="h6" weight="bold">
                {employers.length}
              </Typography>
            </div>
          </div>

          <div className="px-5 py-3 bg-surface rounded-2xl border border-border shadow-sm flex items-center gap-3">
            <FiUsers className="text-success-fg w-5 h-5" />
            <div>
              <Typography variant="caption" weight="bold" color="muted">
                Students
              </Typography>
              <Typography variant="h6" weight="bold">
                {students.length}
              </Typography>
            </div>
          </div>

          {suspendedCount > 0 && (
            <div className="px-5 py-3 bg-warning-subtle rounded-2xl border border-warning-subtle shadow-sm flex items-center gap-3">
              <FiSlash className="text-warning-fg w-5 h-5" />
              <div>
                <Typography variant="caption" weight="bold" className="text-warning-fg">
                  Suspended
                </Typography>
                <Typography variant="h6" weight="bold" className="text-warning-fg">
                  {suspendedCount}
                </Typography>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search and Refresh bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <FiSearch className="text-fg-subtle w-5 h-5" />
          </div>
          <Input
            placeholder="Filter directory by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => void fetchDirectory()}
          leftIcon={<FiRefreshCw className={loading ? "animate-spin" : ""} />}
          className="rounded-2xl border-border"
        >
          Refresh
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-danger-subtle text-danger-fg p-6 rounded-2xl border border-danger-subtle"
        >
          <Typography variant="body1" weight="bold">
            {error}
          </Typography>
        </div>
      )}

      {/* Employers Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-brand-subtle text-brand flex items-center justify-center">
            <FiBriefcase className="w-4 h-4" />
          </div>
          <Typography variant="h4" weight="bold">
            Registered Employers & Organizations
          </Typography>
        </div>

        <Card className="border border-border bg-surface shadow-sm overflow-hidden">
          {/* Mobile view (< 768px) */}
          <div className="block md:hidden divide-y divide-border">
            {loading && profiles.length === 0 ? (
              <div className="p-8 text-center text-fg-subtle">
                Loading employers...
              </div>
            ) : employers.length === 0 ? (
              <div className="p-8 text-center text-fg-subtle">
                No companies found matching search criteria.
              </div>
            ) : (
              employers.map((emp) => (
                <div key={emp.id} className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <Stack direction="row" spacing={3} align="center">
                      <Avatar name={emp.company_name || emp.full_name || "Company"} size="md" />
                      <div>
                        <Typography weight="bold" className="text-fg">
                          {emp.company_name || "Unnamed Company"}
                        </Typography>
                        {emp.email && (
                          <Typography variant="caption" color="muted">
                            {emp.email}
                          </Typography>
                        )}
                      </div>
                    </Stack>
                    <div className="flex flex-col gap-1 items-end">
                      {emp.is_verified ? (
                        <Badge variant="success" size="sm">Verified</Badge>
                      ) : (
                        <Badge variant="slate" size="sm">Unverified</Badge>
                      )}
                      {emp.is_suspended && (
                        <Badge variant="error" size="sm">Suspended</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                    <span className="text-fg-muted">Rep: {emp.full_name || "N/A"}</span>
                    <Stack direction="row" spacing={2}>
                      <Button
                        size="xs"
                        variant={emp.is_verified ? "outline" : "solid"}
                        disabled={actionLoadingId === emp.id}
                        onClick={() => handleOpenConfirm(emp.is_verified ? "unverify" : "verify", emp)}
                      >
                        {emp.is_verified ? "Unverify" : "Verify"}
                      </Button>
                      <Button
                        size="xs"
                        variant={emp.is_suspended ? "outline" : "ghost"}
                        disabled={actionLoadingId === emp.id || Boolean(emp.is_admin)}
                        onClick={() => handleOpenConfirm(emp.is_suspended ? "reinstate" : "suspend", emp)}
                        className={emp.is_suspended ? "text-success-fg hover:bg-success-subtle" : "text-danger-fg hover:bg-danger-subtle"}
                      >
                        {emp.is_suspended ? "Reinstate" : "Suspend"}
                      </Button>
                    </Stack>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-sunken border-b border-border">
                  <th className="px-6 py-4">
                    <Typography variant="caption" weight="extrabold" color="muted">
                      Company
                    </Typography>
                  </th>
                  <th className="px-6 py-4">
                    <Typography variant="caption" weight="extrabold" color="muted">
                      Representative
                    </Typography>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <Typography variant="caption" weight="extrabold" color="muted">
                      Verification
                    </Typography>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <Typography variant="caption" weight="extrabold" color="muted">
                      Account Status
                    </Typography>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <Typography variant="caption" weight="extrabold" color="muted">
                      Admin Actions
                    </Typography>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && profiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-fg-subtle">
                      Loading employers...
                    </td>
                  </tr>
                ) : employers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-fg-subtle">
                      No companies found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  employers.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-border hover:bg-surface-sunken/40 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <Stack direction="row" spacing={3} align="center">
                          <Avatar name={emp.company_name || emp.full_name || "Company"} size="md" />
                          <div>
                            <Typography weight="bold">
                              {emp.company_name || "Unnamed Company"}
                            </Typography>
                            {emp.email && (
                              <Typography variant="caption" color="muted">
                                {emp.email}
                              </Typography>
                            )}
                          </div>
                        </Stack>
                      </td>
                      <td className="px-6 py-5">
                        <Typography variant="body2">
                          {emp.full_name || "N/A"}
                        </Typography>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {emp.is_verified ? (
                          <Badge variant="success" size="sm">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="slate" size="sm">
                            Unverified
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {emp.is_suspended ? (
                          <Badge variant="error" size="sm">
                            Suspended
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Stack direction="row" spacing={2} justify="end">
                          <Button
                            size="sm"
                            variant={emp.is_verified ? "outline" : "solid"}
                            disabled={actionLoadingId === emp.id}
                            onClick={() => handleOpenConfirm(emp.is_verified ? "unverify" : "verify", emp)}
                            className="rounded-xl text-xs font-semibold"
                          >
                            {emp.is_verified ? "Unverify" : "Verify Employer"}
                          </Button>
                          <Button
                            size="sm"
                            variant={emp.is_suspended ? "outline" : "ghost"}
                            disabled={actionLoadingId === emp.id || Boolean(emp.is_admin)}
                            onClick={() => handleOpenConfirm(emp.is_suspended ? "reinstate" : "suspend", emp)}
                            className={`rounded-xl text-xs font-semibold ${
                              emp.is_suspended
                                ? "text-success-fg hover:bg-success-subtle"
                                : "text-danger-fg hover:bg-danger-subtle"
                            }`}
                          >
                            {emp.is_suspended ? "Reinstate" : "Suspend"}
                          </Button>
                        </Stack>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Students Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-success-subtle text-success-fg flex items-center justify-center">
            <FiUsers className="w-4 h-4" />
          </div>
          <Typography variant="h4" weight="bold">
            Registered Students
          </Typography>
        </div>

        <Card className="border border-border bg-surface shadow-sm overflow-hidden">
          {/* Mobile view (< 768px) */}
          <div className="block md:hidden divide-y divide-border">
            {loading && profiles.length === 0 ? (
              <div className="p-8 text-center text-fg-subtle">
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-fg-subtle">
                No students found matching search criteria.
              </div>
            ) : (
              students.map((stu) => (
                <div key={stu.id} className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <Stack direction="row" spacing={3} align="center">
                      <Avatar name={stu.full_name || "Student"} size="md" />
                      <div>
                        <Typography weight="bold" className="text-fg">
                          {stu.full_name || "Unnamed Student"}
                        </Typography>
                        {stu.email && (
                          <Typography variant="caption" color="muted">
                            {stu.email}
                          </Typography>
                        )}
                      </div>
                    </Stack>
                    <div>
                      {stu.is_admin ? (
                        <Badge variant="secondary" size="sm">Admin</Badge>
                      ) : stu.is_suspended ? (
                        <Badge variant="error" size="sm">Suspended</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Active</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                    <span className="text-fg-muted">
                      {stu.course ? `${stu.course} (${stu.level || "N/A"})` : "No course"}
                    </span>
                    {!stu.is_admin ? (
                      <Button
                        size="xs"
                        variant={stu.is_suspended ? "outline" : "ghost"}
                        disabled={actionLoadingId === stu.id}
                        onClick={() => handleOpenConfirm(stu.is_suspended ? "reinstate" : "suspend", stu)}
                        className={stu.is_suspended ? "text-success-fg hover:bg-success-subtle" : "text-danger-fg hover:bg-danger-subtle"}
                      >
                        {stu.is_suspended ? "Reinstate" : "Suspend"}
                      </Button>
                    ) : (
                      <span className="text-xs text-fg-subtle font-medium italic">Protected</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-sunken border-b border-border">
                  <th className="px-6 py-4">
                    <Typography variant="caption" weight="extrabold" color="muted">
                      Student Name
                    </Typography>
                  </th>
                  <th className="px-6 py-4">
                    <Typography variant="caption" weight="extrabold" color="muted">
                      Course / Level
                    </Typography>
                  </th>
                  <th className="px-6 py-4">
                    <Typography variant="caption" weight="extrabold" color="muted">
                      CV Status
                    </Typography>
                  </th>
                  <th className="px-6 py-4 text-center">
                    <Typography variant="caption" weight="extrabold" color="muted">
                      Status / Role
                    </Typography>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <Typography variant="caption" weight="extrabold" color="muted">
                      Action
                    </Typography>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && profiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-fg-subtle">
                      Loading students...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-fg-subtle">
                      No students found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  students.map((stu) => (
                    <tr
                      key={stu.id}
                      className="border-b border-border hover:bg-surface-sunken/40 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <Stack direction="row" spacing={3} align="center">
                          <Avatar name={stu.full_name || "Student"} size="md" />
                          <div>
                            <Typography weight="bold">
                              {stu.full_name || "Unnamed Student"}
                            </Typography>
                            {stu.email && (
                              <Typography variant="caption" color="muted">
                                {stu.email}
                              </Typography>
                            )}
                          </div>
                        </Stack>
                      </td>
                      <td className="px-6 py-5">
                        <Typography variant="body2">
                          {stu.course
                            ? `${stu.course} (${stu.level || "N/A"})`
                            : "Not provided"}
                        </Typography>
                      </td>
                      <td className="px-6 py-5">
                        {stu.cv_url ? (
                          <Badge variant="primary" size="sm">
                            Uploaded
                          </Badge>
                        ) : (
                          <Badge variant="slate" size="sm">
                            Pending
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-5 text-center">
                        {stu.is_admin ? (
                          <Badge variant="secondary" size="sm">
                            Platform Admin
                          </Badge>
                        ) : stu.is_suspended ? (
                          <Badge variant="error" size="sm">
                            Suspended
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            Active Student
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {!stu.is_admin ? (
                          <Button
                            size="sm"
                            variant={stu.is_suspended ? "outline" : "ghost"}
                            disabled={actionLoadingId === stu.id}
                            onClick={() => handleOpenConfirm(stu.is_suspended ? "reinstate" : "suspend", stu)}
                            className={`rounded-xl text-xs font-semibold ${
                              stu.is_suspended
                                ? "text-success-fg hover:bg-success-subtle"
                                : "text-danger-fg hover:bg-danger-subtle"
                            }`}
                          >
                            {stu.is_suspended ? "Reinstate" : "Suspend"}
                          </Button>
                        ) : (
                          <span className="text-xs text-fg-subtle font-medium italic">
                            Protected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Accessible Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: null, profile: null })}
        onConfirm={() => {
          if (!confirmDialog.profile) return;
          if (confirmDialog.type === "verify" || confirmDialog.type === "unverify") {
            void executeVerification(confirmDialog.profile);
          } else if (confirmDialog.type === "suspend" || confirmDialog.type === "reinstate") {
            void executeSuspension(confirmDialog.profile);
          }
        }}
        isLoading={Boolean(actionLoadingId)}
        variant={
          confirmDialog.type === "suspend"
            ? "danger"
            : confirmDialog.type === "unverify"
              ? "warning"
              : "success"
        }
        title={
          confirmDialog.type === "verify"
            ? `Verify ${confirmDialog.profile?.company_name || "Employer"}`
            : confirmDialog.type === "unverify"
              ? `Remove Verification for ${confirmDialog.profile?.company_name || "Employer"}`
              : confirmDialog.type === "suspend"
                ? `Suspend ${confirmDialog.profile?.full_name || confirmDialog.profile?.company_name || "Account"}`
                : `Reinstate ${confirmDialog.profile?.full_name || confirmDialog.profile?.company_name || "Account"}`
        }
        message={
          confirmDialog.type === "verify"
            ? "Verifying this organization signals authentic placement opportunities to students across Pan-Atlantic University."
            : confirmDialog.type === "unverify"
              ? "Are you sure you want to remove this employer's verified badge? Students will see unverified credentials."
              : confirmDialog.type === "suspend"
                ? "Suspending this user revokes immediate access to logbooks, applications, and postings until reinstated."
                : "Reinstating will restore standard account permissions immediately."
        }
        confirmLabel={
          confirmDialog.type === "verify"
            ? "Verify Organization"
            : confirmDialog.type === "unverify"
              ? "Remove Verification"
              : confirmDialog.type === "suspend"
                ? "Suspend Account"
                : "Reinstate Account"
        }
      />
    </div>
  );
}
