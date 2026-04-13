"use client";

import React, { useState } from "react";
import { 
  FiSend, 
  FiClock, 
  FiCheckCircle, 
  FiX, 
  FiZap 
} from "react-icons/fi";
import { 
  Button, 
  Modal, 
  Typography, 
  Stack, 
  Textarea,
} from "@/components/ui";
import { cx } from "@/utils/cx";
import { authenticatedFetch } from "@/lib/api";

interface InternshipClientPartsProps {
  internship: any;
  hasApplied: boolean;
  applicationStatus: string | null;
  matchingSkills: string[];
  missingSkills: string[];
  userId: string;
  studentEmail?: string;
}

export default function InternshipClientParts({
  internship,
  hasApplied: initialHasApplied,
  applicationStatus,
  matchingSkills,
  missingSkills,
  userId,
  studentEmail,
}: InternshipClientPartsProps) {
  const [hasApplied, setHasApplied] = useState(initialHasApplied);
  const [isApplyModalOpen, setApplyModalOpen] = useState(false);
  const [isCvReviewModalOpen, setCvReviewModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isReviewing] = useState(false);

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      await authenticatedFetch("/submit-application", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          internship_id: internship.id,
          cover_letter: coverLetter,
          student_email: studentEmail,
        })
      });

      setHasApplied(true);
      setApplyModalOpen(false);
      alert("Application submitted successfully! The employer has been notified.");
    } catch (error: any) {
      console.error("Application error:", error);
      alert(error?.message || "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDraftCoverLetter = async () => {
    setIsDrafting(true);
    try {
      const data = await authenticatedFetch("/draft-cover-letter", {
        method: "POST",
        body: JSON.stringify({ 
          user_id: userId, 
          internship_id: internship.id,
          existing_letter: coverLetter 
        }),
      });
      
      if (data.cover_letter) {
        setCoverLetter(data.cover_letter);
      }
    } catch (error: any) {
      console.error("Drafting error:", error);
      alert(error.message || "An error occurred while drafting the cover letter.");
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <Button
          size="lg"
          onClick={() => setApplyModalOpen(true)}
          disabled={hasApplied}
          leftIcon={hasApplied ? (
            applicationStatus?.toLowerCase() === 'accepted' ? <FiCheckCircle /> :
            applicationStatus?.toLowerCase() === 'rejected' ? <FiX /> : <FiClock />
          ) : <FiSend />}
          className={cx(
            "w-full", 
            hasApplied && applicationStatus?.toLowerCase() === 'accepted' ? "bg-emerald-500 text-white" :
            hasApplied && applicationStatus?.toLowerCase() === 'rejected' ? "bg-rose-500 text-white" :
            hasApplied ? "bg-indigo-500 text-white" : ""
          )}
        >
          {hasApplied ? (
            applicationStatus?.toLowerCase() === 'accepted' ? "Application Approved" :
            applicationStatus?.toLowerCase() === 'rejected' ? "Application Denied" : "Application Pending"
          ) : "Apply Now"}
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          leftIcon={<FiZap className="text-amber-500" />}
          onClick={() => setCvReviewModalOpen(true)}
          className="w-full border-amber-100 hover:border-amber-200 hover:bg-amber-50"
        >
          AI CV Review
        </Button>
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => !isSubmitting && setApplyModalOpen(false)}
        title="Quick Application"
        size="md"
        footer={
          <Stack direction="row" spacing={3} className="w-full">
            <Button 
              variant="outline" 
              leftIcon={<FiZap className="text-indigo-500" />}
              onClick={handleDraftCoverLetter} 
              disabled={isDrafting || isSubmitting}
              className="flex-1"
            >
              {isDrafting 
                ? (coverLetter.trim() ? "Enhancing..." : "Drafting...") 
                : (coverLetter.trim() ? "✨ Enhance with AI" : "⚡ Draft with AI")
              }
            </Button>
            <Button 
              onClick={handleApply} 
              disabled={isSubmitting || isDrafting} 
              isLoading={isSubmitting}
              rightIcon={<FiSend />}
              className="flex-1"
            >
              Submit Application
            </Button>
          </Stack>
        }
      >
        <div className="space-y-6">
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
            <Typography variant="body2" weight="bold" color="primary" className="mb-2">WHY YOU'RE A FIT</Typography>
            <Typography variant="body1" className="text-slate-700">
              Share a brief cover letter or statement about why you're interested in {internship.company}.
            </Typography>
          </div>
          
          <Textarea
            label="Cover Letter"
            placeholder="Tell us about yourself and why you're perfect for this role..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            disabled={isSubmitting}
            rows={6}
          />
        </div>
      </Modal>

      {/* AI Review Modal */}
      <Modal
        isOpen={isCvReviewModalOpen}
        onClose={() => !isReviewing && setCvReviewModalOpen(false)}
        title="AI Keyword Analysis"
        size="md"
      >
        <div className="space-y-8">
          <Typography variant="body1" color="muted">
            I've compared your profile keywords with the requirements for this {internship.role || "position"}.
          </Typography>

          <div className="space-y-6">
            {matchingSkills.length > 0 && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[32px] space-y-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <FiCheckCircle size={20} />
                  <Typography variant="h4" weight="bold">Matched Strengths</Typography>
                </div>
                <div className="flex flex-wrap gap-2">
                  {matchingSkills.map((skill, index) => (
                    <div key={index} className="px-4 py-1.5 bg-emerald-500/10 text-emerald-700 rounded-xl font-bold text-sm">
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missingSkills.length > 0 && (
              <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-[32px] space-y-4">
                <div className="flex items-center gap-2 text-amber-600">
                  <FiAlertTriangle size={20} />
                  <Typography variant="h4" weight="bold">Missing Keywords</Typography>
                </div>
                <Typography variant="body1" className="text-amber-900/70 leading-relaxed">
                  Recruiters for this role are looking for <strong>{missingSkills.join(", ")}</strong>. 
                  Consider highlighting these in your profile or CV if you have the experience.
                </Typography>
              </div>
            )}
            
            {matchingSkills.length === 0 && missingSkills.length === 0 && (
              <div className="bg-slate-50 border border-slate-100 p-8 rounded-[32px] text-center">
                <Typography variant="body1" color="muted">
                  Resume data is still processing or unavailable for this listing.
                </Typography>
              </div>
            )}

            <Button onClick={() => setCvReviewModalOpen(false)} variant="solid" className="mt-4 w-full">
              Got it, Thanks!
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Minimal icon imports for internal components
function FiAlertTriangle({ size }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
}
