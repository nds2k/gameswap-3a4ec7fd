import { useState } from 'react';
import { AdminUser, useAdminUsers } from '@/hooks/useAdminUsers';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, MoreVertical, ShieldBan, ShieldCheck, ShieldAlert,
  UserCog, Crown, Shield, User, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';

interface Props {
  users: AdminUser[];
  isLoading: boolean;
  isActionLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  banUser: (userId: string, reason: string) => Promise<boolean>;
  suspendUser: (userId: string, reason: string, until: string) => Promise<boolean>;
  unbanUser: (userId: string) => Promise<boolean>;
  assignRole: (userId: string, role: string) => Promise<boolean>;
  removeRole: (userId: string, role: string) => Promise<boolean>;
}

const getRoleBadge = (roles: string[]) => {
  if (roles.includes('admin')) return <Badge className="bg-destructive/10 text-destructive border-destructive/20 border"><Crown className="h-3 w-3 mr-1" />Admin</Badge>;
  if (roles.includes('moderator')) return <Badge className="bg-primary/10 text-primary border-primary/20 border"><Shield className="h-3 w-3 mr-1" />Mod</Badge>;
  return <Badge variant="outline"><User className="h-3 w-3 mr-1" />User</Badge>;
};

function BanDialog({ user, onConfirm, isActionLoading }: { user: AdminUser; onConfirm: (reason: string) => void; isActionLoading: boolean }) {
  const [reason, setReason] = useState('');
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <ShieldBan className="h-5 w-5 text-destructive" />
          Ban {user.username || user.full_name || 'User'}
        </AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently ban the user. They will not be able to access the platform.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <Textarea
        placeholder="Reason for ban (required)"
        value={reason}
        onChange={e => setReason(e.target.value)}
        className="min-h-[80px]"
      />
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive hover:bg-destructive/90"
          onClick={() => reason.trim() && onConfirm(reason)}
          disabled={!reason.trim() || isActionLoading}
        >
          Confirm Ban
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

function SuspendDialog({ user, onConfirm, isActionLoading }: { user: AdminUser; onConfirm: (reason: string, until: string) => void; isActionLoading: boolean }) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-yellow-500" />
          Suspend {user.username || user.full_name || 'User'}
        </AlertDialogTitle>
        <AlertDialogDescription>Temporarily suspend this user's access.</AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-3">
        <Textarea
          placeholder="Reason for suspension"
          value={reason}
          onChange={e => setReason(e.target.value)}
          className="min-h-[60px]"
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            max="365"
            value={days}
            onChange={e => setDays(e.target.value)}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-yellow-600 hover:bg-yellow-700"
          onClick={() => {
            const until = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000).toISOString();
            onConfirm(reason, until);
          }}
          disabled={isActionLoading}
        >
          Suspend
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

export const UserManagementTab = ({
  users, isLoading, isActionLoading, searchQuery, setSearchQuery,
  banUser, suspendUser, unbanUser, assignRole, removeRole
}: Props) => {
  const { isAdmin } = useUserRole();
  const [pendingAction, setPendingAction] = useState<{ type: 'ban' | 'suspend'; user: AdminUser } | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username, name, or ID..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <Card><CardContent className="p-3">
          <div className="text-2xl font-bold">{users.length}</div>
          <div className="text-xs text-muted-foreground">Total Users</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-2xl font-bold text-destructive">{users.filter(u => u.is_banned).length}</div>
          <div className="text-xs text-muted-foreground">Banned</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-2xl font-bold text-primary">{users.filter(u => u.roles.includes('moderator') || u.roles.includes('admin')).length}</div>
          <div className="text-xs text-muted-foreground">Staff</div>
        </CardContent></Card>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {users.map(user => (
            <Card key={user.user_id} className={`transition-colors ${user.is_banned ? 'border-destructive/30 bg-destructive/5' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{(user.username || user.full_name || 'U')[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {user.username ? `@${user.username}` : user.full_name || 'Unknown'}
                        </span>
                        {getRoleBadge(user.roles)}
                        {user.is_banned && (
                          <Badge variant="destructive" className="text-xs">
                            <ShieldBan className="h-3 w-3 mr-1" />
                            Banned
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined {format(new Date(user.created_at), 'PP')}
                        {user.is_banned && user.banned_until && (
                          <span className="text-destructive ml-2">
                            · Until {format(new Date(user.banned_until), 'PP')}
                          </span>
                        )}
                      </div>
                      {user.ban_reason && (
                        <div className="text-xs text-destructive mt-0.5">Reason: {user.ban_reason}</div>
                      )}
                    </div>
                  </div>

                  <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {user.is_banned ? (
                          <DropdownMenuItem
                            className="text-green-600"
                            onClick={() => unbanUser(user.user_id)}
                            disabled={isActionLoading}
                          >
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Unban User
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-yellow-600"
                                onSelect={() => setPendingAction({ type: 'suspend', user })}
                              >
                                <ShieldAlert className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => setPendingAction({ type: 'ban', user })}
                              >
                                <ShieldBan className="h-4 w-4 mr-2" />
                                Permanent Ban
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </>
                        )}

                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            {!user.roles.includes('moderator') && !user.roles.includes('admin') && (
                              <DropdownMenuItem onClick={() => assignRole(user.user_id, 'moderator')} disabled={isActionLoading}>
                                <UserCog className="h-4 w-4 mr-2" />
                                Make Moderator
                              </DropdownMenuItem>
                            )}
                            {user.roles.includes('moderator') && !user.roles.includes('admin') && (
                              <DropdownMenuItem onClick={() => removeRole(user.user_id, 'moderator')} disabled={isActionLoading}>
                                <UserCog className="h-4 w-4 mr-2" />
                                Remove Moderator
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {pendingAction?.user.user_id === user.user_id && pendingAction.type === 'ban' && (
                      <BanDialog
                        user={user}
                        onConfirm={(reason) => { banUser(user.user_id, reason); setPendingAction(null); }}
                        isActionLoading={isActionLoading}
                      />
                    )}
                    {pendingAction?.user.user_id === user.user_id && pendingAction.type === 'suspend' && (
                      <SuspendDialog
                        user={user}
                        onConfirm={(reason, until) => { suspendUser(user.user_id, reason, until); setPendingAction(null); }}
                        isActionLoading={isActionLoading}
                      />
                    )}
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}

          {users.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No users found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
