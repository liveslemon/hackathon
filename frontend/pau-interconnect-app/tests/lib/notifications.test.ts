import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createNotification,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  isNotificationOptedOut,
} from "@/lib/notifications";

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockMaybeSingle = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: "notif-1" }, error: null }),
    }),
  });
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });
});

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServer: vi.fn().mockImplementation(() => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: mockInsert,
          update: mockUpdate,
          select: (_fields: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count === "exact") {
              return {
                eq: () => ({
                  eq: vi.fn().mockResolvedValue({ count: 4, error: null }),
                }),
              };
            }
            return {
              eq: () => ({
                order: () => ({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            };
          },
        };
      }
      return {};
    },
  })),
}));

describe("notifications lib", () => {
  it("rejects invalid notification input", async () => {
    const res = await createNotification({
      userId: "",
      type: "application_update",
      title: "Title",
    });
    expect(res.success).toBe(false);
    expect(res.reason).toContain("Missing required");
  });

  it("skips notification when user opted out in modern settings", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        settings: {
          notifications: {
            application_updates: false,
          },
        },
      },
    });

    const isOptedOut = await isNotificationOptedOut("user-1", "application_update");
    expect(isOptedOut).toBe(true);

    const res = await createNotification({
      userId: "user-1",
      type: "application_update",
      title: "Application Status Update",
    });

    expect(res.success).toBe(true);
    expect(res.skipped).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("skips notification when user opted out in legacy preferences", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        notification_preferences: {
          email_new_applicant: false,
        },
      },
    });

    const isOptedOut = await isNotificationOptedOut("user-2", "new_application");
    expect(isOptedOut).toBe(true);

    const res = await createNotification({
      userId: "user-2",
      type: "new_application",
      title: "New Candidate",
    });

    expect(res.success).toBe(true);
    expect(res.skipped).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("creates notification successfully when user has not opted out", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        settings: {
          notifications: {
            application_updates: true,
          },
        },
      },
    });

    const res = await createNotification({
      userId: "user-3",
      type: "application_update",
      title: "Interview Scheduled",
      body: "You have an interview tomorrow.",
      link: "/my-internships",
    });

    expect(res.success).toBe(true);
    expect(res.id).toBe("notif-1");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-3",
        type: "application_update",
        title: "Interview Scheduled",
      }),
    );
  });

  it("marks notification as read", async () => {
    const res = await markAsRead("notif-1", "user-3");
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
  });

  it("marks all notifications as read for a user", async () => {
    const res = await markAllAsRead("user-3");
    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
  });

  it("fetches unread notification count", async () => {
    const count = await getUnreadCount("user-3");
    expect(count).toBe(4);
  });
});
