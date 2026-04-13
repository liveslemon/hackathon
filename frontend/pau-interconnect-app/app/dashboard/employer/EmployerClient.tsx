"use client";
import React, { useState } from "react";
import { FiPlus } from "react-icons/fi";
import { Button, Modal, Input, Select, Textarea, Stack, Typography } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";

export function PostInternshipButton({ employerProfile }: { employerProfile: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    role: "",
    field: "",
    category: "",
    description: "",
    requirements: "",
    tags: "",
    deadline: "",
    link: ""
  });

  const categories = [
    { value: "Remote", label: "Remote" },
    { value: "Hybrid", label: "Hybrid" },
    { value: "On-site", label: "On-site" }
  ];

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { error } = await supabase.from("internships").insert([{
        employer_id: employerProfile.id,
        company: employerProfile.company_name,
        role: formData.role,
        field: formData.field,
        category: formData.category,
        description: formData.description,
        requirements: formData.requirements,
        interests: formData.tags.split(",").map(i => i.trim()),
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        recruiter_link: formData.link || null
      }]);
      if (error) throw error;
      setIsOpen(false);
      window.location.reload(); // Refresh to show new internship in streamed list
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        leftIcon={<FiPlus className="w-5 h-5" />}
        className="shadow-lg shadow-indigo-100"
      >
        Post Internship
      </Button>

      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title="Create New Internship" 
        size="lg"
        footer={<><Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button> <Button onClick={handleCreate} isLoading={creating}>Publish</Button></>}
      >
        <Stack spacing={6}>
          <Input label="Job Role" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} placeholder="e.g. UX Intern" />
          <Select label="Category" options={categories} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
          <Textarea label="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} />
          <Input label="Tags (comma separated)" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="React, Figma" />
        </Stack>
      </Modal>
    </>
  );
}
