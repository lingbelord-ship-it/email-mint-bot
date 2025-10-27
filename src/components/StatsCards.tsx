import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle2, Shield, Calendar } from "lucide-react";

interface StatsCardsProps {
  stats: {
    total: number;
    verified: number;
    deliverable: number;
    today: number;
  };
  dailyCount: number;
}

export const StatsCards = ({ stats, dailyCount }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Emails
          </CardTitle>
          <Mail className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">All time generated</p>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Verified
          </CardTitle>
          <CheckCircle2 className="w-4 h-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-accent">{stats.verified}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}% of total
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Deliverable
          </CardTitle>
          <Shield className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{stats.deliverable}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.total > 0 ? Math.round((stats.deliverable / stats.total) * 100) : 0}% delivery rate
          </p>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Today's Progress
          </CardTitle>
          <Calendar className="w-4 h-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-accent">{dailyCount} / 25</div>
          <p className="text-xs text-muted-foreground mt-1">
            {25 - dailyCount} remaining today
          </p>
        </CardContent>
      </Card>
    </div>
  );
};