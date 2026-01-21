import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContentReport {
  id: string;
  content_id: string;
  content_type: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter_id: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  moderation_status: string | null;
}

interface ForumReply {
  id: string;
  content: string;
  author_id: string;
  post_id: string;
  moderation_status: string | null;
}

export const useContentReports = () => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [pendingPosts, setPendingPosts] = useState<ForumPost[]>([]);
  const [pendingReplies, setPendingReplies] = useState<ForumReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      toast.error('Failed to load reports');
    }
  };

  const fetchPendingContent = async () => {
    try {
      const [postsResult, repliesResult] = await Promise.all([
        supabase
          .from('forum_posts')
          .select('id, title, content, author_id, moderation_status')
          .eq('moderation_status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('forum_replies')
          .select('id, content, author_id, post_id, moderation_status')
          .eq('moderation_status', 'pending')
          .order('created_at', { ascending: false })
      ]);

      if (postsResult.error) throw postsResult.error;
      if (repliesResult.error) throw repliesResult.error;

      setPendingPosts(postsResult.data || []);
      setPendingReplies(repliesResult.data || []);
    } catch (err) {
      console.error('Error fetching pending content:', err);
      toast.error('Failed to load pending content');
    }
  };

  const refreshAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchReports(), fetchPendingContent()]);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const updateReportStatus = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', reportId);

      if (error) throw error;
      
      toast.success(`Report ${status}`);
      await fetchReports();
    } catch (err) {
      console.error('Error updating report:', err);
      toast.error('Failed to update report');
    }
  };

  const moderatePost = async (postId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .update({
          moderation_status: action,
          is_moderated: true,
          moderation_reason: action === 'rejected' ? 'Content violates community guidelines' : null
        })
        .eq('id', postId);

      if (error) throw error;
      
      toast.success(`Post ${action}`);
      await fetchPendingContent();
    } catch (err) {
      console.error('Error moderating post:', err);
      toast.error('Failed to moderate post');
    }
  };

  const moderateReply = async (replyId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('forum_replies')
        .update({
          moderation_status: action,
          is_moderated: true,
          moderation_reason: action === 'rejected' ? 'Content violates community guidelines' : null
        })
        .eq('id', replyId);

      if (error) throw error;
      
      toast.success(`Reply ${action}`);
      await fetchPendingContent();
    } catch (err) {
      console.error('Error moderating reply:', err);
      toast.error('Failed to moderate reply');
    }
  };

  return {
    reports,
    pendingPosts,
    pendingReplies,
    isLoading,
    refreshAll,
    updateReportStatus,
    moderatePost,
    moderateReply
  };
};
