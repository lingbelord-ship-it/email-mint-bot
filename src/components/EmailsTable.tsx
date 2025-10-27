import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

interface EmailsTableProps {
  emails: any[];
  loading: boolean;
}

export const EmailsTable = ({ emails, loading }: EmailsTableProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Generated Emails
        </CardTitle>
        <CardDescription>
          All generated and verified email addresses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No emails generated yet</p>
            <p className="text-sm">Click the generate button above to get started</p>
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Email</th>
                  <th className="text-left p-4 font-semibold">Name</th>
                  <th className="text-center p-4 font-semibold">Verified</th>
                  <th className="text-center p-4 font-semibold">Deliverable</th>
                  <th className="text-left p-4 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => {
                  let apiResponse;
                  try {
                    apiResponse = email.verification_status ? JSON.parse(email.verification_status) : null;
                  } catch {
                    apiResponse = null;
                  }
                  
                  return (
                    <>
                      <tr key={email.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {email.email}
                          </code>
                        </td>
                        <td className="p-4">
                          {email.first_name} {email.last_name}
                        </td>
                        <td className="p-4 text-center">
                          {email.is_verified ? (
                            <Badge variant="default" className="bg-accent hover:bg-accent">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="w-3 h-3 mr-1" />
                              Not Verified
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {email.is_deliverable ? (
                            <Badge variant="default" className="bg-primary hover:bg-primary">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Deliverable
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              Not Deliverable
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(email.created_at).toLocaleString()}
                        </td>
                      </tr>
                      {apiResponse && (
                        <tr key={`${email.id}-api`} className="border-b bg-muted/30">
                          <td colSpan={5} className="p-4">
                            <div className="text-xs">
                              <div className="font-semibold mb-2 text-muted-foreground">API Response:</div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-muted-foreground">
                                <div>
                                  <span className="font-medium">Score:</span> {apiResponse.score}
                                </div>
                                <div>
                                  <span className="font-medium">Suspicion:</span> {apiResponse.suspicion_rating}
                                </div>
                                <div>
                                  <span className="font-medium">Valid Email:</span> {apiResponse.valid_email ? '✓' : '✗'}
                                </div>
                                <div>
                                  <span className="font-medium">Valid MX:</span> {apiResponse.valid_mx ? '✓' : '✗'}
                                </div>
                                <div>
                                  <span className="font-medium">Disposable:</span> {apiResponse.disposable ? '✓' : '✗'}
                                </div>
                                <div>
                                  <span className="font-medium">Free:</span> {apiResponse.free ? '✓' : '✗'}
                                </div>
                                <div>
                                  <span className="font-medium">Role:</span> {apiResponse.role ? '✓' : '✗'}
                                </div>
                                <div>
                                  <span className="font-medium">Valid SPF:</span> {apiResponse.valid_spf ? '✓' : '✗'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};