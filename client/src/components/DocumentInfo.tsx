import { FileText, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DocumentInfoProps {
  fileName: string;
  pageCount?: number;
  uploadedAt?: Date;
  onRemove?: () => void;
}

export default function DocumentInfo({ fileName, pageCount, uploadedAt, onRemove }: DocumentInfoProps) {
  return (
    <Card className="p-4" data-testid="card-document-info">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={fileName} data-testid="text-filename">
                {fileName}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {pageCount && (
                  <Badge variant="secondary" className="text-xs" data-testid="badge-page-count">
                    {pageCount} {pageCount === 1 ? "page" : "pages"}
                  </Badge>
                )}
                {uploadedAt && (
                  <span className="text-xs text-muted-foreground" data-testid="text-upload-time">
                    {uploadedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
            
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="h-6 w-6 flex-shrink-0"
                data-testid="button-remove-document"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
