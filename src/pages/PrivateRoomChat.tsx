import { PrivateRoomChat } from "@/components/private-room-chat/PrivateRoomChat";
import { ArrowLeft, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const PrivateRoomChatPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-xl">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Hash className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate">
            {language === "fr" ? "Salon Privé" : "Private Room"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {language === "fr" ? "Messages éphémères" : "Ephemeral messages"}
          </p>
        </div>
      </header>

      {/* Chat body */}
      <div className="flex-1 overflow-hidden">
        <PrivateRoomChat />
      </div>
    </div>
  );
};

export default PrivateRoomChatPage;
