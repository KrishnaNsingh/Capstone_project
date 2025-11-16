import { Bot, User } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export default function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";
  
  return (
    <div 
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`message-${role}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2 h-8 w-8 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div className={`flex flex-col gap-1 ${isUser ? "max-w-[85%] md:max-w-[80%]" : "flex-1"}`}>
        <Card 
          className={`p-3 ${isUser ? "bg-primary text-primary-foreground" : ""}`}
          data-testid="card-message-content"
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap" data-testid="text-message-content">
            {content}
          </p>
        </Card>
        
        {timestamp && (
          <span className="text-xs text-muted-foreground px-1" data-testid="text-message-time">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 rounded-lg bg-accent p-2 h-8 w-8 flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
