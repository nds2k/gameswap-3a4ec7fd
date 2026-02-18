import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useContentReports } from '@/hooks/useContentReports';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { MainLayout } from '@/components/layout/MainLayout';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { AuditLogsTab } from '@/components/admin/AuditLogsTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  FileText, MessageSquare, Flag, Users, ClipboardList, Lock
} from 'lucide-react';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isModerator, isLoading: roleLoading } = useUserRole();
  const {
    reports, pendingPosts, pendingReplies,
    isLoading: contentLoading, refreshAll: refreshContent,
    updateReportStatus, moderatePost, moderateReply
  } = useContentReports();

  const {
    users, logs, isLoading: usersLoading, isActionLoading,
    searchQuery, setSearchQuery, refreshAll: refreshUsers,
    banUser, suspendUser, unbanUser, assignRole, removeRole
  } = useAdminUsers();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && !isModerator) navigate('/');
  }, [isModerator, roleLoading, navigate]);

  const refreshAll = () => {
    refreshContent();
    refreshUsers();
  };

  if (authLoading || roleLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isModerator) return null;

  const pendingReports = reports.filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status !== 'pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Resolved</Badge>;
      case 'dismissed':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalBanned = users.filter(u => u.is_banned).length;

  return (
    <MainLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                {isAdmin ? 'Full access · Admin' : 'Moderation access · Moderator'}
              </p>
            </div>
          </div>
          <Button onClick={refreshAll} variant="outline" size="sm" disabled={contentLoading || usersLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${(contentLoading || usersLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats grid */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{pendingReports.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Forum Queue</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{pendingPosts.length + pendingReplies.length}</div>
              <p className="text-xs text-muted-foreground">Posts + replies</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">{totalBanned} banned</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-muted-foreground">Admin actions recorded</p>
            </CardContent>
          </Card>
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
          <Lock className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <span>
            All actions are validated server-side via Edge Functions using the{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">user_roles</code> table.
            Frontend never writes directly to the database. Every action is logged immutably.
          </span>
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5">
              <Flag className="h-4 w-4" />
              Reports
              {pendingReports.length > 0 && (
                <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground ml-1">
                  {pendingReports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Posts ({pendingPosts.length})
            </TabsTrigger>
            <TabsTrigger value="replies" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Replies ({pendingReplies.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <CheckCircle className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Ban, suspend, or assign roles. All actions go through server-side validation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManagementTab
                  users={users}
                  isLoading={usersLoading}
                  isActionLoading={isActionLoading}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  banUser={banUser}
                  suspendUser={suspendUser}
                  unbanUser={unbanUser}
                  assignRole={assignRole}
                  removeRole={removeRole}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Content Reports</CardTitle>
                <CardDescription>Review and manage user-submitted reports</CardDescription>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
                ) : pendingReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending reports</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {pendingReports.map(report => (
                        <Card key={report.id} className="border-l-4 border-l-yellow-500">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                  <span className="font-medium capitalize">{report.content_type}</span>
                                  {getStatusBadge(report.status)}
                                </div>
                                <p className="text-sm font-medium">Reason: {report.reason}</p>
                                {report.description && (
                                  <p className="text-sm text-muted-foreground">{report.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Reported {format(new Date(report.created_at), 'PPp')}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700"
                                  onClick={() => updateReportStatus(report.id, 'resolved')}>
                                  <CheckCircle className="h-4 w-4 mr-1" />Resolve
                                </Button>
                                <Button size="sm" variant="outline" className="text-muted-foreground"
                                  onClick={() => updateReportStatus(report.id, 'dismissed')}>
                                  <XCircle className="h-4 w-4 mr-1" />Dismiss
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts">
            <Card>
              <CardHeader>
                <CardTitle>Pending Forum Posts</CardTitle>
                <CardDescription>Approve or reject new forum posts</CardDescription>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
                ) : pendingPosts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending posts</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {pendingPosts.map(post => (
                        <Card key={post.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 space-y-2">
                                <h4 className="font-medium">{post.title}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700"
                                  onClick={() => moderatePost(post.id, 'approved')}>
                                  <CheckCircle className="h-4 w-4 mr-1" />Approve
                                </Button>
                                <Button size="sm" variant="destructive"
                                  onClick={() => moderatePost(post.id, 'rejected')}>
                                  <XCircle className="h-4 w-4 mr-1" />Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Replies Tab */}
          <TabsContent value="replies">
            <Card>
              <CardHeader>
                <CardTitle>Pending Forum Replies</CardTitle>
                <CardDescription>Approve or reject new forum replies</CardDescription>
              </CardHeader>
              <CardContent>
                {contentLoading ? (
                  <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
                ) : pendingReplies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending replies</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {pendingReplies.map(reply => (
                        <Card key={reply.id} className="border-l-4 border-l-purple-500">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground line-clamp-3">{reply.content}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700"
                                  onClick={() => moderateReply(reply.id, 'approved')}>
                                  <CheckCircle className="h-4 w-4 mr-1" />Approve
                                </Button>
                                <Button size="sm" variant="destructive"
                                  onClick={() => moderateReply(reply.id, 'rejected')}>
                                  <XCircle className="h-4 w-4 mr-1" />Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>Immutable record of all admin actions. Cannot be edited or deleted.</CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLogsTab logs={logs} isLoading={usersLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Report History</CardTitle>
                <CardDescription>Previously reviewed reports</CardDescription>
              </CardHeader>
              <CardContent>
                {resolvedReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground"><p>No report history</p></div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {resolvedReports.map(report => (
                        <Card key={report.id} className="opacity-75">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium capitalize">{report.content_type}</span>
                                  {getStatusBadge(report.status)}
                                </div>
                                <p className="text-sm">Reason: {report.reason}</p>
                                {report.reviewed_at && (
                                  <p className="text-xs text-muted-foreground">
                                    Reviewed {format(new Date(report.reviewed_at), 'PPp')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;
