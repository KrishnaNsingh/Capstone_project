import { Pinecone } from "@pinecone-database/pinecone";
import type { TextChunk } from "./pdf-processor";

const API_KEY = process.env.PINECONE_API_KEY || "";
const INDEX_NAME = process.env.PINECONE_INDEX || "demovercel1";

if (!API_KEY) {
  throw new Error("PINECONE_API_KEY is not set");
}

export interface SearchResult {
  text: string;
  score: number;
  pageNumber?: number;
}

export class PineconeService {
  private pinecone: Pinecone;
  private indexName: string;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: API_KEY,
    });
    this.indexName = INDEX_NAME;
  }

  async upsertEmbeddings(
    documentId: string,
    chunks: TextChunk[],
    embeddings: number[][]
  ): Promise<void> {
    const index = this.pinecone.index(this.indexName);

    const vectors = chunks.map((chunk, i) => {
      const metadata: Record<string, string | number> = {
        documentId,
        text: chunk.text,
        chunkIndex: chunk.chunkIndex,
      };
      
      if (chunk.pageNumber !== undefined) {
        metadata.pageNumber = chunk.pageNumber;
      }
      
      return {
        id: `${documentId}-chunk-${i}`,
        values: embeddings[i],
        metadata,
      };
    });

    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }
  }

  async searchSimilar(
    documentId: string,
    queryEmbedding: number[],
    topK = 5
  ): Promise<SearchResult[]> {
    const index = this.pinecone.index(this.indexName);

    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      filter: { documentId: { $eq: documentId } },
      includeMetadata: true,
    });

    return (queryResponse.matches || []).map((match) => ({
      text: (match.metadata?.text as string) || "",
      score: match.score || 0,
      pageNumber: match.metadata?.pageNumber as number | undefined,
    }));
  }

  async deleteDocumentVectors(documentId: string): Promise<void> {
    const index = this.pinecone.index(this.indexName);
    
    // Serverless indexes don't support metadata filtering for deletion
    // Instead, delete by ID prefix since our IDs follow the pattern: {documentId}-chunk-{i}
    const prefix = `${documentId}-chunk-`;
    
    // List all vectors with this prefix
    const listResponse = await index.listPaginated({ prefix });
    
    // Extract the vector IDs
    const vectorIds = listResponse.vectors?.map((v) => v.id) || [];
    
    // Delete all vectors with matching IDs
    if (vectorIds.length > 0) {
      await index.deleteMany(vectorIds);
    }
  }
}

export const pineconeService = new PineconeService();
