import { PDFParse } from "pdf-parse";

export interface TextChunk {
  text: string;
  pageNumber?: number;
  chunkIndex: number;
}

export class PDFProcessor {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(chunkSize = 1000, chunkOverlap = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  async extractText(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return {
      text: result.text,
      pageCount: result.total,
    };
  }

  chunkText(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, text.length);
      const chunk = text.slice(startIndex, endIndex);

      if (chunk.trim().length > 0) {
        chunks.push({
          text: chunk.trim(),
          chunkIndex: chunkIndex++,
        });
      }

      startIndex += this.chunkSize - this.chunkOverlap;
    }

    return chunks;
  }

  async processFile(buffer: Buffer): Promise<{ text: string; pageCount: number; chunks: TextChunk[] }> {
    const { text, pageCount } = await this.extractText(buffer);
    const chunks = this.chunkText(text);

    return {
      text,
      pageCount,
      chunks,
    };
  }
}

export const pdfProcessor = new PDFProcessor();
