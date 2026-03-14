"use client";

import { useEffect, useState } from "react";
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const Profile = () => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id ?? null;

        if (userId) {
          setUserEmail(sessionData?.session?.user?.email ?? null);
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          setProfile(profileRow ?? {});
        } else {
          setProfile({});
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
        setProfile({});
      } finally {
        setIsProfileLoaded(true);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setStatus(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? null;

      if (userId) {
        const upsertPayload = {
          id: userId,
          full_name: profile.full_name ?? null,
          course: profile.course ?? null,
          level: profile.level ?? null,
          interests: profile.interests ?? [],
          cv_url: profile.cv_url ?? null,
        };

        const { error } = await supabase
          .from("profiles")
          .upsert(upsertPayload);

        if (error) {
          throw error;
        }

        if (profile.cvFile) {
          const backendFormData = new FormData();
          backendFormData.append("user_id", userId);
          backendFormData.append("file", profile.cvFile);

          try {
            const response = await fetch(`${BACKEND_URL}/upload-and-analyze`, {
              method: "POST",
              body: backendFormData,
            });
            const result = await response.json();
            
            if (!response.ok) {
              throw new Error(result?.error || "Backend upload failed");
            }
            
            if (result.text_length === 0) {
              setStatus({ 
                type: 'warning', 
                message: "Profile saved, but the PDF content appears empty. Please ensure it's a text-based PDF." 
              });
            } else {
              setStatus({ 
                type: 'success', 
                message: `Success! Analyzed ${result.internships_count} internships and found ${result.matches_count} potential matches.` 
              });
            }
            
            setProfile((prev: any) => ({
              ...prev,
              cv_url: result.cv_url,
              cvFile: null,
            }));
            
          } catch (cvErr: any) {
            console.error("CV Upload/Analysis failed. Full error:", cvErr);
            const errorMsg = cvErr.message || "Unknown error";
            const detailedMsg = cvErr.name === "TypeError" && cvErr.message === "Failed to fetch" 
              ? "Network error: The backend may be down, use an invalid URL, or have CORS issues."
              : `Backend error: ${errorMsg}`;
            
            setStatus({ 
              type: 'warning', 
              message: `Profile saved, but CV analysis failed. ${detailedMsg}` 
            });
          }
        } else {
           setStatus({ type: 'success', message: "Profile details saved securely." });
        }
        setIsEditing(false);
      } else {
        localStorage.setItem("userProfile", JSON.stringify(profile));
        setIsEditing(false);
        setStatus({ type: 'success', message: "Profile updated locally." });
      }
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setStatus({ type: 'error', message: err.message || "An unexpected error occurred." });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isProfileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#667eea]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-6 md:px-12 lg:px-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <Button
          variant="outline"
          leftIcon={<FiArrowLeft />}
          onClick={() => router.push("/dashboard/student")}
          className="border-none bg-white/50 hover:bg-white text-slate-500 font-bold"
        >
          Back to Dashboard
        </Button>

        <Card className="overflow-hidden border-slate-100 shadow-2xl shadow-indigo-50/50 rounded-[40px]">
          <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] px-10 py-12 text-white relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-200/20 rounded-full blur-2xl" />
            
            <Stack direction="row" align="center" justify="between">
              <Stack direction="row" align="center" spacing={6}>
                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[32px] flex items-center justify-center border border-white/30 shadow-2xl">
                  <FiUser className="w-12 h-12 text-white" />
                </div>
                <div>
                  <Typography variant="h2" weight="bold">{profile.full_name || "Guest User"}</Typography>
                  <Typography variant="body1" className="opacity-80 font-medium">{userEmail || "Log in to save your profile"}</Typography>
                </div>
              </Stack>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  leftIcon={<FiEdit2 />}
                  className="bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 text-white font-bold rounded-2xl"
                >
                  Edit Profile
                </Button>
              ) : (
                <Button
                  isLoading={isSaving}
                  onClick={handleSave}
                  leftIcon={<FiSave />}
                  className="bg-white text-[#667eea] hover:bg-white/90 shadow-xl font-bold rounded-2xl"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </Stack>
          </div>

          <CardContent className="p-10 space-y-10">
            {status && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
                status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                status.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                {status.type === 'success' ? <FiCheckCircle className="w-5 h-5" /> : <FiAlertCircle className="w-5 h-5" />}
                <Typography variant="body2" weight="bold">{status.message}</Typography>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Input
                label="Full Name"
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                disabled={!isEditing}
                placeholder="Enter your full name"
                className={!isEditing ? "opacity-70" : ""}
              />
              <Input
                label="Email Address"
                value={userEmail || profile.email || ""}
                disabled={true}
                className="opacity-50"
              />
            </div>

            <Input
              label="Course / Major"
              value={profile.course || ""}
              onChange={(e) => setProfile({ ...profile, course: e.target.value })}
              disabled={!isEditing}
              placeholder="e.g. Computer Science"
              className={!isEditing ? "opacity-70" : ""}
            />

            <div className="space-y-4">
              <Typography variant="body2" weight="bold" color="muted" className="ml-1 uppercase tracking-widest text-[10px]">
                Career Interests
              </Typography>
              <div className="flex flex-wrap gap-2">
                {profile.interests?.length > 0 ? (
                  profile.interests.map((interest: string) => (
                    <Badge key={interest} variant="primary" size="md" className="rounded-xl px-4 py-1.5 font-bold">
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <Typography variant="body2" color="muted" className="italic ml-1">No interests added yet</Typography>
                )}
              </div>
            </div>

            <Divider />

            <div className="space-y-6">
              <Typography variant="h4" weight="bold">Curriculum Vitae (CV)</Typography>
              <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center">
                  <FiUploadCloud className="w-8 h-8 text-[#667eea]" />
                </div>
                <div className="text-center space-y-1">
                  <Typography variant="body1" weight="bold">
                    {profile.cvFile ? profile.cvFile.name : "Professional CV Document"}
                  </Typography>
                  <Typography variant="caption" color="muted">PDF, DOCX up to 5MB</Typography>
                </div>
                
                <Stack direction="row" spacing={4}>
                  <Button 
                    as="label"
                    variant="outline" 
                    disabled={!isEditing}
                    className={`rounded-xl font-bold px-6 ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'bg-white hover:border-[#667eea] hover:text-[#667eea]'}`}
                  >
                    {profile.cvFile ? "Change File" : "Upload New CV"}
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setProfile({ ...profile, cvFile: file });
                      }}
                    />
                  </Button>
                  
                  {profile.cv_url && (
                    <Button
                      variant="solid"
                      leftIcon={<FiDownload />}
                      onClick={async () => {
                        try {
                          const { data: sessionData } = await supabase.auth.getSession();
                          const userId = sessionData?.session?.user?.id;
                          if (!userId) throw new Error("Not logged in");

                          const response = await fetch(`${BACKEND_URL}/refresh-cv-url`, {
                             method: "POST",
                             headers: { "Content-Type": "application/json" },
                             body: JSON.stringify({ user_id: userId })
                          });
                          
                          const data = await response.json();
                          if (data.cv_url) {
                             setProfile((prev: any) => ({ ...prev, cv_url: data.cv_url }));
                             window.open(data.cv_url, "_blank");
                             return;
                          }
                          window.open(profile.cv_url, "_blank");
                        } catch (err) {
                          console.error("Download Error:", err);
                          window.open(profile.cv_url, "_blank");
                        }
                      }}
                      className="rounded-xl font-bold px-8 shadow-lg shadow-indigo-100"
                    >
                      View Current CV
                    </Button>
                  )}
                </Stack>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
