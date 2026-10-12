import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock @/lib/supabase-server
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServer: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// Mock email helper to avoid external calls
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ status: "sent" })),
}));

// Mock email templates
vi.mock("@/lib/email-templates", () => ({
  applicationStatusEmail: vi.fn(() => ({ subject: "Status", text: "Text", html: "<p>Text</p>" })),
}));

// Mock background jobs/audit
vi.mock("@/lib/audit", () => ({
  logDecision: vi.fn(async () => {}),
}));

// Import route handlers
import { POST as postInternship } from "@/app/api/internships/post/route";
import { PATCH as updateInternship } from "@/app/api/internships/[id]/route";
import { PATCH as updateInternshipStatus } from "@/app/api/internships/[id]/status/route";
import { PATCH as updateApplicationStage } from "@/app/api/applications/[id]/stage/route";
import { POST as startConversation } from "@/app/api/messages/start/route";
import { POST as sendMessage } from "@/app/api/messages/[conversationId]/route";

describe("Route Handlers - Internships Posting & Editing Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/internships/post returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const req = new Request("http://localhost/api/internships/post", {
      method: "POST",
      body: JSON.stringify({ role: "Software Intern" }),
    });

    const res = await postInternship(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("POST /api/internships/post returns 403 when user is not an employer", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "student-123" } } });
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { role: "student" }, error: null }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/internships/post", {
      method: "POST",
      body: JSON.stringify({
        role: "Software Intern",
        field: "Engineering",
        category: "Remote",
        description: "A great internship opportunity with modern tech stack.",
        requirements: "TypeScript, React, Git skills.",
      }),
    });

    const res = await postInternship(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Forbidden");
  });

  it("PATCH /api/internships/[id] prevents cross-employer update (returns 403)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "employer-attacker" } } });

    // Existing internship belongs to employer-victim
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: "job-1", employer_id: "employer-victim", poster_id: "employer-victim" },
            error: null,
          }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/internships/job-1", {
      method: "PATCH",
      body: JSON.stringify({ role: "Hacked Role" }),
    });

    const res = await updateInternship(req, { params: Promise.resolve({ id: "job-1" }) });
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Forbidden");
  });

  it("PATCH /api/internships/[id]/status prevents cross-employer status changes", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "employer-attacker" } } });

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: "job-1", employer_id: "employer-victim", status: "active" },
            error: null,
          }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/internships/job-1/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "closed" }),
    });

    const res = await updateInternshipStatus(req, { params: Promise.resolve({ id: "job-1" }) });
    expect(res.status).toBe(403);
  });
});

describe("Route Handlers - Application Stage Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH /api/applications/[id]/stage returns 404 if application not found", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "emp-1" } } });
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/applications/app-999/stage", {
      method: "PATCH",
      body: JSON.stringify({ stage: "interview" }),
    });

    const res = await updateApplicationStage(req, { params: Promise.resolve({ id: "app-999" }) });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/applications/[id]/stage returns 403 if user is not the owning employer", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "other-employer" } } });
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              id: "app-1",
              stage: "applied",
              user_id: "student-1",
              internships: { employer_id: "owner-employer", role: "Dev" },
            },
            error: null,
          }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/applications/app-1/stage", {
      method: "PATCH",
      body: JSON.stringify({ stage: "interview" }),
    });

    const res = await updateApplicationStage(req, { params: Promise.resolve({ id: "app-1" }) });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/applications/[id]/stage blocks illegal transitions from accepted stage", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "owner-employer" } } });
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              id: "app-1",
              stage: "accepted", // Terminal state
              user_id: "student-1",
              internships: { employer_id: "owner-employer", role: "Dev" },
            },
            error: null,
          }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/applications/app-1/stage", {
      method: "PATCH",
      body: JSON.stringify({ stage: "interview" }),
    });

    const res = await updateApplicationStage(req, { params: Promise.resolve({ id: "app-1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Cannot transition");
  });
});

describe("Route Handlers - Messaging Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/messages/start returns 403 if caller is not the employer for application", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "attacker-user" } } });
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              user_id: "student-1",
              internships: { employer_id: "real-employer" },
            },
            error: null,
          }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/messages/start", {
      method: "POST",
      body: JSON.stringify({
        application_id: "app-1",
        message: "Hello candidate",
      }),
    });

    const res = await startConversation(req);
    expect(res.status).toBe(403);
  });

  it("POST /api/messages/[conversationId] returns 403 if user is not a participant", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "third-party-user" } } });
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              employer_id: "real-employer",
              student_id: "student-1",
            },
            error: null,
          }),
        }),
      }),
    });

    const req = new Request("http://localhost/api/messages/convo-1", {
      method: "POST",
      body: JSON.stringify({ content: "Sneaky message" }),
    });

    const res = await sendMessage(req, { params: Promise.resolve({ conversationId: "convo-1" }) });
    expect(res.status).toBe(403);
  });
});
