import { useState, useEffect } from "react";
import { MessageSquare, Plus, ThumbsUp, MessageCircle, Loader2, Send, Filter, AlertTriangle, Trash2, Flag } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
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

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harcèlement" },
  { value: "inappropriate", label: "Contenu inapproprié" },
  { value: "illegal", label: "Contenu illégal" },
  { value: "other", label: "Autre" },
];

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

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "strategy", label: "Jeux de stratégie" },
  { value: "party", label: "Jeux d'ambiance" },
  { value: "family", label: "Jeux familiaux" },
  { value: "trading", label: "Échanges" },
  { value: "help", label: "Aide" },
];

const Forum = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
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

      // Fetch authors
      if (postsData && postsData.length > 0) {
        const authorIds = [...new Set(postsData.map((p) => p.author_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", authorIds);

        // Fetch user likes
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
          author: profiles?.find((p) => p.user_id === post.author_id) || null,
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
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", authorIds);

        const repliesWithAuthors = repliesData.map((reply) => ({
          ...reply,
          author: profiles?.find((p) => p.user_id === reply.author_id) || null,
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
      // Call edge function for AI moderation
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
          title: "Contenu non autorisé",
          description: moderationData?.reason || "Votre message contient du contenu inapproprié",
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
        title: "Message publié",
        description: "Votre message a été publié avec succès",
      });

      setNewPostTitle("");
      setNewPostContent("");
      setNewPostCategory("general");
      setCreateModalOpen(false);
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Erreur",
        description: "Impossible de publier le message",
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
      // Call edge function for AI moderation
      const { data: moderationData, error: moderationError } = await supabase.functions.invoke(
        "moderate-forum-content",
        {
          body: { content: newReply },
        }
      );

      if (moderationError) throw moderationError;

      if (!moderationData?.approved) {
        toast({
          title: "Contenu non autorisé",
          description: moderationData?.reason || "Votre réponse contient du contenu inapproprié",
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

      // Update replies count
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
        title: "Erreur",
        description: "Impossible d'envoyer la réponse",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleLike = async (post: ForumPost) => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Connectez-vous pour aimer les messages",
        variant: "destructive",
      });
      return;
    }

    try {
      if (post.user_has_liked) {
        // Unlike
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
        // Like
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
        title: "Message supprimé",
        description: "Votre message a été supprimé avec succès",
      });
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
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
        title: "Réponse supprimée",
        description: "Votre réponse a été supprimée avec succès",
      });
    } catch (error) {
      console.error("Error deleting reply:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la réponse",
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
        title: "Connexion requise",
        description: "Connectez-vous pour signaler du contenu",
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
        title: "Signalement envoyé",
        description: "Merci, nous examinerons ce contenu rapidement",
      });
      setReportModalOpen(false);
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le signalement",
        variant: "destructive",
      });
    } finally {
      setSubmittingReport(false);
    }
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
              <h1 className="text-2xl font-bold">Forum</h1>
              <p className="text-muted-foreground">Discutez avec la communauté</p>
            </div>
          </div>
          <Button variant="gameswap" size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nouveau
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
            Tous
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
              {cat.label}
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
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Aucun message</h3>
            <p className="text-muted-foreground mb-4">Soyez le premier à poster!</p>
            <Button variant="gameswap" onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Créer un sujet
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => openPost(post)}
                className="bg-card rounded-2xl border border-border p-4 cursor-pointer transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {post.author?.full_name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{post.author?.full_name || "Anonyme"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs font-medium mb-2">
                      {CATEGORIES.find((c) => c.value === post.category)?.label || post.category}
                    </span>
                    <h3 className="font-semibold mb-1">{post.title}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2">{post.content}</p>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(post);
                        }}
                        className={`flex items-center gap-1 text-sm ${
                          post.user_has_liked ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <ThumbsUp className={`h-4 w-4 ${post.user_has_liked ? "fill-current" : ""}`} />
                        {post.likes_count || 0}
                      </button>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MessageCircle className="h-4 w-4" />
                        {post.replies_count || 0}
                      </span>
                      
                      {/* Delete button - only for own posts */}
                      {user && post.author_id === user.id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletePostId(post.id);
                          }}
                          className="flex items-center gap-1 text-sm text-destructive hover:text-destructive/80 ml-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : user && post.author_id !== user.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openReportModal("post", post.id);
                          }}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground ml-auto"
                        >
                          <Flag className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau sujet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-600 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Les contenus sont modérés par IA. Respectez les règles de la communauté.</span>
            </div>
            
            <div>
              <Select value={newPostCategory} onValueChange={setNewPostCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Input
              placeholder="Titre du sujet"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
            />
            
            <Textarea
              placeholder="Votre message..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={5}
            />
            
            <Button
              variant="gameswap"
              className="w-full"
              onClick={handleCreatePost}
              disabled={creatingPost || !newPostTitle.trim() || !newPostContent.trim()}
            >
              {creatingPost ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPost.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedPost.author?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedPost.author?.full_name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedPost.author?.full_name || "Anonyme"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(selectedPost.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
                
                <p className="text-foreground whitespace-pre-wrap">{selectedPost.content}</p>
                
                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <button
                    onClick={() => handleLike(selectedPost)}
                    className={`flex items-center gap-1 text-sm ${
                      selectedPost.user_has_liked ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <ThumbsUp className={`h-4 w-4 ${selectedPost.user_has_liked ? "fill-current" : ""}`} />
                    {selectedPost.likes_count || 0}
                  </button>
                </div>

                {/* Replies */}
                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold mb-4">Réponses ({replies.length})</h4>
                  
                  {repliesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : replies.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      Aucune réponse pour le moment
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-3 group">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={reply.author?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {reply.author?.full_name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-muted rounded-lg p-3 relative">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{reply.author?.full_name || "Anonyme"}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: fr })}
                              </span>
                              
                              {/* Delete or Report button */}
                              {user && reply.author_id === user.id ? (
                                <button
                                  onClick={() => setDeleteReplyId(reply.id)}
                                  className="ml-auto text-destructive hover:text-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : user && reply.author_id !== user.id && (
                                <button
                                  onClick={() => openReportModal("reply", reply.id)}
                                  className="ml-auto text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Flag className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-sm">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  <div className="flex items-center gap-2 mt-4">
                    <Textarea
                      placeholder="Écrire une réponse..."
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      variant="gameswap"
                      size="icon"
                      onClick={handleSendReply}
                      disabled={sendingReply || !newReply.trim()}
                    >
                      {sendingReply ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Post Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le message et toutes ses réponses seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Reply Confirmation Dialog */}
      <AlertDialog open={!!deleteReplyId} onOpenChange={(open) => !open && setDeleteReplyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette réponse ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La réponse sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReply}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Signaler ce contenu
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Raison du signalement</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Sélectionnez une raison" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Détails (optionnel)</Label>
              <Textarea
                placeholder="Décrivez le problème..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
                className="mt-1.5"
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setReportModalOpen(false)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleSubmitReport}
                disabled={submittingReport || !reportReason}
              >
                {submittingReport ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Flag className="h-4 w-4 mr-2" />
                )}
                Signaler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Forum;
