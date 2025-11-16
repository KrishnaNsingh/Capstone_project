import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, FileUp, Menu } from "lucide-react";
import PDFUploadZone from "@/components/PDFUploadZone";
import DocumentInfo from "@/components/DocumentInfo";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import ContextSnippets from "@/components/ContextSnippets";
import EmptyState from "@/components/EmptyState";
import ThemeToggle from "@/components/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  snippets?: Array<{ text: string; pageNumber?: number; score?: number }>;
}

interface Document {
  id: string;
  filename: string;
  pageCount: number;
  uploadedAt: Date;
}

export default function ChatPage() {
  const [document, setDocument] = useState<Document | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      // Use apiRequest instead of direct fetch to ensure proper backend URL handling
      const response = await apiRequest("POST", "/api/upload", formData);
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setDocument({
        id: data.id,
        filename: data.filename,
        pageCount: data.pageCount,
        uploadedAt: new Date(data.uploadedAt),
      });
      setMessages([]);
      toast({
        title: "PDF uploaded successfully",
        description: `${data.filename} is ready for questions`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload PDF",
        variant: "destructive",
      });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async ({ documentId, question }: { documentId: string; question: string }) => {
      const response = await apiRequest("POST", "/api/chat", { documentId, question });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: data.userMessage.id,
          role: data.userMessage.role,
          content: data.userMessage.content,
          timestamp: new Date(data.userMessage.timestamp),
        },
        {
          id: data.assistantMessage.id,
          role: data.assistantMessage.role,
          content: data.assistantMessage.content,
          timestamp: new Date(data.assistantMessage.timestamp),
          snippets: data.assistantMessage.snippets,
        },
      ]);
    },
    onError: (error) => {
      toast({
        title: "Question failed",
        description: error instanceof Error ? error.message : "Failed to get answer",
        variant: "destructive",
      });
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("DELETE", `/api/messages/${documentId}`);
      return response.json();
    },
    onSuccess: () => {
      setMessages([]);
      toast({
        title: "Chat cleared",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("DELETE", `/api/documents/${documentId}`);
      return response.json();
    },
    onSuccess: () => {
      setDocument(null);
      setMessages([]);
      toast({
        title: "Document removed",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    uploadMutation.mutate(file);
  };

  const handleSendMessage = (content: string) => {
    if (!document) return;
    
    chatMutation.mutate({
      documentId: document.id,
      question: content,
    });
  };

  const handleClearChat = () => {
    if (!document) return;
    clearChatMutation.mutate(document.id);
  };

  const handleRemoveDocument = () => {
    if (!document) return;
    deleteDocumentMutation.mutate(document.id);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileUp className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-semibold">PDF Chat</h1>
        </div>
        <div className="md:block">
          <ThemeToggle />
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
        {!document ? (
          <PDFUploadZone 
            onFileSelect={handleFileSelect}
            isUploading={uploadMutation.isPending}
          />
        ) : (
          <>
            <DocumentInfo
              fileName={document.filename}
              pageCount={document.pageCount}
              uploadedAt={document.uploadedAt}
              onRemove={handleRemoveDocument}
            />
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Actions</h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleClearChat();
                    setSidebarOpen(false);
                  }}
                  className="w-full justify-start gap-2"
                  disabled={messages.length === 0 || clearChatMutation.isPending}
                  data-testid="button-clear-chat"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Chat
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    handleRemoveDocument();
                    setSidebarOpen(false);
                  }}
                  className="w-full justify-start gap-2"
                  disabled={deleteDocumentMutation.isPending}
                  data-testid="button-new-document"
                >
                  <FileUp className="h-4 w-4" />
                  New Document
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">About</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask questions about your PDF and get AI-powered answers based on the document's content using RAG technology with Gemini and Pinecone.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-80 border-r bg-card flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden border-b p-3 flex items-center justify-between gap-3 bg-background">
          <div className="flex items-center gap-2">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-sidebar-toggle">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <FileUp className="h-4 w-4 text-primary" />
              </div>
              <h1 className="font-semibold text-sm">PDF Chat</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex-1 overflow-hidden">
          {!document ? (
            <EmptyState />
          ) : (
            <ScrollArea className="h-full">
              <div ref={scrollRef} className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-3">
                    <ChatMessage
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                    />
                    {message.role === "assistant" && message.snippets && (
                      <div className="md:pl-11">
                        <ContextSnippets snippets={message.snippets} />
                      </div>
                    )}
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>AI is thinking...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="border-t p-3 md:p-4 bg-background/95 backdrop-blur">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              onSend={handleSendMessage}
              disabled={!document || chatMutation.isPending}
              placeholder={
                document 
                  ? "Ask a question about your document..." 
                  : "Upload a PDF to start chatting..."
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
