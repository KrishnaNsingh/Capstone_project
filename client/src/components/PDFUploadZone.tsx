import { Upload, FileText, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";

interface PDFUploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  disabled?: boolean;
}

export default function PDFUploadZone({ onFileSelect, isUploading, disabled }: PDFUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      onFileSelect(file);
    }
  }, [disabled, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <Card
      className={`
        relative border-2 border-dashed transition-colors
        ${isDragging ? "border-primary bg-primary/5" : "border-border"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover-elevate"}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="pdf-upload-zone"
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileInput}
        disabled={disabled || isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        data-testid="input-pdf-file"
      />
      
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
        {isUploading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Processing PDF...</p>
              <p className="text-xs text-muted-foreground">This may take a moment</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg bg-primary/10 p-3">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Drop your PDF here or click to browse</p>
              <p className="text-xs text-muted-foreground">Support for PDF files up to 10MB</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
