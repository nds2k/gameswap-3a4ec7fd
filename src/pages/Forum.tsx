import { useState, useEffect } from "react";
import { MessageSquare, Plus, ThumbsUp, MessageCircle, Loader2, Send, Filter, AlertTriangle, Trash2, Flag, X } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  created_at: string;
  likes_count: number;
  replies_count: number;
  moderation_status: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  user_has_liked?: boolean;
}

interface ForumReply {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const Forum = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const dateLocale = language === "fr" ? fr : enUS;
  
  const REPORT_REASONS = [
    { value: "spam", label: t("report.spam") },
    { value: "harassment", label: t("report.harassment") },
    { value: "inappropriate", label: t("report.inappropriate") },
    { value: "illegal", label: t("report.illegal") },
    { value: "other", label: t("report.other") },
  ];

  const CATEGORIES = [
    { value: "general", labelKey: "forum.general" },
    { value: "strategy", labelKey: "forum.strategy" },
    { value: "party", labelKey: "forum.party" },
    { value: "family", labelKey: "forum.family" },
    { value: "trading", labelKey: "forum.trading" },
    { value: "help", labelKey: "forum.help" },
  ];
  
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [newReply, setNewReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("general");
  const [creatingPost, setCreatingPost] = useState(false);
  
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deleteReplyId, setDeleteReplyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Report state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportContentType, setReportContentType] = useState<"post" | "reply">("post");
  const [reportContentId, setReportContentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [filterCategory]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("forum_posts")
        .select("*")
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false });

      if (filterCategory !== "all") {
        query = query.eq("category", filterCategory);
      }

      const { data: postsData, error } = await query;

      if (error) throw error;

      if (postsData && postsData.length > 0) {
        const authorIds = [...new Set(postsData.map((p) => p.author_id))];
        const { data: profiles } = await supabase.rpc("get_public_profiles");
        const filteredProfiles = (profiles || []).filter((p: any) => authorIds.includes(p.user_id));

        let userLikes: string[] = [];
        if (user) {
          const { data: likesData } = await supabase
            .from("forum_likes")
            .select("post_id")
            .eq("user_id", user.id);
          userLikes = likesData?.map((l) => l.post_id) || [];
        }

        const postsWithAuthors = postsData.map((post) => ({
          ...post,
          author: filteredProfiles?.find((p: any) => p.user_id === post.author_id) || null,
          user_has_liked: userLikes.includes(post.id),
        }));

        setPosts(postsWithAuthors);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (postId: string) => {
    setRepliesLoading(true);
    try {
      const { data: repliesData, error } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("post_id", postId)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (repliesData && repliesData.length > 0) {
        const authorIds = [...new Set(repliesData.map((r) => r.author_id))];
        const { data: profiles } = await supabase.rpc("get_public_profiles");
        const filteredProfiles = (profiles || []).filter((p: any) => authorIds.includes(p.user_id));

        const repliesWithAuthors = repliesData.map((reply) => ({
          ...reply,
          author: filteredProfiles?.find((p: any) => p.user_id === reply.author_id) || null,
        }));

        setReplies(repliesWithAuthors);
      } else {
        setReplies([]);
      }
    } catch (error) {
      console.error("Error fetching replies:", error);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPostTitle.trim() || !newPostContent.trim()) return;

    setCreatingPost(true);
    try {
      const { data: moderationData, error: moderationError } = await supabase.functions.invoke(
        "moderate-forum-content",
        {
          body: { title: newPostTitle, content: newPostContent },
        }
      );

      if (moderationError) throw moderationError;

      const moderationStatus = moderationData?.approved ? "approved" : "rejected";

      if (!moderationData?.approved) {
        toast({
          title: t("forum.contentNotAllowed"),
          description: moderationData?.reason || t("forum.inappropriateContent"),
          variant: "destructive",
        });
        setCreatingPost(false);
        return;
      }

      const { error } = await supabase.from("forum_posts").insert({
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        category: newPostCategory,
        author_id: user.id,
        moderation_status: moderationStatus,
      });

      if (error) throw error;

      toast({
        title: t("forum.postPublished"),
        description: t("forum.postPublishedDesc"),
      });

      setNewPostTitle("");
      setNewPostContent("");
      setNewPostCategory("general");
      setCreateModalOpen(false);
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: t("common.error"),
        description: "Could not publish post",
        variant: "destructive",
      });
    } finally {
      setCreatingPost(false);
    }
  };

  const handleSendReply = async () => {
    if (!user || !selectedPost || !newReply.trim()) return;

    setSendingReply(true);
    try {
      const { data: moderationData, error: moderationError } = await supabase.functions.invoke(
        "moderate-forum-content",
        {
          body: { content: newReply },
        }
      );

      if (moderationError) throw moderationError;

      if (!moderationData?.approved) {
        toast({
          title: t("forum.contentNotAllowed"),
          description: moderationData?.reason || t("forum.inappropriateContent"),
          variant: "destructive",
        });
        setSendingReply(false);
        return;
      }

      const { error } = await supabase.from("forum_replies").insert({
        post_id: selectedPost.id,
        content: newReply.trim(),
        author_id: user.id,
        moderation_status: "approved",
      });

      if (error) throw error;

      await supabase
        .from("forum_posts")
        .update({ replies_count: (selectedPost.replies_count || 0) + 1 })
        .eq("id", selectedPost.id);

      setNewReply("");
      fetchReplies(selectedPost.id);
      fetchPosts();
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: t("common.error"),
        description: "Could not send reply",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleLike = async (post: ForumPost) => {
    if (!user) {
      toast({
        title: t("forum.loginRequired"),
        description: t("forum.loginToLike"),
        variant: "destructive",
      });
      return;
    }

    try {
      if (post.user_has_liked) {
        await supabase
          .from("forum_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);

        await supabase
          .from("forum_posts")
          .update({ likes_count: Math.max(0, (post.likes_count || 0) - 1) })
          .eq("id", post.id);
      } else {
        await supabase.from("forum_likes").insert({
          post_id: post.id,
          user_id: user.id,
        });

        await supabase
          .from("forum_posts")
          .update({ likes_count: (post.likes_count || 0) + 1 })
          .eq("id", post.id);
      }

      fetchPosts();
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleDeletePost = async () => {
    if (!user || !deletePostId) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("forum_posts")
        .delete()
        .eq("id", deletePostId)
        .eq("author_id", user.id);

      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== deletePostId));
      if (selectedPost?.id === deletePostId) {
        setSelectedPost(null);
      }
      toast({
        title: t("forum.deleted"),
        description: t("forum.postDeleted"),
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: t("common.error"),
        description: "Could not delete post",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeletePostId(null);
    }
  };

  const handleDeleteReply = async () => {
    if (!user || !deleteReplyId || !selectedPost) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("forum_replies")
        .delete()
        .eq("id", deleteReplyId)
        .eq("author_id", user.id);

      if (error) throw error;

      setReplies((prev) => prev.filter((r) => r.id !== deleteReplyId));
      toast({
        title: t("forum.deleted"),
        description: t("forum.replyDeleted"),
      });
    } catch (error) {
      console.error("Error deleting reply:", error);
      toast({
        title: t("common.error"),
        description: "Could not delete reply",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteReplyId(null);
    }
  };

  const openPost = (post: ForumPost) => {
    setSelectedPost(post);
    fetchReplies(post.id);
  };

  const openReportModal = (contentType: "post" | "reply", contentId: string) => {
    if (!user) {
      toast({
        title: t("forum.loginRequired"),
        description: t("report.loginRequired"),
        variant: "destructive",
      });
      return;
    }
    setReportContentType(contentType);
    setReportContentId(contentId);
    setReportReason("");
    setReportDescription("");
    setReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!user || !reportContentId || !reportReason) return;

    setSubmittingReport(true);
    try {
      const { error } = await supabase.from("content_reports").insert({
        reporter_id: user.id,
        content_type: reportContentType,
        content_id: reportContentId,
        reason: reportReason,
        description: reportDescription.trim() || null,
      });

      if (error) throw error;

      toast({
        title: t("report.sent"),
        description: t("report.sentDesc"),
      });
      setReportModalOpen(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: t("common.error"),
        description: "Could not submit report",
        variant: "destructive",
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    const cat = CATEGORIES.find((c) => c.value === value);
    return cat ? t(cat.labelKey) : value;
  };

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("forum.title")}</h1>
              <p className="text-muted-foreground">{t("forum.subtitle")}</p>
            </div>
          </div>
          <Button variant="gameswap" size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("forum.new")}
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filterCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {t("forum.all")}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterCategory === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {t(cat.labelKey)}
            </button>
          ))}
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{t("forum.noPosts")}</h3>
            <p className="text-muted-foreground mb-4">{t("forum.beFirst")}</p>
            <Button variant="gameswap" onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("forum.createPost")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => openPost(post)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author?.avatar_url || undefined} />
                    <AvatarFallback>
                      {post.author?.full_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {post.author?.full_name || "Anonymous"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{post.title}</h3>
                    <p className="text-muted-foreground line-clamp-2 mb-3">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-0.5 bg-muted rounded-full text-xs">
                        {getCategoryLabel(post.category)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(post);
                        }}
                        className={`flex items-center gap-1 text-sm ${
                          post.user_has_liked ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        {post.likes_count || 0}
                      </button>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MessageCircle className="h-4 w-4" />
                        {post.replies_count || 0}
                      </span>
                      {user && post.author_id === user.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletePostId(post.id);
                          }}
                          className="flex items-center gap-1 text-sm text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openReportModal("post", post.id);
                        }}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive ml-auto"
                      >
                        <Flag className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Post Detail Modal */}
        <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {selectedPost && (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedPost.author?.avatar_url || undefined} />
                      <AvatarFallback>
                        {selectedPost.author?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {selectedPost.author?.full_name || "Anonymous"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(selectedPost.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                      </div>
                      <DialogTitle className="text-xl mt-1">{selectedPost.title}</DialogTitle>
                    </div>
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                  <p className="text-foreground whitespace-pre-wrap mb-6">
                    {selectedPost.content}
                  </p>

                  <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
                    <span className="px-2 py-0.5 bg-muted rounded-full text-xs">
                      {getCategoryLabel(selectedPost.category)}
                    </span>
                    <button
                      onClick={() => handleLike(selectedPost)}
                      className={`flex items-center gap-1 text-sm ${
                        selectedPost.user_has_liked ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      {selectedPost.likes_count || 0} {selectedPost.likes_count === 1 ? t("forum.like") : t("forum.likes")}
                    </button>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      {selectedPost.replies_count || 0} {selectedPost.replies_count === 1 ? t("forum.reply") : t("forum.replies")}
                    </span>
                  </div>

                  {/* Replies */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">{t("forum.replies")}</h4>
                    {repliesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : replies.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 text-center">
                        {t("forum.noReplies")} {t("forum.beFirstReply")}
                      </p>
                    ) : (
                      replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3 p-3 bg-muted/50 rounded-xl group">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={reply.author?.avatar_url || undefined} />
                            <AvatarFallback>
                              {reply.author?.full_name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {reply.author?.full_name || "Anonymous"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(reply.created_at), {
                                  addSuffix: true,
                                  locale: dateLocale,
                                })}
                              </span>
                              {user && reply.author_id === user.id && (
                                <button
                                  onClick={() => setDeleteReplyId(reply.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:text-destructive/80 transition-opacity"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => openReportModal("reply", reply.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity ml-auto"
                              >
                                <Flag className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-sm">{reply.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Reply Input */}
                {user && (
                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Input
                      placeholder={t("forum.replyPlaceholder")}
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                    />
                    <Button
                      variant="gameswap"
                      size="icon"
                      onClick={handleSendReply}
                      disabled={!newReply.trim() || sendingReply}
                    >
                      {sendingReply ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Post Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("forum.createPost")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>{t("forum.postTitle")}</Label>
                <Input
                  placeholder={t("forum.postTitlePlaceholder")}
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("forum.postContent")}</Label>
                <Textarea
                  placeholder={t("forum.postContentPlaceholder")}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <Label>{t("forum.category")}</Label>
                <Select value={newPostCategory} onValueChange={setNewPostCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {t(cat.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="gameswap"
                className="w-full"
                onClick={handleCreatePost}
                disabled={!newPostTitle.trim() || !newPostContent.trim() || creatingPost}
              >
                {creatingPost ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("forum.publishing")}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("forum.publish")}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Post Confirmation */}
        <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("forum.deletePost")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("forum.deletePostConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePost}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? t("common.deleting") : t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Reply Confirmation */}
        <AlertDialog open={!!deleteReplyId} onOpenChange={(open) => !open && setDeleteReplyId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("forum.deleteReply")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("forum.deleteReplyConfirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteReply}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? t("common.deleting") : t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Report Modal */}
        <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-destructive" />
                {t("report.title")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>{t("report.reason")}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      onClick={() => setReportReason(reason.value)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        reportReason === reason.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted border-border hover:border-primary/50"
                      }`}
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>{t("report.description")}</Label>
                <Textarea
                  placeholder={t("report.descriptionPlaceholder")}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReportModalOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleSubmitReport}
                  disabled={!reportReason || submittingReport}
                >
                  {submittingReport ? t("report.submitting") : t("report.submit")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Forum;
