import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useCallback, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSend, 
  disabled, 
  placeholder = "Ask a question about your document..." 
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage("");
    }
  }, [message, disabled, onSend]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex gap-2 md:gap-3 items-end" data-testid="chat-input-container">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="resize-none min-h-[44px] max-h-32 text-sm md:text-base"
        rows={1}
        data-testid="input-message"
      />
      
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="h-11 w-11 flex-shrink-0"
        data-testid="button-send-message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
