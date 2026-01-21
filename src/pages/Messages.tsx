import { MessageCircle, Send, ArrowLeft } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useState } from "react";
import { Link } from "react-router-dom";

interface Conversation {
  id: string;
  user: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  game: string;
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    user: "Marie",
    avatar: "M",
    lastMessage: "Super, on se retrouve demain alors ?",
    timestamp: "14:23",
    unread: 2,
    game: "Catan",
  },
  {
    id: "2",
    user: "Pierre",
    avatar: "P",
    lastMessage: "Est-ce que le jeu est toujours disponible ?",
    timestamp: "Hier",
    unread: 0,
    game: "Ticket to Ride",
  },
  {
    id: "3",
    user: "Sophie",
    avatar: "S",
    lastMessage: "Merci beaucoup !",
    timestamp: "Lun",
    unread: 0,
    game: "Pandemic",
  },
];

const Messages = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const activeConversation = mockConversations.find(c => c.id === selectedConversation);

  if (selectedConversation && activeConversation) {
    return (
      <MainLayout showSearch={false}>
        <div className="container py-4 max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <button
              onClick={() => setSelectedConversation(null)}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="font-bold text-primary">{activeConversation.avatar}</span>
            </div>
            <div>
              <h2 className="font-bold">{activeConversation.user}</h2>
              <p className="text-sm text-muted-foreground">À propos de {activeConversation.game}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 py-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%]">
                  <p>Salut ! Le jeu est toujours disponible ?</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
                  <p>Oui bien sûr ! Tu veux qu'on se retrouve où ?</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%]">
                  <p>{activeConversation.lastMessage}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écrivez un message..."
              className="flex-1 bg-muted rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors">
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSearch={false}>
      <div className="container py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-muted-foreground">{mockConversations.length} conversations</p>
          </div>
        </div>

        {/* Conversations */}
        <div className="space-y-2 animate-fade-in">
          {mockConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-primary/50 transition-all text-left"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-bold text-primary">{conversation.avatar}</span>
                </div>
                {conversation.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {conversation.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold">{conversation.user}</h3>
                  <span className="text-xs text-muted-foreground">{conversation.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
                <p className="text-xs text-primary mt-1">{conversation.game}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Messages;
