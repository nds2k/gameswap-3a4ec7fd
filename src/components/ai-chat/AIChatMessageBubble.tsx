import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AIChatMessageBubbleProps {
  message: {
    role: "user" | "assistant";
    content: string;
  };
}

export const AIChatMessageBubble = ({ message }: AIChatMessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] px-4 py-3 text-[15px] leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
            : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
