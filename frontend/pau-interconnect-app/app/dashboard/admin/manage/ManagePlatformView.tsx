import React from "react";
import { Typography, Stack, Badge } from "@/components/ui";
import { FiUsers, FiBriefcase } from "react-icons/fi";
import { authenticatedFetchServer } from "@/lib/api-server";

const Avatar = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${className}`}>
    {children}
  </div>
);

export default async function ManagePlatformView() {
  let profiles: any[] = [];
  let error: string | null = null;

  try {
    profiles = await authenticatedFetchServer("/admin/directory");
  } catch (err: any) {
    console.error("Failed to fetch profiles:", err);
    error = err.message || "Failed to load directory";
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-3xl border border-red-100 mb-8">
        <Typography variant="body1" weight="bold">{error}</Typography>
      </div>
    );
  }

  const employers = (profiles || []).filter(p => !!p && p.role === "employer");
  const students = (profiles || []).filter(p => !!p && (!p.role || p.role === "student" || p.role === "admin"));

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Typography variant="h3" weight="bold">Platform Directory</Typography>
          <Typography variant="body1" color="muted">Manage all registered users and companies</Typography>
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
             <FiBriefcase className="text-indigo-500 w-5 h-5" />
             <div>
               <Typography variant="caption" weight="bold" color="muted">Companies</Typography>
               <Typography variant="h6" weight="bold">{employers.length}</Typography>
             </div>
          </div>
          <div className="px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
             <FiUsers className="text-emerald-500 w-5 h-5" />
             <div>
               <Typography variant="caption" weight="bold" color="muted">Students</Typography>
               <Typography variant="h6" weight="bold">{students.length}</Typography>
             </div>
          </div>
        </div>
      </div>

      {/* Employers Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <FiBriefcase className="w-4 h-4" />
          </div>
          <Typography variant="h4" weight="bold">Registered Companies</Typography>
        </div>
        
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-indigo-50/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-8 py-5"><Typography variant="caption" weight="extrabold" color="muted">Company Name</Typography></th>
                  <th className="px-8 py-5"><Typography variant="caption" weight="extrabold" color="muted">Contact Rep</Typography></th>
                  <th className="px-8 py-5"><Typography variant="caption" weight="extrabold" color="muted">Description</Typography></th>
                  <th className="px-8 py-5 text-center"><Typography variant="caption" weight="extrabold" color="muted">Status</Typography></th>
                </tr>
              </thead>
              <tbody>
                {employers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <Typography color="muted">No companies registered yet.</Typography>
                    </td>
                  </tr>
                ) : employers.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <Stack direction="row" spacing={4} align="center">
                        <Avatar className="bg-gradient-to-br from-indigo-500 to-indigo-600">
                          {(emp.company_name || "C")[0]}
                        </Avatar>
                        <Typography weight="bold" className="group-hover:text-indigo-600 transition-colors">
                          {emp.company_name || "Unnamed Company"}
                        </Typography>
                      </Stack>
                    </td>
                    <td className="px-8 py-6">
                      <Typography variant="body2" weight="medium">{emp.full_name || "N/A"}</Typography>
                    </td>
                    <td className="px-8 py-6">
                       <Typography variant="body2" color="muted" className="max-w-[300px] truncate">
                           {emp.company_description || "No description provided."}
                       </Typography>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <Badge variant="success" size="sm">Active</Badge>
                    </td>
                  </tr>
                ))}
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
          <Typography variant="h4" weight="bold">Registered Students</Typography>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-emerald-50/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-8 py-5"><Typography variant="caption" weight="extrabold" color="muted">Student Name</Typography></th>
                  <th className="px-8 py-5"><Typography variant="caption" weight="extrabold" color="muted">Course / Level</Typography></th>
                  <th className="px-8 py-5"><Typography variant="caption" weight="extrabold" color="muted">CV Uploaded</Typography></th>
                  <th className="px-8 py-5 text-center"><Typography variant="caption" weight="extrabold" color="muted">Access Level</Typography></th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <Typography color="muted">No students registered yet.</Typography>
                    </td>
                  </tr>
                ) : students.map((stu: any) => (
                  <tr key={stu.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                       <Stack direction="row" spacing={4} align="center">
                        <Avatar className="bg-gradient-to-br from-emerald-500 to-emerald-600">
                          {(stu.full_name || "S")[0]}
                        </Avatar>
                        <Typography weight="bold" className="group-hover:text-emerald-600 transition-colors">
                          {stu.full_name || "Unnamed Student"}
                        </Typography>
                      </Stack>
                    </td>
                    <td className="px-8 py-6">
                      <Typography variant="body2" weight="medium">
                        {stu.course ? `${stu.course} (${stu.level || "N/A"})` : "Not provided"}
                      </Typography>
                    </td>
                    <td className="px-8 py-6">
                      {stu.cv_url ? (
                        <Badge variant="primary" size="sm">Uploaded</Badge>
                      ) : (
                        <Badge variant="slate" size="sm">Pending</Badge>
                      )}
                    </td>
                    <td className="px-8 py-6 text-center">
                      {stu.is_admin ? (
                        <Badge variant="secondary" size="sm">Platform Admin</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Active Student</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
