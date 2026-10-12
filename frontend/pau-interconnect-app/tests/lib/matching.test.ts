import { describe, expect, it, vi } from "vitest";
import { getMatchScores, getScoreColorBadge } from "@/lib/matching";

describe("getScoreColorBadge", () => {
  it("classifies scores >= 80 as Strong match with emerald badge", () => {
    const badge = getScoreColorBadge(85);
    expect(badge.label).toBe("Strong match");
    expect(badge.text).toContain("emerald");
  });

  it("classifies scores between 60 and 79 as Good match with blue badge", () => {
    const badge = getScoreColorBadge(72);
    expect(badge.label).toBe("Good match");
    expect(badge.text).toContain("blue");
  });

  it("classifies scores between 40 and 59 as Moderate match with amber badge", () => {
    const badge = getScoreColorBadge(45);
    expect(badge.label).toBe("Moderate match");
    expect(badge.text).toContain("amber");
  });

  it("classifies scores < 40 as Low match with stone badge", () => {
    const badge = getScoreColorBadge(25);
    expect(badge.label).toBe("Low match");
    expect(badge.text).toContain("stone");
  });
});

describe("getMatchScores", () => {
  it("returns empty object when internshipIds is empty", async () => {
    const mockSupabase = {} as any;
    const res = await getMatchScores(mockSupabase, "user-1", []);
    expect(res).toEqual({});
  });

  it("returns unavailable state with null score when userId is null/undefined", async () => {
    const mockSupabase = {} as any;
    const res = await getMatchScores(mockSupabase, null, ["job-1", "job-2"]);
    expect(res["job-1"]).toEqual({ state: "unavailable", score: null });
    expect(res["job-2"]).toEqual({ state: "unavailable", score: null });
    // Must never return 0% for unscored
    expect(res["job-1"].score).not.toBe(0);
  });

  it("returns scored state with canonical rounded score and instant reasoning", async () => {
    const mockMatchRows = [
      {
        internship_id: "job-1",
        match_score: 84.7,
        score_breakdown: { structured_overlap: 80, semantic_similarity: 90, keyword_boost: 85 },
        instant_reasoning: "85% match. You have 4 of 5 required skills.",
        ai_reasoning: "Polished AI paragraph for strong match.",
        inputs_hash: "hash-abc",
        ai_reasoning_hash: "hash-abc",
        matching_skills: ["Python", "SQL"],
        missing_skills: ["AWS"],
        last_computed_at: "2026-10-12T12:00:00Z",
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "match_results") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: mockMatchRows, error: null }),
              }),
            }),
          };
        }
        if (table === "cv_processing_jobs") {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as any;

    const res = await getMatchScores(mockSupabase, "user-1", ["job-1"]);
    const scoreData = res["job-1"];
    expect(scoreData.state).toBe("scored");
    expect(scoreData.score).toBe(85);
    expect(scoreData.instantReasoning).toContain("85% match");
    expect(scoreData.aiReasoning).toBe("Polished AI paragraph for strong match.");
    expect(scoreData.isAi).toBe(true);
    expect(scoreData.matchingSkills).toEqual(["Python", "SQL"]);
    expect(scoreData.missingSkills).toEqual(["AWS"]);
  });

  it("invalidates stale AI reasoning when inputs_hash does not match ai_reasoning_hash", async () => {
    const mockMatchRows = [
      {
        internship_id: "job-1",
        match_score: 82.0,
        score_breakdown: {},
        instant_reasoning: "82% match. Fresh instant explanation.",
        ai_reasoning: "Old stale AI explanation from previous profile version.",
        inputs_hash: "new-hash-xyz",
        ai_reasoning_hash: "old-hash-abc",
        matching_skills: ["Python"],
        missing_skills: [],
      },
    ];

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "match_results") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: mockMatchRows, error: null }),
              }),
            }),
          };
        }
        if (table === "cv_processing_jobs") {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as any;

    const res = await getMatchScores(mockSupabase, "user-1", ["job-1"]);
    const scoreData = res["job-1"];
    expect(scoreData.state).toBe("scored");
    expect(scoreData.instantReasoning).toBe("82% match. Fresh instant explanation.");
    // Stale AI must be null and isAi must be false so the UI shows instant reasoning
    expect(scoreData.aiReasoning).toBeNull();
    expect(scoreData.isAi).toBe(false);
  });

  it("returns pending state when job is processing in cv_processing_jobs", async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "match_results") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "cv_processing_jobs") {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: "job-q-1", kind: "USER_RESCORE", status: "processing" }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as any;

    const res = await getMatchScores(mockSupabase, "user-1", ["job-1"]);
    expect(res["job-1"]).toEqual({
      state: "pending",
      score: null,
    });
  });

  it("returns unavailable state when no score and no job is running", async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "match_results") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "cv_processing_jobs") {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as any;

    const res = await getMatchScores(mockSupabase, "user-1", ["job-1"]);
    expect(res["job-1"]).toEqual({
      state: "unavailable",
      score: null,
    });
  });
});
