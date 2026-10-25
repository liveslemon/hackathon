import { Typography, Card, CardContent } from "@/components/ui";
import {
  FiUsers,
  FiBriefcase,
  FiFileText,
  FiCalendar,
  FiUserPlus,
  FiActivity,
} from "react-icons/fi";
import { authenticatedFetchServer } from "@/lib/api-server";

interface Stats {
  total_students: number;
  total_employers: number;
  total_internships: number;
  total_applications: number;
  applications_today: number;
  new_users_today: number;
}

const metricCards = [
  {
    key: "total_students" as keyof Stats,
    label: "Total Students",
    icon: <FiUsers className="w-8 h-8" />,
    color: "text-brand",
    bg: "bg-surface",
    border: "border-border",
    accent: "bg-brand",
  },
  {
    key: "total_employers" as keyof Stats,
    label: "Total Employers",
    icon: <FiBriefcase className="w-8 h-8" />,
    color: "text-brand-secondary",
    bg: "bg-surface",
    border: "border-border",
    accent: "bg-brand-secondary",
  },
  {
    key: "total_internships" as keyof Stats,
    label: "Internships Posted",
    icon: <FiActivity className="w-8 h-8" />,
    color: "text-danger-fg",
    bg: "bg-surface",
    border: "border-border",
    accent: "bg-danger",
  },
  {
    key: "total_applications" as keyof Stats,
    label: "Total Applications",
    icon: <FiFileText className="w-8 h-8" />,
    color: "text-info-fg",
    bg: "bg-surface",
    border: "border-border",
    accent: "bg-info",
  },
  {
    key: "applications_today" as keyof Stats,
    label: "Applications Today",
    icon: <FiCalendar className="w-8 h-8" />,
    color: "text-success-fg",
    bg: "bg-surface",
    border: "border-border",
    accent: "bg-success",
  },
  {
    key: "new_users_today" as keyof Stats,
    label: "New Users Today",
    icon: <FiUserPlus className="w-8 h-8" />,
    color: "text-warning-fg",
    bg: "bg-surface",
    border: "border-border",
    accent: "bg-warning",
  },
];

export default async function OverviewView() {
  let stats: Stats | null = null;
  let error: string | null = null;

  try {
    stats = await authenticatedFetchServer<Stats>("/admin/stats");
  } catch (err: unknown) {
    error =
      err instanceof Error
        ? err.message
        : "Something went wrong fetching stats";
  }

  if (error) {
    return (
      <div
        role="alert"
        className="bg-danger-subtle text-danger-fg p-6 rounded-3xl border border-danger-subtle mb-8"
      >
        <Typography variant="body1" weight="bold">
          {error}
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <Typography variant="h3" weight="bold">
          Platform Overview
        </Typography>
        <div className="px-4 py-2 bg-surface rounded-2xl border border-border shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <Typography variant="caption" weight="bold" color="muted">
            Live Dashboard
          </Typography>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricCards.map((card, index) => (
          <div
            key={card.key}
            className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both h-full"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Card className="group h-full transition-all duration-300 hover:shadow-xl border-border bg-surface overflow-hidden">
              <CardContent className="p-8 h-full relative">
                {/* Decorative accent */}
                <div
                  className={`absolute top-0 right-0 w-32 h-32 ${card.accent} opacity-5 rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500`}
                />

                <div className="relative z-10 space-y-6">
                  <div
                    className={`w-14 h-14 ${card.accent} text-fg-inverse rounded-2xl flex items-center justify-center shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-300`}
                  >
                    {card.icon}
                  </div>

                  <div className="space-y-1">
                    <Typography
                      variant="h1"
                      weight="extrabold"
                      className="text-fg tracking-tight"
                    >
                      {stats?.[card.key]?.toLocaleString() ?? 0}
                    </Typography>
                    <Typography
                      variant="body2"
                      weight="bold"
                      color="muted"
                      className="uppercase tracking-widest text-[10px]"
                    >
                      {card.label}
                    </Typography>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
