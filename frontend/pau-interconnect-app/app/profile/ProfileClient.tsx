"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
} from "@/components/ui";
import {
  FiArrowLeft,
  FiEdit2,
  FiSave,
  FiDownload,
  FiUser,
  FiUploadCloud,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { authenticatedFetch } from "@/lib/api";

export default function ProfileClient({ initialProfile, userEmail }: { initialProfile: any; userEmail: string | null }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<any>(initialProfile || {});
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);

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
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
      <Button
        variant="outline"
        leftIcon={<FiArrowLeft />}
        onClick={() => router.push("/dashboard/student")}
        className="border-none bg-white/50 hover:bg-white text-slate-500 font-bold"
      >
        Back to Dashboard
      </Button>

      <Card className="overflow-hidden border-slate-100 shadow-2xl rounded-2xl md:rounded-[40px]">
        <div className="bg-gradient-to-r from-brand to-brand-secondary px-6 py-8 md:px-10 md:py-12 text-white relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4 md:gap-6">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-2xl">
                <FiUser className="w-8 h-8 md:w-12 md:h-12 text-white" />
              </div>
              <div>
                <Typography variant="h2" weight="bold">{profile.full_name || "Guest User"}</Typography>
                <Typography variant="body1" className="opacity-80 font-medium">{userEmail || "Log in to save"}</Typography>
              </div>
            </div>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} leftIcon={<FiEdit2 />} className="bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 text-white font-bold rounded-2xl">Edit Profile</Button>
            ) : (
              <Button isLoading={isSaving} onClick={handleSave} leftIcon={<FiSave />} className="bg-white text-brand hover:bg-white/90 shadow-xl font-bold rounded-2xl">Save Changes</Button>
            )}
          </div>
        </div>

        <CardContent className="p-6 md:p-10 space-y-10">
          {status && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : status.type === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
               {status.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
               <Typography variant="body2" weight="bold">{status.message}</Typography>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input label="Full Name" value={profile.full_name || ""} onChange={e => setProfile({...profile, full_name: e.target.value})} disabled={!isEditing} />
            <Input label="Email" value={userEmail || ""} disabled={true} className="opacity-50" />
          </div>

          <Input label="Course" value={profile.course || ""} onChange={e => setProfile({...profile, course: e.target.value})} disabled={!isEditing} />

          <Divider />

          <div className="space-y-6">
            <Typography variant="h4" weight="bold">Curriculum Vitae (CV)</Typography>
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center space-y-6">
              <FiUploadCloud className="w-12 h-12 text-brand" />
              <Typography variant="body2" weight="bold">{profile.cvFile ? profile.cvFile.name : "Professional CV Document"}</Typography>
              <div className="flex gap-4">
                <Button as="label" variant="outline" disabled={!isEditing} className={`bg-white hover:border-brand ${!isEditing ? 'opacity-50' : 'cursor-pointer'}`}>
                  {profile.cvFile ? "Change File" : "Upload New CV"}
                  <input type="file" hidden accept=".pdf" onChange={e => {if(e.target.files?.[0]) setProfile({...profile, cvFile: e.target.files?.[0]})}} />
                </Button>
                {profile.cv_url && <Button variant="solid" leftIcon={<FiDownload />} onClick={() => window.open(profile.cv_url, "_blank")}>View Current CV</Button>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
