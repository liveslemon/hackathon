import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { 
  Typography, 
  Card, 
  CardContent 
} from "@/components/ui";
import { FiUsers, FiBriefcase, FiFileText, FiCalendar, FiUserPlus, FiActivity } from "react-icons/fi";
import crossFetch from "cross-fetch";

async function getAdminSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: crossFetch },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {}
      },
    }
  );
}

const metricCards = [
  { key: "total_students", label: "Total Students", icon: <FiUsers className="w-8 h-8" />, accent: "bg-blue-500", bg: "bg-blue-50/50" },
  { key: "total_employers", label: "Total Employers", icon: <FiBriefcase className="w-8 h-8" />, accent: "bg-purple-500", bg: "bg-purple-50/50" },
  { key: "total_internships", label: "Internships Posted", icon: <FiActivity className="w-8 h-8" />, accent: "bg-rose-500", bg: "bg-rose-50/50" },
  { key: "total_applications", label: "Total Applications", icon: <FiFileText className="w-8 h-8" />, accent: "bg-cyan-500", bg: "bg-cyan-50/50" },
  { key: "applications_today", label: "Applications Today", icon: <FiCalendar className="w-8 h-8" />, accent: "bg-emerald-500", bg: "bg-emerald-50/50" },
  { key: "new_users_today", label: "New Users Today", icon: <FiUserPlus className="w-8 h-8" />, accent: "bg-amber-500", bg: "bg-amber-50/50" },
];

export async function AdminStatsSection() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  
  // Fetch stats from the optimized backend endpoint
  const supabase = await getAdminSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  
  let stats: any = {};
  try {
    const res = await fetch(`${BACKEND_URL}/admin/stats`, { 
        cache: 'no-store', 
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'X-Admin-Security': 'streaming-fetch' 
        }
    });
    stats = await res.json();
  } catch (err) {
    console.error("Admin stats fetch failed", err);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {metricCards.map((card, index) => (
        <Card key={card.key} className="group transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-100 border-slate-100 overflow-hidden">
          <CardContent className={`p-8 ${card.bg} relative`}>
            <div className={`absolute top-0 right-0 w-32 h-32 ${card.accent} opacity-[0.03] rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500`} />
            <div className="relative z-10 space-y-6">
              <div className={`w-14 h-14 ${card.accent} text-white rounded-2xl flex items-center justify-center shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-300`}>
                {card.icon}
              </div>
              <div className="space-y-1">
                <Typography variant="h1" weight="extrabold" className="text-slate-900 tracking-tight">
                  {stats[card.key]?.toLocaleString() ?? 0}
                </Typography>
                <Typography variant="body2" weight="bold" color="muted" className="uppercase tracking-widest text-[10px]">
                  {card.label}
                </Typography>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
