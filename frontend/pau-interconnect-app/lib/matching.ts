import { SupabaseClient } from "@supabase/supabase-js";

export type MatchState = "scored" | "pending" | "unavailable";

export interface MatchScoreData {
  state: MatchState;
  score: number | null;
  breakdown?: {
    structured_overlap?: number;
    semantic_similarity?: number;
    keyword_boost?: number;
    weights?: Record<string, number>;
  } | null;
  instantReasoning?: string | null;
  aiReasoning?: string | null;
  isAi?: boolean;
  matchingSkills?: string[];
  missingSkills?: string[];
  lastComputedAt?: string | null;
}

export type MatchScoresMap = Record<string, MatchScoreData>;

/**
 * Fetch canonical match scores for a user across a list of internship IDs.
 * Correctly distinguishes:
 * - "scored": canonical score exists in match_results
 * - "pending": rescore / analysis job currently queued or processing
 * - "unavailable": no score yet and no active job (prompt to upload CV / complete profile)
 * NEVER returns 0% for "unscored".
 */
export async function getMatchScores(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  internshipIds: string[],
): Promise<MatchScoresMap> {
  const result: MatchScoresMap = {};
  if (!internshipIds || internshipIds.length === 0) {
    return result;
  }

  // If no user is logged in, all internships are unavailable
  if (!userId) {
    for (const id of internshipIds) {
      result[id] = {
        state: "unavailable",
        score: null,
      };
    }
    return result;
  }

  try {
    // 1. Fetch match_results
    const { data: matchRows, error: matchError } = await supabase
      .from("match_results")
      .select(
        "internship_id, match_score, score_breakdown, instant_reasoning, ai_reasoning, ai_reasoning_hash, inputs_hash, matching_skills, missing_skills, last_computed_at",
      )
      .eq("user_id", userId)
      .in("internship_id", internshipIds);

    if (matchError) {
      console.error("Error fetching match_results:", matchError);
    }

    const matchesById = new Map<string, NonNullable<typeof matchRows>[number]>();
    if (matchRows) {
      for (const row of matchRows) {
        matchesById.set(row.internship_id, row);
      }
    }

    // 2. Check if a job is currently pending or processing for this user
    let isPending = false;
    const { data: activeJobs } = await supabase
      .from("cv_processing_jobs")
      .select("id, kind, status")
      .or(`user_id.eq.${userId},subject.eq.${userId}`)
      .in("status", ["pending", "processing"])
      .limit(1);

    if (activeJobs && activeJobs.length > 0) {
      isPending = true;
    }

    // 3. Assemble results for each requested internship
    for (const id of internshipIds) {
      const match = matchesById.get(id);
      if (match && typeof match.match_score === "number") {
        // AI reasoning is considered fresh if ai_reasoning is present and hashes match (or if no separate hash is required)
        const isAiFresh =
          Boolean(match.ai_reasoning) &&
          (!match.inputs_hash || !match.ai_reasoning_hash || match.inputs_hash === match.ai_reasoning_hash);

        result[id] = {
          state: "scored",
          score: Math.round(match.match_score),
          breakdown: match.score_breakdown || null,
          instantReasoning: match.instant_reasoning || null,
          aiReasoning: isAiFresh ? match.ai_reasoning : null,
          isAi: isAiFresh,
          matchingSkills: match.matching_skills || [],
          missingSkills: match.missing_skills || [],
          lastComputedAt: match.last_computed_at || null,
        };
      } else if (isPending) {
        result[id] = {
          state: "pending",
          score: null,
        };
      } else {
        result[id] = {
          state: "unavailable",
          score: null,
        };
      }
    }
  } catch (err) {
    console.error("Error in getMatchScores:", err);
    for (const id of internshipIds) {
      if (!result[id]) {
        result[id] = {
          state: "unavailable",
          score: null,
        };
      }
    }
  }

  return result;
}

/**
 * Returns the color scheme for a given score (0-100).
 */
export function getScoreColorBadge(score: number): {
  bg: string;
  text: string;
  border: string;
  ring: string;
  label: string;
} {
  if (score >= 80) {
    return {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800",
      ring: "ring-emerald-500",
      label: "Strong match",
    };
  }
  if (score >= 60) {
    return {
      bg: "bg-blue-50 dark:bg-blue-950/40",
      text: "text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800",
      ring: "ring-blue-500",
      label: "Good match",
    };
  }
  if (score >= 40) {
    return {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-700 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
      ring: "ring-amber-500",
      label: "Moderate match",
    };
  }
  return {
    bg: "bg-stone-50 dark:bg-stone-900/40",
    text: "text-stone-600 dark:text-stone-400",
    border: "border-stone-200 dark:border-stone-800",
    ring: "ring-stone-400",
    label: "Low match",
  };
}
