"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Typography, Stack, Badge, Button, Input } from "@/components/ui";
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

const Avatar = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${className}`}
  >
    {children}
  </div>
);

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
  const handleToggleVerification = async (emp: DirectoryProfile) => {
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
    }
  };

  // User Suspension Action
  const handleToggleSuspension = async (user: DirectoryProfile) => {
    if (user.is_admin) {
      showNotification("error", "Cannot suspend an administrator account.");
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
    }
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
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <FiCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <FiAlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
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
          <div className="px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <FiBriefcase className="text-indigo-500 w-5 h-5" />
            <div>
              <Typography variant="caption" weight="bold" color="muted">
                Companies ({verifiedEmployersCount} verified)
              </Typography>
              <Typography variant="h6" weight="bold">
                {employers.length}
              </Typography>
            </div>
          </div>

          <div className="px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <FiUsers className="text-emerald-500 w-5 h-5" />
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
            <div className="px-5 py-3 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-3">
              <FiSlash className="text-amber-600 w-5 h-5" />
              <div>
                <Typography variant="caption" weight="bold" className="text-amber-700">
                  Suspended
                </Typography>
                <Typography variant="h6" weight="bold" className="text-amber-900">
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
            <FiSearch className="text-slate-400 w-5 h-5" />
          </div>
          <Input
            placeholder="Filter directory by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-white border-slate-100 rounded-2xl"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => void fetchDirectory()}
          leftIcon={<FiRefreshCw className={loading ? "animate-spin" : ""} />}
          className="rounded-2xl border-slate-200"
        >
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-100">
          <Typography variant="body1" weight="bold">
            {error}
          </Typography>
        </div>
      )}

      {/* Employers Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <FiBriefcase className="w-4 h-4" />
          </div>
          <Typography variant="h4" weight="bold">
            Registered Employers & Organizations
          </Typography>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
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
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Loading employers...
                    </td>
                  </tr>
                ) : employers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No companies found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  employers.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <Stack direction="row" spacing={3} align="center">
                          <Avatar className="bg-gradient-to-br from-indigo-500 to-indigo-600">
                            {(emp.company_name || emp.full_name || "C")[0].toUpperCase()}
                          </Avatar>
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
                            onClick={() => void handleToggleVerification(emp)}
                            className="rounded-xl text-xs font-semibold"
                          >
                            {emp.is_verified ? "Unverify" : "Verify Employer"}
                          </Button>
                          <Button
                            size="sm"
                            variant={emp.is_suspended ? "outline" : "ghost"}
                            disabled={actionLoadingId === emp.id || Boolean(emp.is_admin)}
                            onClick={() => void handleToggleSuspension(emp)}
                            className={`rounded-xl text-xs font-semibold ${
                              emp.is_suspended
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-red-500 hover:bg-red-50"
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
        </div>
      </div>

      {/* Students Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <FiUsers className="w-4 h-4" />
          </div>
          <Typography variant="h4" weight="bold">
            Registered Students
          </Typography>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
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
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Loading students...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No students found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  students.map((stu) => (
                    <tr
                      key={stu.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <Stack direction="row" spacing={3} align="center">
                          <Avatar className="bg-gradient-to-br from-emerald-500 to-emerald-600">
                            {(stu.full_name || "S")[0].toUpperCase()}
                          </Avatar>
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
                            onClick={() => void handleToggleSuspension(stu)}
                            className={`rounded-xl text-xs font-semibold ${
                              stu.is_suspended
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-red-500 hover:bg-red-50"
                            }`}
                          >
                            {stu.is_suspended ? "Reinstate" : "Suspend"}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">
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
        </div>
      </div>
    </div>
  );
}
