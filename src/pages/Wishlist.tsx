import { useState, useEffect } from "react";
import { Heart, Trash2, Plus, FolderPlus, Folder, MoreVertical, Edit2, ChevronLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { GameDetailModal } from "@/components/games/GameDetailModal";

interface WishlistGame {
  id: string;
  game_id: string;
  created_at: string;
  list_name: string | null;
  game: {
    id: string;
    title: string;
    price: number | null;
    image_url: string | null;
    game_type: string;
  } | null;
}

interface WishlistList {
  name: string;
  count: number;
}

const Wishlist = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [wishlistItems, setWishlistItems] = useState<WishlistGame[]>([]);
  const [lists, setLists] = useState<WishlistList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  
  const [createListModalOpen, setCreateListModalOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingList, setEditingList] = useState<string | null>(null);
  const [editListName, setEditListName] = useState("");

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("wishlist")
        .select(`
          id,
          game_id,
          created_at,
          list_name,
          game:games (
            id,
            title,
            price,
            image_url,
            game_type
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setWishlistItems(data || []);

      // Extract unique lists
      const listCounts: Record<string, number> = {};
      data?.forEach((item) => {
        const listName = item.list_name || t("wishlist.uncategorized");
        listCounts[listName] = (listCounts[listName] || 0) + 1;
      });

      const listArray = Object.entries(listCounts).map(([name, count]) => ({ name, count }));
      setLists(listArray);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    setCreateListModalOpen(false);
    setNewListName("");

    toast({
      title: t("common.success"),
      description: `${newListName} created`,
    });

    setLists((prev) => [...prev, { name: newListName.trim(), count: 0 }]);
  };

  const handleRenameList = async (oldName: string, newName: string) => {
    if (!user || !newName.trim() || oldName === newName) {
      setEditingList(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("wishlist")
        .update({ list_name: newName.trim() })
        .eq("user_id", user.id)
        .eq("list_name", oldName === t("wishlist.uncategorized") ? null : oldName);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: `List renamed to "${newName}"`,
      });

      fetchWishlist();
    } catch (error) {
      console.error("Error renaming list:", error);
      toast({
        title: t("common.error"),
        description: "Could not rename list",
        variant: "destructive",
      });
    } finally {
      setEditingList(null);
    }
  };

  const handleMoveToList = async (itemId: string, listName: string | null) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("wishlist")
        .update({ list_name: listName })
        .eq("id", itemId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: listName ? `Moved to "${listName}"` : `Moved to uncategorized`,
      });

      fetchWishlist();
    } catch (error) {
      console.error("Error moving item:", error);
    }
  };

  const handleRemoveFromWishlist = async (itemId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("id", itemId)
        .eq("user_id", user.id);

      if (error) throw error;

      setWishlistItems((prev) => prev.filter((item) => item.id !== itemId));

      toast({
        title: t("common.success"),
        description: t("discover.removeFromWishlist"),
      });

      fetchWishlist();
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const filteredItems = selectedList
    ? wishlistItems.filter((item) => (item.list_name || t("wishlist.uncategorized")) === selectedList)
    : wishlistItems;

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {selectedList ? (
              <button
                onClick={() => setSelectedList(null)}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-destructive" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {selectedList || t("wishlist.title")}
              </h1>
              <p className="text-muted-foreground">
                {filteredItems.length} {filteredItems.length !== 1 ? t("profile.games") : "game"}
              </p>
            </div>
          </div>
          {!selectedList && (
            <Button variant="outline" size="sm" onClick={() => setCreateListModalOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-1" />
              {t("group.create")}
            </Button>
          )}
        </div>

        {/* Lists Grid (when no list selected) */}
        {!selectedList && lists.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {lists.map((list) => (
              <div
                key={list.name}
                className="bg-card rounded-xl border border-border p-4 cursor-pointer transition-all hover:shadow-md group relative"
              >
                {editingList === list.name ? (
                  <Input
                    autoFocus
                    value={editListName}
                    onChange={(e) => setEditListName(e.target.value)}
                    onBlur={() => handleRenameList(list.name, editListName)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameList(list.name, editListName);
                      if (e.key === "Escape") setEditingList(null);
                    }}
                    className="text-sm"
                  />
                ) : (
                  <div onClick={() => setSelectedList(list.name)}>
                    <div className="flex items-center gap-2 mb-2">
                      <Folder className="h-5 w-5 text-primary" />
                      <span className="font-medium truncate flex-1">{list.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {list.count} {list.count !== 1 ? t("profile.games") : "game"}
                    </p>
                  </div>
                )}
                
                {list.name !== t("wishlist.uncategorized") && !editingList && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingList(list.name);
                          setEditListName(list.name);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        {t("profile.edit")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Games List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {selectedList ? t("wishlist.empty") : t("wishlist.empty")}
            </h3>
            <p className="text-muted-foreground mb-4">
              {selectedList ? t("wishlist.emptyDesc") : t("wishlist.emptyDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-card rounded-2xl border border-border p-4 flex gap-4 items-center transition-all hover:shadow-md"
              >
                <div
                  onClick={() => item.game && setSelectedGameId(item.game.id)}
                  className="cursor-pointer"
                >
                  {item.game?.image_url ? (
                    <img
                      src={item.game.image_url}
                      alt={item.game?.title || ""}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                      <span className="text-2xl">🎲</span>
                    </div>
                  )}
                </div>
                
                <div
                  onClick={() => item.game && setSelectedGameId(item.game.id)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <h3 className="font-bold text-lg">{item.game?.title || "Deleted game"}</h3>
                  {item.game?.game_type === "sale" && item.game?.price != null && (
                    <p className="text-primary font-semibold">{item.game.price}€</p>
                  )}
                  {item.list_name && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-muted text-xs">
                      {item.list_name}
                    </span>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {lists
                      .filter((l) => l.name !== (item.list_name || t("wishlist.uncategorized")))
                      .map((list) => (
                        <DropdownMenuItem
                          key={list.name}
                          onClick={() => handleMoveToList(item.id, list.name === t("wishlist.uncategorized") ? null : list.name)}
                        >
                          <Folder className="h-4 w-4 mr-2" />
                          Move to {list.name}
                        </DropdownMenuItem>
                      ))}
                    <DropdownMenuItem
                      onClick={() => handleRemoveFromWishlist(item.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create List Modal */}
      <Dialog open={createListModalOpen} onOpenChange={setCreateListModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("group.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder={t("group.name")}
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
            />
            <Button variant="gameswap" className="w-full" onClick={handleCreateList}>
              <Plus className="h-4 w-4 mr-2" />
              {t("group.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <GameDetailModal
        gameId={selectedGameId}
        open={!!selectedGameId}
        onOpenChange={(open) => !open && setSelectedGameId(null)}
      />
    </MainLayout>
  );
};

export default Wishlist;
