"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Button,
  Input,
  Card,
  CardContent,
} from "@/components/ui";
import {
  ArrowLeft,
  Edit2,
  Save,
  Download,
  User,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { authenticatedFetch, ensureFreshCvUrl } from "@/lib/api";
import { cx } from "@/utils/cx";

export default function ProfileClient({ initialProfile, userEmail }: { initialProfile: any; userEmail: string | null }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<any>(initialProfile || {});
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
  const [isRefreshingCv, setIsRefreshingCv] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Not logged in");

      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: profile.full_name,
        course: profile.course,
        level: profile.level,
        interests: profile.interests,
        cv_url: profile.cv_url,
      });
      if (error) throw error;

      if (profile.cvFile) {
        setStatus({ type: 'warning', message: "Saving changes and starting AI analysis..." });
        const bf = new FormData();
        bf.append("user_id", userId);
        bf.append("file", profile.cvFile);
        authenticatedFetch("/upload-and-analyze", { method: "POST", body: bf }).catch(console.error);
      }
      
      setStatus({ type: 'success', message: "Profile saved successfully!" });
      setIsEditing(false);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="bg-slate-50/50 px-6 py-8 md:px-10 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="w-20 h-20 bg-white rounded-2xl border border-slate-200 flex items-center justify-center shadow-sm">
              <User className="w-10 h-10 text-slate-300" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-xl font-bold text-slate-800">{profile.full_name || "Guest User"}</h1>
              <p className="text-sm text-slate-400 font-medium">{userEmail || "Log in to save"}</p>
            </div>
          </div>
          
          <div className="shrink-0">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)} 
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            ) : (
              <button 
                disabled={isSaving}
                onClick={handleSave} 
                className={cx(
                  "flex items-center gap-2 px-5 py-2 bg-slate-800 rounded-lg text-sm font-semibold text-white hover:bg-slate-700 transition-all shadow-sm",
                  isSaving && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes
              </button>
            )}
          </div>
        </div>

        <div className="p-6 md:p-10 space-y-10">
          {status && (
            <div className={cx(
              "p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
              status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
              status.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
              'bg-rose-50 text-rose-700 border border-rose-100'
            )}>
               {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
               <span>{status.message}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Full Name</label>
              <Input 
                placeholder="Ex. Hillary Ilona" 
                value={profile.full_name || ""} 
                onChange={e => setProfile({...profile, full_name: e.target.value})} 
                disabled={!isEditing} 
                className="bg-transparent border-slate-150 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Email address</label>
              <Input value={userEmail || ""} disabled={true} className="bg-slate-50/50 border-slate-150 rounded-xl opacity-60" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Course of Study</label>
            <Input 
              placeholder="Ex. Computer Science" 
              value={profile.course || ""} 
              onChange={e => setProfile({...profile, course: e.target.value})} 
              disabled={!isEditing} 
              className="bg-transparent border-slate-150 rounded-xl"
            />
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800">Curriculum Vitae (CV)</h3>
            <div className="bg-slate-50/50 border border-slate-150 border-dashed rounded-2xl p-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center mb-4 shadow-sm">
                <FileText className="w-6 h-6 text-indigo-500" />
              </div>
              <p className="text-sm font-bold text-slate-700 mb-1">
                {profile.cvFile ? profile.cvFile.name : (profile.cv_url ? "Current CV Document" : "No CV uploaded")}
              </p>
              <p className="text-xs text-slate-400 mb-6">Upload a professional PDF version of your CV for AI analysis</p>
              
              <div className="flex flex-wrap items-center justify-center gap-3">
                <label className={cx(
                  "flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm cursor-pointer",
                  !isEditing && "opacity-50 cursor-not-allowed pointer-events-none"
                )}>
                  <UploadCloud className="w-3.5 h-3.5 text-indigo-500" />
                  {profile.cvFile ? "Change File" : "Upload CV"}
                  <input type="file" hidden accept=".pdf" onChange={e => {if(e.target.files?.[0]) setProfile({...profile, cvFile: e.target.files?.[0]})}} />
                </label>
                
                {profile.cv_url && (
                  <button 
                    disabled={isRefreshingCv}
                    onClick={async () => {
                      // 1. Open blank window immediately to satisfy popup blocker requirements
                      const popup = window.open("about:blank", "_blank");
                      if (!popup) {
                        setStatus({ type: 'error', message: "Popup blocked. Please allow popups for this site." });
                        return;
                      }

                      setIsRefreshingCv(true);
                      try {
                        const userId = profile.id;
                        const freshUrl = await ensureFreshCvUrl(userId, profile.cv_url);
                        
                        const rawFullName = profile.full_name || "Student";
                        const safeName = rawFullName.trim().replace(/\s+/g, '_') + ' CV';
                        const viewerUrl = `/cv/view?name=${encodeURIComponent(safeName)}&url=${encodeURIComponent(freshUrl)}`;
                        
                        // 2. Set the location of the already-opened window
                        popup.location.href = viewerUrl;
                      } catch (err: any) {
                        console.error("CV view error:", err);
                        popup.close();
                        setStatus({ type: 'error', message: "Failed to load CV: " + err.message });
                      } finally {
                        setIsRefreshingCv(false);
                      }
                    }}
                    className={cx(
                      "flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-sm font-semibold text-white hover:bg-slate-700 transition-all shadow-sm",
                      isRefreshingCv && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isRefreshingCv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {isRefreshingCv ? "Refreshing..." : "View Current"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
