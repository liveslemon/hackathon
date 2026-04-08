import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, Typography, Button, Stack } from "@/components/ui";
import { FiBook, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { useRouter } from "next/navigation";

export default function LogbookWidget({ userId }: { userId: string }) {
  const router = useRouter();
  const [hasStarted, setHasStarted] = useState(false);
  const [todayStatus, setTodayStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkLogbook() {
      try {
        setLoading(true);
        // Check if student has an accepted internship
        const { data: applied } = await supabase
          .from("applied_internships")
          .select("status")
          .eq("user_id", userId)
          .eq("status", "accepted")
          .limit(1)
          .maybeSingle();

        if (applied) {
          setHasStarted(true);
          // Check today's logbook entry
          const todayStr = new Date().toISOString().split("T")[0];
          const { data: entry } = await supabase
            .from("logbook_entries")
            .select("status")
            .eq("student_id", userId)
            .eq("date", todayStr)
            .maybeSingle();

          if (entry) {
             setTodayStatus(entry.status); // 'pending', 'approved', 'flagged'
          } else {
             setTodayStatus("missing");
          }
        } else {
          setHasStarted(false);
        }
      } catch (err) {
        console.error("Logbook widget error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (userId) checkLogbook();
  }, [userId]);

  if (loading || !hasStarted) return null;

  return (
    <Card className="mb-8 p-6 bg-gradient-to-r from-brand/10 to-brand-secondary/10 border border-brand/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
      <Stack direction="row" align="center" spacing={4} className="flex-1">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${todayStatus === 'missing' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {todayStatus === 'missing' ? <FiAlertCircle className="w-6 h-6" /> : <FiCheckCircle className="w-6 h-6" />}
        </div>
        <div>
          <Typography variant="h6" weight="bold" className="text-slate-800">
            {todayStatus === 'missing' ? "Don't forget today's log!" : "Today's log submitted"}
          </Typography>
          <Typography variant="body2" color="muted">
            {todayStatus === 'missing' 
              ? "You haven't filled your SIWES logbook for today yet. Missed days cannot be recovered." 
              : `Your log is currently ${todayStatus}. Great job keeping up!`}
          </Typography>
        </div>
      </Stack>
      <Button 
        variant={todayStatus === 'missing' ? "solid" : "outline"} 
        onClick={() => router.push("/dashboard/student/logbook")}
        className="whitespace-nowrap rounded-xl shadow-sm"
      >
        <FiBook className="mr-2 inline" /> Go to Logbook
      </Button>
    </Card>
  );
}
