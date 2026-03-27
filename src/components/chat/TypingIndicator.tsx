interface TypingIndicatorProps {
  users: { name: string; avatar?: string | null }[];
}

export const TypingIndicator = ({ users }: TypingIndicatorProps) => {
  if (users.length === 0) return null;

  const displayText = users.length === 1
    ? `${users[0].name} écrit...`
    : users.length === 2
    ? `${users[0].name} et ${users[1].name} écrivent...`
    : `${users[0].name} et ${users.length - 1} autres écrivent...`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-fade-in">
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user, index) => (
          <div
            key={index}
            className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center overflow-hidden"
          >
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-medium text-primary">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <div className="flex gap-0.5">
          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-xs text-muted-foreground ml-1">{displayText}</span>
      </div>
    </div>
  );
};
