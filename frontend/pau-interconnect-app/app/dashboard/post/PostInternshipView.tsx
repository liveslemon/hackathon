"use client";

import { useState } from "react";
import {
  Typography,
  Stack,
  Button,
  Input,
  Textarea,
  Select,
  Badge,
} from "@/components/ui";
import { FiBriefcase, FiPlus, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";

const categories = [
  { value: "Technology", label: "Technology" },
  { value: "Finance", label: "Finance" },
  { value: "Consulting", label: "Consulting" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Design", label: "Design" },
  { value: "Marketing", label: "Marketing" }
];

const interestsOptions = [
  "Software Development", "Data Science", "Engineering", "Business",
  "Consulting", "Finance", "Design", "Marketing",
  "Research", "Healthcare", "UX/UI", "Product Management",
  "Analytics", "Machine Learning"
];

export default function PostInternshipView() {
  const [formData, setFormData] = useState({
    company: "",
    role: "",
    field: "",
    category: "",
    description: "",
    requirements: "",
    linkedin_url: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const toggleInterest = (item: string) => {
    setInterests(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const handlePost = async () => {
    setLoading(true);
    setStatus(null);
    
    try {
      const { error } = await supabase.from("internships").insert([
        {
          ...formData,
          interests,
          deadline,
          created_at: new Error().stack, // Just as a placeholder for current time if needed
        }
      ]);

      if (error) throw error;
      
      setStatus({ type: 'success', message: "Internship posted successfully!" });
      // Clear form
      setFormData({
        company: "",
        role: "",
        field: "",
        category: "",
        description: "",
        requirements: "",
        linkedin_url: "",
      });
      setInterests([]);
      setDeadline("");
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || "Failed to post internship" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="bg-white rounded-[32px] shadow-2xl shadow-indigo-50/50 border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-white px-10 py-8 border-b border-slate-100 flex items-center justify-between">
          <Stack direction="row" align="center" spacing={4}>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <FiBriefcase className="w-6 h-6" />
            </div>
            <div>
              <Typography variant="h3" weight="bold">Post New Internship</Typography>
              <Typography variant="body2" color="muted">Fill in the details to reach top students</Typography>
            </div>
          </Stack>
        </div>

        <div className="p-10 space-y-10">
          {status && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              {status.type === 'success' ? <FiCheckCircle className="w-5 h-5" /> : <FiAlertCircle className="w-5 h-5" />}
              <Typography variant="body2" weight="bold">{status.message}</Typography>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input
              label="Company Name"
              placeholder="e.g. Google"
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              required
            />
            <Input
              label="Role Title"
              placeholder="e.g. Software Engineer Intern"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              required
            />
            <Input
              label="Field of Study"
              placeholder="e.g. Computer Science"
              value={formData.field}
              onChange={(e) => setFormData({...formData, field: e.target.value})}
              required
            />
            <Select
              label="Industry Category"
              options={categories}
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              placeholder="Select category"
              required
            />
          </div>

          <Textarea
            label="Job Description"
            placeholder="Describe the role, responsibilities, and team..."
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={4}
            required
          />

          <Textarea
            label="Requirements"
            placeholder="List key qualifications, skills, and tools (one per line)..."
            value={formData.requirements}
            onChange={(e) => setFormData({...formData, requirements: e.target.value})}
            rows={4}
            required
          />

          <div className="space-y-4">
            <Typography variant="body2" weight="bold" className="text-slate-700 ml-1">Related Interests</Typography>
            <div className="flex flex-wrap gap-2">
              {interestsOptions.map(option => (
                <button
                  key={option}
                  onClick={() => toggleInterest(option)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    interests.includes(option)
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-600 ring-offset-2'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-2">
              <Typography variant="body2" weight="bold" className="text-slate-700 ml-1">Application Deadline</Typography>
              <input
                type="date"
                className="w-full h-[52px] px-4 rounded-xl border border-slate-100 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <Input
              label="Recruiter LinkedIn URL"
              placeholder="https://linkedin.com/in/..."
              value={formData.linkedin_url}
              onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
            />
          </div>

          <Button
            className="w-full py-4 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-100"
            size="lg"
            isLoading={loading}
            onClick={handlePost}
            leftIcon={<FiPlus className="w-6 h-6" />}
          >
            Post Internship Position
          </Button>
        </div>
      </div>
    </div>
  );
}