import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCommunity } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, BarChart3, BookOpen, Loader2, User, X } from "lucide-react";

const Community = () => {
  const { user } = useAuth();
  const { polls, stories, loading, createPoll, votePoll, createStory } = useCommunity();
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [storyTitle, setStoryTitle] = useState("");
  const [storyContent, setStoryContent] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreatePoll = async () => {
    const validOptions = pollOptions.filter(o => o.trim());
    if (!pollQuestion.trim() || validOptions.length < 2) return;
    setCreating(true);
    const ok = await createPoll(pollQuestion.trim(), validOptions);
    if (ok) {
      setPollModalOpen(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
    }
    setCreating(false);
  };

  const handleCreateStory = async () => {
    if (!storyTitle.trim() || !storyContent.trim()) return;
    setCreating(true);
    const ok = await createStory(storyTitle.trim(), storyContent.trim());
    if (ok) {
      setStoryModalOpen(false);
      setStoryTitle("");
      setStoryContent("");
    }
    setCreating(false);
  };

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 max-w-2xl mx-auto pb-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Communauté</h1>
            <p className="text-muted-foreground">Sondages et histoires d'échanges</p>
          </div>
        </div>

        <Tabs defaultValue="polls" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="polls" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Sondages
            </TabsTrigger>
            <TabsTrigger value="stories" className="gap-2">
              <BookOpen className="h-4 w-4" /> Histoires
            </TabsTrigger>
          </TabsList>

          <TabsContent value="polls">
            <div className="flex justify-end mb-4">
              <Button variant="gameswap" size="sm" onClick={() => setPollModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nouveau sondage
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : polls.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border border-border">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">Aucun sondage</p>
                <p className="text-sm text-muted-foreground">Créez le premier sondage de la communauté !</p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map(poll => (
                  <div key={poll.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={poll.author?.avatar_url || undefined} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{poll.author?.full_name || "Utilisateur"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                    <h3 className="font-semibold">{poll.question}</h3>
                    <div className="space-y-2">
                      {poll.options.map((option, idx) => {
                        const count = poll.votes[idx] || 0;
                        const pct = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
                        const isSelected = poll.userVote === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => user && votePoll(poll.id, idx)}
                            className={`w-full relative p-3 rounded-xl border text-left transition-all ${
                              isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="absolute inset-0 rounded-xl bg-primary/10 transition-all" style={{ width: `${pct}%` }} />
                            <div className="relative flex items-center justify-between">
                              <span className="text-sm font-medium">{option}</span>
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">{poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stories">
            <div className="flex justify-end mb-4">
              <Button variant="gameswap" size="sm" onClick={() => setStoryModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Raconter une histoire
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : stories.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border border-border">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">Aucune histoire</p>
                <p className="text-sm text-muted-foreground">Partagez votre meilleure expérience d'échange !</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stories.map(story => (
                  <div key={story.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={story.author?.avatar_url || undefined} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{story.author?.full_name || "Utilisateur"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(story.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                    <h3 className="font-semibold">{story.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{story.content}</p>
                    {story.image_url && (
                      <img src={story.image_url} alt="" className="rounded-xl max-h-64 object-cover w-full" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Poll Modal */}
      <Dialog open={pollModalOpen} onOpenChange={setPollModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau sondage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Votre question..."
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
            />
            <div className="space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => {
                      const newOpts = [...pollOptions];
                      newOpts[i] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <Button variant="outline" size="sm" onClick={() => setPollOptions([...pollOptions, ""])}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter une option
                </Button>
              )}
            </div>
            <Button variant="gameswap" className="w-full" onClick={handleCreatePoll} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Publier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Story Modal */}
      <Dialog open={storyModalOpen} onOpenChange={setStoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raconter une histoire d'échange</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Titre de votre histoire..."
              value={storyTitle}
              onChange={e => setStoryTitle(e.target.value)}
            />
            <Textarea
              placeholder="Racontez votre expérience d'échange..."
              value={storyContent}
              onChange={e => setStoryContent(e.target.value)}
              rows={5}
            />
            <Button variant="gameswap" className="w-full" onClick={handleCreateStory} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Publier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Community;