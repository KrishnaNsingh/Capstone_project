import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ContextSnippet {
  text: string;
  pageNumber?: number;
  score?: number;
}

interface ContextSnippetsProps {
  snippets: ContextSnippet[];
}

export default function ContextSnippets({ snippets }: ContextSnippetsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (snippets.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="context-snippets-container">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-8 gap-2"
        data-testid="button-toggle-snippets"
      >
        <FileText className="h-3 w-3" />
        <span className="text-xs">
          {isExpanded ? "Hide" : "View"} Sources ({snippets.length})
        </span>
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {isExpanded && (
        <div className="space-y-2">
          {snippets.map((snippet, index) => (
            <Card 
              key={index} 
              className="p-3 bg-muted/50"
              data-testid={`card-snippet-${index}`}
            >
              <div className="flex items-start gap-2 mb-2">
                {snippet.pageNumber && (
                  <Badge variant="outline" className="text-xs" data-testid={`badge-page-${index}`}>
                    Page {snippet.pageNumber}
                  </Badge>
                )}
                {snippet.score && (
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(snippet.score * 100)}% match
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`text-snippet-${index}`}>
                {snippet.text}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
