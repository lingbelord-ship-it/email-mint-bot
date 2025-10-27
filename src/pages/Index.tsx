import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, CheckCircle2, XCircle, Loader2, Calendar, Shield } from "lucide-react";
import { EmailsTable } from "@/components/EmailsTable";
import { StatsCards } from "@/components/StatsCards";
import { GenerationLogs } from "@/components/GenerationLogs";

interface LogEntry {
  email: string;
  status: 'testing' | 'success' | 'failed';
  reason?: string;
  timestamp: Date;
}

const Index = () => {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    deliverable: 0,
    today: 0,
  });

  useEffect(() => {
    fetchEmails();
    fetchDailyCount();
  }, []);

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from("generated_emails")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEmails(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const verified = data?.filter(e => e.is_verified).length || 0;
      const deliverable = data?.filter(e => e.is_deliverable).length || 0;
      const today = data?.filter(e => {
        const emailDate = new Date(e.created_at).toDateString();
        const todayDate = new Date().toDateString();
        return emailDate === todayDate;
      }).length || 0;

      setStats({ total, verified, deliverable, today });
    } catch (error: any) {
      toast.error("Failed to fetch emails");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyCount = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("daily_generation_tracking")
        .select("*")
        .eq("generation_date", today)
        .maybeSingle();

      if (error) throw error;
      setDailyCount(data?.emails_generated || 0);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerate = async () => {
    if (dailyCount >= 25) {
      toast.error("Daily limit of 25 emails reached. Try again tomorrow!");
      return;
    }

    setGenerating(true);
    setLogs([]); // Clear previous logs
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-emails`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate emails");
      }

      toast.success(
        `Generated ${result.generated} emails! (${result.deliverable} deliverable, ${result.verified} verified)`
      );
      
      await fetchEmails();
      await fetchDailyCount();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate emails");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
              <Mail className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Email Verification System
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Generate and verify real email addresses using AI-powered verification
          </p>
        </div>

        {/* Generate Section - Moved to Top */}
        <Card className="border-2 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Generate Verified Emails
            </CardTitle>
            <CardDescription>
              Click the button below to generate up to 25 verified emails per day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Daily Limit</p>
                <p className="text-2xl font-bold text-primary">
                  {dailyCount} / 25
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm font-medium">Remaining Today</p>
                <p className="text-2xl font-bold text-accent">
                  {25 - dailyCount}
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleGenerate}
              disabled={generating || dailyCount >= 25}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating & Verifying...
                </>
              ) : dailyCount >= 25 ? (
                <>
                  <Calendar className="mr-2 h-5 w-5" />
                  Daily Limit Reached
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Generate Verified Emails
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <StatsCards stats={stats} dailyCount={dailyCount} />

        {/* Real-Time Logs */}
        <GenerationLogs logs={logs} isGenerating={generating} />

        {/* Emails Table */}
        <EmailsTable emails={emails} loading={loading} />
      </div>
    </div>
  );
};

export default Index;