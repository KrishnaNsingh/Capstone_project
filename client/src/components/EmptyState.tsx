import { FileQuestion, Upload, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function EmptyState() {
  const examples = [
    "What are the main topics covered?",
    "Summarize the key findings",
    "Explain the methodology used"
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-6 text-center" data-testid="empty-state">
      <div className="max-w-md space-y-4 md:space-y-6">
        <div className="rounded-full bg-primary/10 p-4 md:p-6 inline-flex">
          <FileQuestion className="h-10 w-10 md:h-12 md:w-12 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-semibold">Chat with Your PDF</h2>
          <p className="text-sm md:text-base text-muted-foreground px-2">
            Upload a PDF document to start asking questions and get instant answers powered by AI
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Try asking questions like:</p>
          <div className="grid gap-2">
            {examples.map((example, index) => (
              <Card 
                key={index}
                className="p-2.5 md:p-3 hover-elevate cursor-default"
                data-testid={`card-example-${index}`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-left">{example}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="pt-2 md:pt-4">
          <div className="flex items-center gap-2 justify-center text-xs md:text-sm text-muted-foreground">
            <Upload className="h-4 w-4 flex-shrink-0" />
            <span className="md:hidden">Tap menu to upload</span>
            <span className="hidden md:inline">Upload a PDF from the sidebar to begin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
