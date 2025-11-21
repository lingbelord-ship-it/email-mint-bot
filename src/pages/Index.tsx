import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, CheckCircle2, XCircle, Loader2, Shield, Trash2 } from "lucide-react";
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [emailCount, setEmailCount] = useState(25);
  const [maxApiRequests, setMaxApiRequests] = useState(50);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    deliverable: 0,
    today: 0,
  });
  
  // Email pattern options
  const [useFirstName, setUseFirstName] = useState(true);
  const [useLastName, setUseLastName] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeDots, setIncludeDots] = useState(true);
  const [useAbbreviations, setUseAbbreviations] = useState(true);
  
  // Category options
  const [useNames, setUseNames] = useState(true);
  const [useCompanyNames, setUseCompanyNames] = useState(false);
  const [useSportsTerms, setUseSportsTerms] = useState(false);
  const [useCommonWords, setUseCommonWords] = useState(false);
  
  // Name region options
  const [useWestern, setUseWestern] = useState(true);
  const [useBritish, setUseBritish] = useState(true);
  const [useFinnish, setUseFinnish] = useState(true);
  const [useSwedish, setUseSwedish] = useState(true);
  const [useNorwegian, setUseNorwegian] = useState(true);
  const [useDanish, setUseDanish] = useState(true);
  const [useIrish, setUseIrish] = useState(true);
  const [useScottish, setUseScottish] = useState(true);
  const [useWelsh, setUseWelsh] = useState(true);
  const [useDutch, setUseDutch] = useState(true);
  const [useGerman, setUseGerman] = useState(true);
  const [useIndian, setUseIndian] = useState(true);
  const [useArabic, setUseArabic] = useState(true);
  const [useJewish, setUseJewish] = useState(true);
  const [usePakistani, setUsePakistani] = useState(true);
  const [useAfrican, setUseAfrican] = useState(true);

  useEffect(() => {
    fetchEmails();
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


  const handleClearEmails = async () => {
    try {
      setLoading(true);
      
      // Delete all generated emails
      const { error: emailsError } = await supabase
        .from("generated_emails")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows
      
      if (emailsError) throw emailsError;
      
      toast.success("All emails cleared successfully!");
      await fetchEmails();
    } catch (error: any) {
      toast.error("Failed to clear emails");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!currentSessionId) return;
    
    try {
      // Insert stop signal
      await supabase
        .from('generation_stop_signals')
        .insert({ session_id: currentSessionId });
      
      toast.info("Stop signal sent. Generation will halt after current email check.");
    } catch (error: any) {
      console.error("Failed to send stop signal:", error);
    }
  };

  const exportToCSV = () => {
    if (emails.length === 0) {
      toast.error("No emails to export");
      return;
    }

    // Filter only verified and deliverable emails
    const validEmails = emails.filter(e => e.is_verified && e.is_deliverable);
    
    if (validEmails.length === 0) {
      toast.error("No valid emails to export");
      return;
    }

    // Create CSV content
    const headers = ['Email', 'First Name', 'Last Name', 'Verified', 'Deliverable', 'Created At'];
    const rows = validEmails.map(email => [
      email.email,
      email.first_name,
      email.last_name,
      email.is_verified ? 'Yes' : 'No',
      email.is_deliverable ? 'Yes' : 'No',
      new Date(email.created_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `verified-emails-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${validEmails.length} valid emails to CSV`);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setLogs([]); // Clear previous logs
    
    // Generate a unique session ID for this generation run
    const sessionId = crypto.randomUUID();
    setCurrentSessionId(sessionId);
    
    // Subscribe to real-time logs for this session
    const channel = supabase
      .channel(`generation-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'generation_logs',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const newLog: LogEntry = {
            email: payload.new.email,
            status: payload.new.status as 'testing' | 'success' | 'failed',
            reason: payload.new.reason,
            timestamp: new Date(payload.new.created_at)
          };
          
          setLogs(prev => {
            // Replace testing status with final status for the same email
            const existingIndex = prev.findIndex(log => log.email === newLog.email);
            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex] = newLog;
              return updated;
            }
            return [...prev, newLog];
          });
        }
      )
      .subscribe();
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-emails`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            session_id: sessionId,
            count: emailCount,
            max_api_requests: maxApiRequests,
            patterns: {
              useFirstName,
              useLastName,
              includeNumbers,
              includeDots,
              useAbbreviations
            },
            categories: {
              useNames,
              useCompanyNames,
              useSportsTerms,
              useCommonWords
            },
            regions: {
              western: useWestern,
              british: useBritish,
              finnish: useFinnish,
              swedish: useSwedish,
              norwegian: useNorwegian,
              danish: useDanish,
              irish: useIrish,
              scottish: useScottish,
              welsh: useWelsh,
              dutch: useDutch,
              german: useGerman,
              indian: useIndian,
              arabic: useArabic,
              jewish: useJewish,
              pakistani: usePakistani,
              african: useAfrican
            }
          })
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
      
      // Clean up old logs for this session after 30 seconds
      setTimeout(async () => {
        await supabase
          .from('generation_logs')
          .delete()
          .eq('session_id', sessionId);
      }, 30000);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate emails");
      console.error(error);
    } finally {
      setGenerating(false);
      setCurrentSessionId(null);
      // Unsubscribe from the channel
      supabase.removeChannel(channel);
      
      // Clean up stop signal
      if (sessionId) {
        await supabase
          .from('generation_stop_signals')
          .delete()
          .eq('session_id', sessionId);
      }
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

        {/* Generate Section */}
        <Card className="border-2 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Generate Verified Emails
            </CardTitle>
            <CardDescription>
              Configure email generation patterns and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Generation Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3 items-center">
                <label htmlFor="emailCount" className="text-sm font-medium whitespace-nowrap">
                  Emails to generate:
                </label>
                <input
                  id="emailCount"
                  type="number"
                  min="1"
                  max="100"
                  value={emailCount}
                  onChange={(e) => setEmailCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  disabled={generating}
                  className="w-24 px-3 py-2 border rounded-md bg-background"
                />
              </div>
              <div className="flex gap-3 items-center">
                <label htmlFor="maxApiRequests" className="text-sm font-medium whitespace-nowrap">
                  Max API requests:
                </label>
                <input
                  id="maxApiRequests"
                  type="number"
                  min="1"
                  max="500"
                  value={maxApiRequests}
                  onChange={(e) => setMaxApiRequests(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))}
                  disabled={generating}
                  className="w-24 px-3 py-2 border rounded-md bg-background"
                />
              </div>
            </div>

            {/* Email Pattern Options */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Email Patterns</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="useFirstName" 
                    checked={useFirstName}
                    onCheckedChange={(checked) => setUseFirstName(checked === true)}
                    disabled={generating}
                  />
                  <Label htmlFor="useFirstName" className="text-sm cursor-pointer">Use First Name</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="useLastName" 
                    checked={useLastName}
                    onCheckedChange={(checked) => setUseLastName(checked === true)}
                    disabled={generating}
                  />
                  <Label htmlFor="useLastName" className="text-sm cursor-pointer">Use Last Name</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeNumbers" 
                    checked={includeNumbers}
                    onCheckedChange={(checked) => setIncludeNumbers(checked === true)}
                    disabled={generating}
                  />
                  <Label htmlFor="includeNumbers" className="text-sm cursor-pointer">Include Numbers</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeDots" 
                    checked={includeDots}
                    onCheckedChange={(checked) => setIncludeDots(checked === true)}
                    disabled={generating}
                  />
                  <Label htmlFor="includeDots" className="text-sm cursor-pointer">Include Dots/Periods</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="useAbbreviations" 
                    checked={useAbbreviations}
                    onCheckedChange={(checked) => setUseAbbreviations(checked === true)}
                    disabled={generating}
                  />
                  <Label htmlFor="useAbbreviations" className="text-sm cursor-pointer">Use Abbreviations</Label>
                </div>
              </div>
            </div>

            {/* Category Options */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Email Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="useNames" 
                    checked={useNames}
                    onCheckedChange={(checked) => setUseNames(checked === true)}
                    disabled={generating}
                  />
                  <Label htmlFor="useNames" className="text-sm cursor-pointer">Names</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="useCompanyNames" 
                    checked={useCompanyNames}
                    onCheckedChange={(checked) => setUseCompanyNames(checked === true)}
                    disabled={generating}
                  />
                  <Label htmlFor="useCompanyNames" className="text-sm cursor-pointer">Company Names</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="useSportsTerms" 
                    checked={useSportsTerms}
                    onCheckedChange={(checked) => setUseSportsTerms(checked === true)}
                    disabled={generating}
                  />
                  <Label htmlFor="useSportsTerms" className="text-sm cursor-pointer">Sports Terms</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="useCommonWords" 
                    checked={useCommonWords}
                    onCheckedChange={(checked) => setUseCommonWords(checked === true)}
                    disabled={generating}
                  />
                  <Label htmlFor="useCommonWords" className="text-sm cursor-pointer">Common Words</Label>
                </div>
              </div>
            </div>

            {/* Name Region Options */}
            {useNames && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground">Name Regions (Select at least one)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useWestern" 
                      checked={useWestern}
                      onCheckedChange={(checked) => setUseWestern(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useWestern" className="text-sm cursor-pointer">Western</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useBritish" 
                      checked={useBritish}
                      onCheckedChange={(checked) => setUseBritish(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useBritish" className="text-sm cursor-pointer">British</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useFinnish" 
                      checked={useFinnish}
                      onCheckedChange={(checked) => setUseFinnish(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useFinnish" className="text-sm cursor-pointer">Finnish</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useSwedish" 
                      checked={useSwedish}
                      onCheckedChange={(checked) => setUseSwedish(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useSwedish" className="text-sm cursor-pointer">Swedish</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useNorwegian" 
                      checked={useNorwegian}
                      onCheckedChange={(checked) => setUseNorwegian(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useNorwegian" className="text-sm cursor-pointer">Norwegian</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useDanish" 
                      checked={useDanish}
                      onCheckedChange={(checked) => setUseDanish(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useDanish" className="text-sm cursor-pointer">Danish</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useIrish" 
                      checked={useIrish}
                      onCheckedChange={(checked) => setUseIrish(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useIrish" className="text-sm cursor-pointer">Irish</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useScottish" 
                      checked={useScottish}
                      onCheckedChange={(checked) => setUseScottish(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useScottish" className="text-sm cursor-pointer">Scottish</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useWelsh" 
                      checked={useWelsh}
                      onCheckedChange={(checked) => setUseWelsh(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useWelsh" className="text-sm cursor-pointer">Welsh</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useDutch" 
                      checked={useDutch}
                      onCheckedChange={(checked) => setUseDutch(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useDutch" className="text-sm cursor-pointer">Dutch</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useGerman" 
                      checked={useGerman}
                      onCheckedChange={(checked) => setUseGerman(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useGerman" className="text-sm cursor-pointer">German</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useIndian" 
                      checked={useIndian}
                      onCheckedChange={(checked) => setUseIndian(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useIndian" className="text-sm cursor-pointer">Indian</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useArabic" 
                      checked={useArabic}
                      onCheckedChange={(checked) => setUseArabic(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useArabic" className="text-sm cursor-pointer">Arabic</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useJewish" 
                      checked={useJewish}
                      onCheckedChange={(checked) => setUseJewish(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useJewish" className="text-sm cursor-pointer">Jewish</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="usePakistani" 
                      checked={usePakistani}
                      onCheckedChange={(checked) => setUsePakistani(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="usePakistani" className="text-sm cursor-pointer">Pakistani</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="useAfrican" 
                      checked={useAfrican}
                      onCheckedChange={(checked) => setUseAfrican(checked === true)}
                      disabled={generating}
                    />
                    <Label htmlFor="useAfrican" className="text-sm cursor-pointer">African</Label>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 h-12 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating & Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Generate Verified Emails
                  </>
                )}
              </Button>
              
              {generating && (
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  className="h-12 px-6"
                  size="lg"
                >
                  <XCircle className="mr-2 h-5 w-5" />
                  Stop
                </Button>
              )}
              
              <Button
                onClick={handleClearEmails}
                disabled={generating || loading || emails.length === 0}
                variant="outline"
                className="h-12 px-6"
                size="lg"
              >
                <Trash2 className="mr-2 h-5 w-5" />
                Clear All
              </Button>
            </div>
            <Button
              onClick={exportToCSV}
              disabled={loading || emails.length === 0}
              variant="secondary"
              className="w-full h-10"
              size="lg"
            >
              <Mail className="mr-2 h-4 w-4" />
              Export Valid Emails to CSV
            </Button>
          </CardContent>
        </Card>

        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Real-Time Logs */}
        <GenerationLogs logs={logs} isGenerating={generating} />

        {/* Emails Table */}
        <EmailsTable emails={emails} loading={loading} />
      </div>
    </div>
  );
};

export default Index;