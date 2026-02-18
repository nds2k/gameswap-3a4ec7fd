import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminUser {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
  is_banned: boolean;
  ban_reason: string | null;
  banned_until: string | null;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  admin_profile?: { username: string | null; full_name: string | null };
  target_profile?: { username: string | null; full_name: string | null };
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch all active bans
      const { data: bans, error: bansError } = await supabase
        .from('user_bans')
        .select('user_id, reason, banned_until')
        .gt('banned_until', new Date().toISOString());

      if (bansError) throw bansError;

      const roleMap = new Map<string, string[]>();
      allRoles?.forEach(r => {
        const existing = roleMap.get(r.user_id) || [];
        roleMap.set(r.user_id, [...existing, r.role]);
      });

      const banMap = new Map<string, { reason: string | null; banned_until: string }>();
      bans?.forEach(b => banMap.set(b.user_id, { reason: b.reason, banned_until: b.banned_until }));

      const enriched: AdminUser[] = (profiles || []).map(p => {
        const banInfo = banMap.get(p.user_id);
        return {
          ...p,
          roles: roleMap.get(p.user_id) || ['user'],
          is_banned: !!banInfo,
          ban_reason: banInfo?.reason || null,
          banned_until: banInfo?.banned_until || null,
        };
      });

      setUsers(enriched);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Enrich logs with profile info
      const uniqueIds = new Set<string>();
      data?.forEach(l => {
        if (l.admin_id) uniqueIds.add(l.admin_id);
        if (l.target_user_id) uniqueIds.add(l.target_user_id);
      });

      const ids = Array.from(uniqueIds);
      let profileMap = new Map<string, { username: string | null; full_name: string | null }>();

      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, full_name')
          .in('user_id', ids);

        profiles?.forEach(p => profileMap.set(p.user_id, { username: p.username, full_name: p.full_name }));
      }

      const enriched = (data || []).map(log => ({
        ...log,
        metadata: (log.metadata as Record<string, unknown>) || {},
        admin_profile: profileMap.get(log.admin_id),
        target_profile: log.target_user_id ? profileMap.get(log.target_user_id) : undefined,
      }));

      setLogs(enriched);
    } catch (err) {
      console.error('Error fetching logs:', err);
      toast.error('Failed to load admin logs');
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchUsers(), fetchLogs()]);
    setIsLoading(false);
  }, [fetchUsers, fetchLogs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const callAdminAction = async (action: string, targetUserId: string, reason?: string, extra?: Record<string, string>) => {
    setIsActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ban-user', {
        body: { targetUserId, reason, action, ...extra },
      });

      if (response.error) throw response.error;

      toast.success(`Action '${action}' applied successfully`);
      await refreshAll();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      console.error(`Admin action error (${action}):`, err);
      toast.error(message);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const banUser = (targetUserId: string, reason: string) =>
    callAdminAction('ban', targetUserId, reason);

  const suspendUser = (targetUserId: string, reason: string, bannedUntil: string) =>
    callAdminAction('suspend', targetUserId, reason, { bannedUntil });

  const unbanUser = (targetUserId: string) =>
    callAdminAction('unban', targetUserId);

  const assignRole = async (targetUserId: string, newRole: string) => {
    setIsActionLoading(true);
    try {
      const response = await supabase.functions.invoke('admin-manage-role', {
        body: { targetUserId, newRole, action: 'assign' },
      });
      if (response.error) throw response.error;
      toast.success(`Role '${newRole}' assigned`);
      await refreshAll();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Role assignment failed';
      toast.error(message);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const removeRole = async (targetUserId: string, role: string) => {
    setIsActionLoading(true);
    try {
      const response = await supabase.functions.invoke('admin-manage-role', {
        body: { targetUserId, newRole: role, action: 'remove' },
      });
      if (response.error) throw response.error;
      toast.success(`Role '${role}' removed`);
      await refreshAll();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Role removal failed';
      toast.error(message);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q)
    );
  });

  return {
    users: filteredUsers,
    allUsers: users,
    logs,
    isLoading,
    isActionLoading,
    searchQuery,
    setSearchQuery,
    refreshAll,
    banUser,
    suspendUser,
    unbanUser,
    assignRole,
    removeRole,
  };
};
