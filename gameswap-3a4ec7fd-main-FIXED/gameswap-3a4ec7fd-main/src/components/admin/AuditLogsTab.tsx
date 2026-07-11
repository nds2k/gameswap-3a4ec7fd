import { AdminLog } from '@/hooks/useAdminUsers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ShieldBan, ShieldCheck, ShieldAlert, UserCog, AlertTriangle, FileText } from 'lucide-react';

interface Props {
  logs: AdminLog[];
  isLoading: boolean;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ban: { label: 'Banned', icon: <ShieldBan className="h-4 w-4" />, color: 'text-destructive' },
  unban: { label: 'Unbanned', icon: <ShieldCheck className="h-4 w-4" />, color: 'text-green-600' },
  suspend: { label: 'Suspended', icon: <ShieldAlert className="h-4 w-4" />, color: 'text-yellow-600' },
  role_assign: { label: 'Role Assigned', icon: <UserCog className="h-4 w-4" />, color: 'text-primary' },
  role_remove: { label: 'Role Removed', icon: <UserCog className="h-4 w-4" />, color: 'text-muted-foreground' },
  warn: { label: 'Warned', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-500' },
  resolved: { label: 'Report Resolved', icon: <FileText className="h-4 w-4" />, color: 'text-green-600' },
  dismissed: { label: 'Report Dismissed', icon: <FileText className="h-4 w-4" />, color: 'text-muted-foreground' },
};

export const AuditLogsTab = ({ logs, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-2">
        {logs.map(log => {
          const config = ACTION_CONFIG[log.action] || {
            label: log.action,
            icon: <FileText className="h-4 w-4" />,
            color: 'text-muted-foreground'
          };

          const adminName = log.admin_profile?.username
            ? `@${log.admin_profile.username}`
            : log.admin_profile?.full_name || `User ${log.admin_id.slice(0, 8)}`;

          const targetName = log.target_profile?.username
            ? `@${log.target_profile.username}`
            : log.target_profile?.full_name || (log.target_user_id ? `User ${log.target_user_id.slice(0, 8)}` : null);

          return (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 shrink-0 ${config.color}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{adminName}</span>
                      <Badge variant="outline" className={`text-xs ${config.color}`}>
                        {config.label}
                      </Badge>
                      {targetName && (
                        <>
                          <span className="text-muted-foreground text-sm">→</span>
                          <span className="font-medium text-sm">{targetName}</span>
                        </>
                      )}
                    </div>
                    {log.reason && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Reason: {log.reason}
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {JSON.stringify(log.metadata)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(log.created_at), 'PPp')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {logs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No audit logs yet</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
