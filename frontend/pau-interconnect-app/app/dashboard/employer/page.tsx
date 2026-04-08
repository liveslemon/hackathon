"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Button,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Stack,
  Modal,
  Input,
  Select,
  Badge,
  Textarea,
  Skeleton,
} from "@/components/ui";
import { FiPlus, FiBriefcase, FiUsers, FiClock, FiSearch } from "react-icons/fi";
import DashboardHeader from "@/components/DashboardHeader";

export default function EmployerDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [internships, setInternships] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  
  const [roleTitle, setRoleTitle] = useState("");
  const [field, setField] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [recruiterLink, setRecruiterLink] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);

  const INTERNSHIP_CATEGORIES = [
    { value: "", label: "Select Category" },
    { value: "Remote", label: "Remote" },
    { value: "Hybrid", label: "Hybrid" },
    { value: "On-site", label: "On-site" }
  ];

  const FIELD_OPTIONS = [
    { value: "", label: "Select Field" },
    { value: "Software Engineering", label: "Software Engineering" },
    { value: "Data Science", label: "Data Science" },
    { value: "Product Management", label: "Product Management" },
    { value: "Design / UI/UX", label: "Design / UI/UX" },
    { value: "Marketing", label: "Marketing" },
    { value: "Business / Finance", label: "Business / Finance" },
    { value: "Human Resources", label: "Human Resources" },
    { value: "Operations", label: "Operations" },
    { value: "Other", label: "Other" }
  ];

  const router = useRouter();

  useEffect(() => {
    fetchEmployerData();
  }, []);

  const fetchEmployerData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login/employer");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (!profileData || profileData.role !== "employer") {
        router.push("/");
        return;
      }
      setProfile(profileData);

      const { data: myInternships } = await supabase
        .from("internships")
        .select("*")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });

      setInternships(myInternships || []);

      if (myInternships && myInternships.length > 0) {
        const internshipIds = myInternships.map(i => i.id);
        const { data: apps } = await supabase
          .from("applied_internships")
          .select("id, internship_id")
          .in("internship_id", internshipIds);
        setApplications(apps || []);
      }

    } catch (error) {
      console.error("Error loading employer dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInternship = async () => {
     const finalInterests = interestInput.split(',').map(i => i.trim()).filter(i => i.length > 0);
     if (!roleTitle || !description || !field || !category || finalInterests.length === 0) {
        alert("Please fill out all required fields and enter at least one interest (comma-separated).");
        return;
     }

     try {
       setCreating(true);
       
       const payload = {
          employer_id: profile.id,
          company: profile.company_name,
          role: roleTitle,
          field: field,
          category: category,
          description: description,
          requirements: requirements,
          interests: finalInterests,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          recruiter_link: recruiterLink || null,
       };

       const { data: newInternship, error } = await supabase.from("internships").insert([payload]).select().single();
       
       if (error) throw error;
       
       if (newInternship?.id) {
         fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/analyze-new-internship`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ internship_id: newInternship.id })
         }).catch(err => console.error("Failed to trigger background AI Analysis:", err));
       }
       
       setCreateModalOpen(false);
       setRoleTitle("");
       setDescription("");
       setField("");
       setCategory("");
       setRequirements("");
       setInterests([]);
       setInterestInput("");
       setDeadline("");
       setRecruiterLink("");
       fetchEmployerData();
     } catch (err: any) {
        alert(err.message || "Failed to create internship");
     } finally {
        setCreating(false);
     }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="h-[88px] bg-white border-b border-slate-100 px-6 md:px-10 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
        
        <main className="max-w-6xl mx-auto p-6 md:p-10">
          <div className="flex justify-between items-center mb-10">
            <div>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-12 w-40 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>

          <Skeleton className="h-8 w-56 mb-6" />

          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-3xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardHeader userProfile={profile} />

      <main className="max-w-6xl mx-auto p-6 md:p-10">
        <Stack direction="row" justify="between" align="center" className="mb-10">
          <div>
            <Typography variant="h2" weight="bold">Company Dashboard</Typography>
            <Typography variant="body1" color="muted">Welcome back, <span className="text-brand font-semibold">{profile?.company_name}</span></Typography>
          </div>
          <Button 
            onClick={() => setCreateModalOpen(true)}
            leftIcon={<FiPlus className="w-5 h-5" />}
            className="shadow-lg shadow-indigo-100"
          >
            Post Internship
          </Button>
        </Stack>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
           <Card className="hover:shadow-lg transition-all duration-300 border-indigo-50 bg-gradient-to-br from-white to-indigo-50/30">
             <CardContent className="p-8">
               <Stack direction="row" align="center" justify="between">
                 <div>
                   <Typography variant="body2" color="muted" weight="bold" className="uppercase tracking-wider mb-2">Active Postings</Typography>
                   <Typography variant="h1" className="text-slate-800">{internships.length}</Typography>
                 </div>
                 <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
                   <FiBriefcase className="w-8 h-8" />
                 </div>
               </Stack>
             </CardContent>
           </Card>
           
           <Card className="hover:shadow-lg transition-all duration-300 border-purple-50 bg-gradient-to-br from-white to-purple-50/30">
             <CardContent className="p-8">
               <Stack direction="row" align="center" justify="between">
                 <div>
                   <Typography variant="body2" color="muted" weight="bold" className="uppercase tracking-wider mb-2">Total Applicants</Typography>
                   <Typography variant="h1" className="text-slate-800">{applications.length}</Typography>
                 </div>
                 <div className="w-16 h-16 bg-brand-secondary/10 rounded-2xl flex items-center justify-center text-brand-secondary">
                   <FiUsers className="w-8 h-8" />
                 </div>
               </Stack>
             </CardContent>
           </Card>
        </div>

        <Typography variant="h4" weight="bold" className="mb-6">Your Active Postings</Typography>
        
        {internships.length === 0 ? (
           <div className="p-10 bg-white border border-dashed border-slate-200 rounded-3xl text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <FiBriefcase className="w-8 h-8 text-slate-300" />
             </div>
             <Typography variant="h6" color="muted">You haven't posted any internships yet. Click the button above to create one!</Typography>
           </div>
        ) : (
           <Stack spacing={4}>
              {internships.map(job => {
                 const appCount = applications.filter(a => a.internship_id === job.id).length;
                 return (
                    <Card 
                      key={job.id} 
                      className="group p-2 hover:border-brand hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 cursor-pointer border-slate-100" 
                      onClick={() => router.push(`/dashboard/employer/internships/${job.id}`)}
                    >
                       <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-6">
                          <div>
                             <Typography variant="h4" weight="bold" className="group-hover:text-brand transition-colors mb-2">{job.role}</Typography>
                             <Stack direction="row" spacing={4} align="center">
                                <Badge variant="primary" size="sm">{job.field}</Badge>
                                <Badge variant="slate" size="sm">{job.category}</Badge>
                                {job.deadline && (
                                  <Stack direction="row" spacing={1} align="center" className="text-slate-400">
                                    <FiClock className="w-3.5 h-3.5" />
                                    <Typography variant="caption">{new Date(job.deadline).toLocaleDateString()}</Typography>
                                  </Stack>
                                )}
                             </Stack>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            rightIcon={<FiUsers className="w-4 h-4 ml-1" />}
                            className="bg-white"
                          >
                             Review {appCount} Applicants
                          </Button>
                       </CardContent>
                    </Card>
                 )
              })}
           </Stack>
        )}
      </main>

      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        title="Create New Internship" 
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateInternship} 
              isLoading={creating}
              disabled={!roleTitle || !description || !field || !category || !interestInput}
              className="px-8 shadow-indigo-100"
            >
              Publish Internship
            </Button>
          </>
        }
      >
        <div className="space-y-10">
           <div>
             <Typography variant="body2" weight="bold" className="text-brand uppercase tracking-widest mb-6">Basic Details</Typography>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <Input
                 label="Job Role"
                 placeholder="e.g. Frontend Intern"
                 value={roleTitle}
                 onChange={e => setRoleTitle(e.target.value)}
                 required
               />
               <Select
                 label="Industry / Field"
                 options={FIELD_OPTIONS}
                 value={field}
                 onChange={e => setField(e.target.value)}
                 required
               />
               <Select
                 label="Work Type"
                 options={INTERNSHIP_CATEGORIES}
                 value={category}
                 onChange={e => setCategory(e.target.value)}
                 required
               />
               <Input
                 label="Application Deadline"
                 type="date"
                 value={deadline}
                 onChange={e => setDeadline(e.target.value)}
               />
             </div>
           </div>

           <div>
             <Typography variant="body2" weight="bold" className="text-brand uppercase tracking-widest mb-6">Job Description & Requirements</Typography>
             <Stack spacing={6}>
               <Textarea
                 label="Detailed Job Description"
                 placeholder="Tell applicants about the role..."
                 rows={4}
                 value={description}
                 onChange={e => setDescription(e.target.value)}
                 required
               />
               <Textarea
                 label="Requirements"
                 placeholder="e.g. Must know React, strong communication skills..."
                 rows={4}
                 value={requirements}
                 onChange={e => setRequirements(e.target.value)}
               />
             </Stack>
           </div>

           <div>
             <Typography variant="body2" weight="bold" className="text-brand uppercase tracking-widest mb-6">Tags & External Links</Typography>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <Input
                 label="Related Tags (comma-separated)"
                 placeholder="React, UI Design, Remote"
                 value={interestInput}
                 onChange={e => setInterestInput(e.target.value)}
                 required
               />
               <Input
                 label="External Application Link (Optional)"
                 placeholder="https://company.com/careers"
                 value={recruiterLink}
                 onChange={e => setRecruiterLink(e.target.value)}
               />
             </div>
           </div>
        </div>
      </Modal>
    </div>
  );
}
