"use client";

import { useState } from "react";
import {
  Typography,
  Stack,
  Button,
  Input,
  Textarea,
  Badge,
} from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { FiPlus, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

const CATEGORIES = [
  "Technology",
  "Finance",
  "Consulting",
  "Healthcare",
  "Design",
  "Marketing",
];

const INTERESTS_OPTIONS = [
  "Software Development",
  "Data Science",
  "Engineering",
  "Business",
  "Consulting",
  "Finance",
  "Design",
  "Marketing",
  "Research",
  "Healthcare",
  "UX/UI",
  "Product Management",
  "Analytics",
  "Machine Learning",
];

export default function PostInternshipView() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [field, setField] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | null }>({
    message: "",
    type: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handlePostInternship = async () => {
    if (
      !company ||
      !role ||
      !field ||
      !category ||
      !description ||
      !requirements ||
      !deadline ||
      interests.length === 0
    ) {
      setNotification({
        message: "Please fill all required fields and select interests.",
        type: "error",
      });
      setTimeout(() => setNotification({ message: "", type: null }), 4000);
      return;
    }

    setIsLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user ?? null;

      let posterId: string | null = null;
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_admin", true)
        .maybeSingle();

      posterId = adminProfile?.id ?? user?.id ?? null;

      const payload = {
        poster_id: posterId,
        company,
        role,
        field,
        category,
        description,
        requirements,
        interests,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        recruiter_link: linkedin || null,
      };

      const { error } = await supabase.from("internships").insert([payload]);

      if (error) throw error;

      setNotification({
        message: "Internship posted successfully!",
        type: "success",
      });
      setTimeout(() => setNotification({ message: "", type: null }), 4000);

      // Clear form
      setCompany("");
      setRole("");
      setField("");
      setCategory("");
      setDescription("");
      setRequirements("");
      setInterests([]);
      setDeadline("");
      setLinkedin("");
    } catch (error: any) {
      console.error("Post internship error:", error);
      setNotification({
        message: error?.message ?? "Failed to post internship. Try again.",
        type: "error",
      });
      setTimeout(() => setNotification({ message: "", type: null }), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-[32px] p-8 md:p-12 border border-slate-100 shadow-xl shadow-indigo-50/50 space-y-10 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Typography variant="h2" weight="bold">Post New Internship</Typography>
            <Typography variant="body1" color="muted">Fill in the details to reach more candidates</Typography>
          </div>
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shadow-inner">
            <FiPlus className="w-8 h-8" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <Input
            label="Company Name"
            placeholder="Enter company name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            className="bg-slate-50 border-transparent focus:bg-white"
          />
          <Input
            label="Role Title"
            placeholder="e.g. Software Engineer Intern"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="bg-slate-50 border-transparent focus:bg-white"
          />
          <Input
            label="Field"
            placeholder="e.g. Engineering"
            value={field}
            onChange={(e) => setField(e.target.value)}
            required
            className="bg-slate-50 border-transparent focus:bg-white"
          />
          <div className="space-y-1.5 ml-1">
            <label className="block text-sm font-semibold text-slate-700">Category *</label>
            <select
              className="w-full py-2.5 px-4 rounded-xl border border-transparent bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select Category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-8 relative z-10">
          <Textarea
            label="Description"
            placeholder="Detailed job description..."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="bg-slate-50 border-transparent focus:bg-white"
          />
          <Textarea
            label="Requirements (One per line)"
            placeholder="Enter job requirements..."
            rows={4}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            required
            className="bg-slate-50 border-transparent focus:bg-white"
          />
        </div>

        <div className="space-y-6 relative z-10">
          <div className="space-y-2">
            <Typography variant="body2" weight="bold" className="ml-1 text-[#667eea]">Related Interests * (Select at least one)</Typography>
            <div className="flex flex-wrap gap-2.5">
              {INTERESTS_OPTIONS.map((option) => {
                const isSelected = interests.includes(option);
                return (
                  <button
                    key={option}
                    onClick={() => toggleInterest(option)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border ${
                      isSelected
                        ? "bg-[#667eea] text-white border-[#667eea] shadow-lg shadow-indigo-100 scale-105"
                        : "bg-white text-slate-500 border-slate-100 hover:border-indigo-200 hover:text-indigo-500"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <Input
            label="Application Deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
            className="bg-slate-50 border-transparent focus:bg-white"
          />
          <Input
            label="LinkedIn URL (Optional)"
            placeholder="https://linkedin.com/jobs/..."
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            className="bg-slate-50 border-transparent focus:bg-white"
          />
        </div>

        <div className="pt-6 relative z-10">
          <Button
            onClick={handlePostInternship}
            isLoading={isLoading}
            className="w-full h-14 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 text-lg font-bold"
          >
            Publish Internship Post
          </Button>
        </div>
      </div>

      {notification.type && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300 flex items-center gap-4 z-[100] border ${
          notification.type === "success" 
            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
            : "bg-red-50 text-red-700 border-red-100"
        }`}>
          {notification.type === "success" ? <FiCheckCircle className="w-6 h-6" /> : <FiAlertCircle className="w-6 h-6" />}
          <Typography variant="body1" weight="bold">{notification.message}</Typography>
        </div>
      )}
    </div>
  );
}
