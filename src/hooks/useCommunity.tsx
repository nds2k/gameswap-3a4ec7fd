import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Poll {
  id: string;
  author_id: string;
  question: string;
  options: string[];
  expires_at: string | null;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null };
  votes: Record<number, number>; // option_index -> count
  userVote: number | null;
  totalVotes: number;
}

interface TradeStory {
  id: string;
  author_id: string;
  trade_id: string | null;
  title: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null };
}

export const useCommunity = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [stories, setStories] = useState<TradeStory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = useCallback(async () => {
    try {
      const { data: pollsData, error } = await supabase
        .from("community_polls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!pollsData) { setPolls([]); return; }

      const authorIds = [...new Set(pollsData.map(p => p.author_id))];
      const { data: profiles } = await supabase.rpc("get_public_profiles");
      const profileMap = new Map(
        (profiles || []).filter((p: any) => authorIds.includes(p.user_id))
          .map((p: any) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
      );

      // Fetch all votes for these polls
      const pollIds = pollsData.map(p => p.id);
      const { data: votesData } = await supabase
        .from("poll_votes")
        .select("poll_id, option_index, user_id")
        .in("poll_id", pollIds);

      const enriched: Poll[] = pollsData.map(poll => {
        const pollVotes = (votesData || []).filter(v => v.poll_id === poll.id);
        const votes: Record<number, number> = {};
        pollVotes.forEach(v => { votes[v.option_index] = (votes[v.option_index] || 0) + 1; });
        const userVote = user ? pollVotes.find(v => v.user_id === user.id)?.option_index ?? null : null;
        return {
          ...poll,
          options: (poll.options as any) || [],
          author: profileMap.get(poll.author_id) || null,
          votes,
          userVote,
          totalVotes: pollVotes.length,
        };
      });

      setPolls(enriched);
    } catch (e) {
      console.error("Error fetching polls:", e);
    }
  }, [user]);

  const fetchStories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("trade_stories")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      if (!data) { setStories([]); return; }

      const authorIds = [...new Set(data.map(s => s.author_id))];
      const { data: profiles } = await supabase.rpc("get_public_profiles");
      const profileMap = new Map(
        (profiles || []).filter((p: any) => authorIds.includes(p.user_id))
          .map((p: any) => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
      );

      setStories(data.map(s => ({ ...s, author: profileMap.get(s.author_id) || null })));
    } catch (e) {
      console.error("Error fetching stories:", e);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPolls(), fetchStories()]);
    setLoading(false);
  }, [fetchPolls, fetchStories]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createPoll = async (question: string, options: string[], expiresAt?: Date) => {
    if (!user) return false;
    try {
      const { error } = await supabase.from("community_polls").insert({
        author_id: user.id,
        question,
        options,
        expires_at: expiresAt?.toISOString() || null,
      });
      if (error) throw error;
      toast({ title: "Sondage créé !" });
      fetchPolls();
      return true;
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
      return false;
    }
  };

  const votePoll = async (pollId: string, optionIndex: number) => {
    if (!user) return;
    try {
      // Delete existing vote first
      await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
      // Insert new vote
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: pollId,
        user_id: user.id,
        option_index: optionIndex,
      });
      if (error) throw error;
      fetchPolls();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const createStory = async (title: string, content: string, tradeId?: string, imageUrl?: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase.from("trade_stories").insert({
        author_id: user.id,
        title,
        content,
        trade_id: tradeId || null,
        image_url: imageUrl || null,
      });
      if (error) throw error;
      toast({ title: "Histoire publiée !" });
      fetchStories();
      return true;
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
      return false;
    }
  };

  return { polls, stories, loading, createPoll, votePoll, createStory, refetch: fetchAll };
};