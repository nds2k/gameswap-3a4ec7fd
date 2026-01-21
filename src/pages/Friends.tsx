import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFriends } from "@/hooks/useFriends";
import { FriendsList } from "@/components/friends/FriendsList";
import { FriendRequests } from "@/components/friends/FriendRequests";
import { FriendsGames } from "@/components/friends/FriendsGames";
import { AddFriendModal } from "@/components/friends/AddFriendModal";
import { MessagesTab } from "@/components/friends/MessagesTab";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Bell, Gamepad2, MessageCircle } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";

const Friends = () => {
  const { 
    friends, 
    pendingReceived, 
    pendingSent, 
    friendsGames, 
    loading,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
  } = useFriends();
  const { conversations } = useMessages();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const pendingCount = pendingReceived.length;
  const unreadMessages = conversations.reduce((acc, c) => acc + c.unread_count, 0);

  return (
    <MainLayout showSearch={false}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Amis & Messages</h1>
          <Button variant="gameswap" onClick={() => setAddModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="messages" className="flex items-center gap-2 relative">
              <MessageCircle className="h-4 w-4" />
              Messages
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="games" className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Jeux
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Amis ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2 relative">
              <Bell className="h-4 w-4" />
              Demandes
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <MessagesTab />
          </TabsContent>

          <TabsContent value="games">
            <FriendsGames games={friendsGames} loading={loading} />
          </TabsContent>

          <TabsContent value="friends">
            <FriendsList 
              friends={friends} 
              loading={loading} 
              onRemove={removeFriend}
            />
          </TabsContent>

          <TabsContent value="requests">
            <FriendRequests 
              received={pendingReceived}
              sent={pendingSent}
              loading={loading}
              onRespond={respondToRequest}
              onCancel={removeFriend}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AddFriendModal 
        open={addModalOpen} 
        onOpenChange={setAddModalOpen}
        onSendRequest={sendFriendRequest}
        existingFriends={friends}
        pendingSent={pendingSent}
      />
    </MainLayout>
  );
};

export default Friends;
