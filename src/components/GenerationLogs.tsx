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
          {isGenerating && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
        </CardTitle>
        <CardDescription>
          Watch emails being tested in real-time • {successLogs.length} passed • {failedLogs.length} failed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full pr-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No generation activity yet</p>
              <p className="text-sm">Click generate to see real-time logs</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Testing emails at top */}
              {testingLogs.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing Now
                  </h3>
                  {testingLogs.map((log, idx) => (
                    <div key={`testing-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mb-2 animate-pulse">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <code className="text-sm">{log.email}</code>
                      </div>
                      <Badge variant="outline">Testing...</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Successful emails */}
              {successLogs.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2 text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Successful ({successLogs.length})
                  </h3>
                  {successLogs.map((log, idx) => (
                    <div key={`success-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <code className="text-sm text-green-700 dark:text-green-300">{log.email}</code>
                      </div>
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        Valid
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Failed emails */}
              {failedLogs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Failed ({failedLogs.length})
                  </h3>
                  {failedLogs.map((log, idx) => (
                    <div key={`failed-${idx}`} className="flex items-start justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 mb-2">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <code className="text-sm text-red-700 dark:text-red-300">{log.email}</code>
                        </div>
                        {log.reason && (
                          <p className="text-xs text-red-600 dark:text-red-400 ml-6">{log.reason}</p>
                        )}
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        Invalid
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
