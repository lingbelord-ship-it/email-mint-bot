import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Loader2, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
  email: string;
  status: 'testing' | 'success' | 'failed';
  reason?: string;
  timestamp: Date;
}

interface GenerationLogsProps {
  logs: LogEntry[];
  isGenerating: boolean;
}

export const GenerationLogs = ({ logs, isGenerating }: GenerationLogsProps) => {
  const successLogs = logs.filter(l => l.status === 'success');
  const failedLogs = logs.filter(l => l.status === 'failed');
  const testingLogs = logs.filter(l => l.status === 'testing');

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Real-Time Generation Logs
          {isGenerating && <Loader2 className="w-4 h-4 animate-spin ml-2 text-primary" />}
        </CardTitle>
        <CardDescription>
          Watch emails being tested in real-time • {successLogs.length} passed • {failedLogs.length} failed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] w-full pr-4">
          {logs.length === 0 && !isGenerating ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No generation activity yet</p>
              <p className="text-sm">Click generate to see real-time logs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Show message when generating */}
              {isGenerating && logs.length === 0 && (
                <div className="flex items-center justify-center p-6 rounded-lg bg-primary/10 border border-primary/20 animate-pulse">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mr-3" />
                  <p className="text-sm font-medium">Starting email generation...</p>
                </div>
              )}

              {/* Testing emails at top with animation */}
              {testingLogs.length > 0 && (
                <div className="mb-4 space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Currently Testing ({testingLogs.length})
                  </h3>
                  {testingLogs.map((log, idx) => (
                    <div key={`testing-${idx}`} className="flex items-center justify-between p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 animate-pulse shadow-sm">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                        <div>
                          <code className="text-sm font-mono text-blue-700 dark:text-blue-300">{log.email}</code>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Verifying with API...</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-blue-400 text-blue-700 dark:text-blue-300">
                        Testing
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Successful emails */}
              {successLogs.length > 0 && (
                <div className="mb-4 space-y-2">
                  <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Successful Verifications ({successLogs.length})
                  </h3>
                  {successLogs.map((log, idx) => (
                    <div key={`success-${idx}`} className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 shadow-sm">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <code className="text-sm font-mono font-semibold text-green-700 dark:text-green-300">{log.email}</code>
                          {log.reason && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">{log.reason}</p>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-green-600 hover:bg-green-700 text-white">
                        ✓ Valid
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Failed emails */}
              {failedLogs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4" />
                    Failed Verifications ({failedLogs.length})
                  </h3>
                  {failedLogs.map((log, idx) => (
                    <div key={`failed-${idx}`} className="flex items-start justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 shadow-sm">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-3">
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                          <code className="text-sm font-mono text-red-700 dark:text-red-300">{log.email}</code>
                        </div>
                        {log.reason && (
                          <p className="text-xs text-red-600 dark:text-red-400 ml-8">{log.reason}</p>
                        )}
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        ✗ Invalid
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
