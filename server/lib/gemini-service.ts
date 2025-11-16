import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export class GeminiService {
  private embeddingModel;
  private generativeModel;

  constructor() {
    this.embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const modelName = process.env.GOOGLE_MODEL || "gemini-2.5-flash-preview-05-20";
    this.generativeModel = genAI.getGenerativeModel({ model: modelName });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Implement retry logic for temporary failures
    const maxRetries = 3;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Generating embedding with model: ${this.embeddingModel.model} (attempt ${attempt}/${maxRetries})`);
        const result = await this.embeddingModel.embedContent(text);
        return result.embedding.values;
      } catch (error) {
        console.error(`Error generating embedding (attempt ${attempt}/${maxRetries}):`, error);
        
        // If this is the last attempt, re-throw the error
        if (attempt === maxRetries) {
          if (error instanceof Error) {
            console.error("Error details:", {
              message: error.message,
              stack: error.stack,
              name: error.name
            });
          }
          throw error;
        }
        
        // For 503 errors, wait before retrying with exponential backoff
        if (error instanceof Error && error.message.includes('503')) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Model overloaded, waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
        } else {
          // For other errors, wait a shorter time
          await delay(1000);
        }
      }
    }
    throw new Error("Failed to generate embedding after all retries");
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      console.log(`Generating ${texts.length} embeddings`);
      const embeddings = await Promise.all(
        texts.map((text) => this.generateEmbedding(text))
      );
      return embeddings;
    } catch (error) {
      console.error("Error generating embeddings:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    }
  }

  async generateAnswer(question: string, context: string): Promise<string> {
    const prompt = `You are a helpful AI assistant answering questions based on the provided document context.

Context from the document:
${context}

Question: ${question}

Please provide a clear and accurate answer based solely on the context provided. If the context doesn't contain enough information to answer the question, say so.

Answer:`;

    // Implement retry logic for temporary failures
    const maxRetries = 3;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Generating answer with model: ${this.generativeModel.model} (attempt ${attempt}/${maxRetries})`);
        const result = await this.generativeModel.generateContent(prompt);
        const response = result.response;
        return response.text();
      } catch (error) {
        console.error(`Error generating answer (attempt ${attempt}/${maxRetries}):`, error);
        
        // If this is the last attempt, re-throw the error
        if (attempt === maxRetries) {
          if (error instanceof Error) {
            console.error("Error details:", {
              message: error.message,
              stack: error.stack,
              name: error.name
            });
          }
          throw error;
        }
        
        // For 503 errors, wait before retrying with exponential backoff
        if (error instanceof Error && error.message.includes('503')) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Model overloaded, waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
        } else {
          // For other errors, wait a shorter time
          await delay(1000);
        }
      }
    }
    throw new Error("Failed to generate answer after all retries");
  }
}

export const geminiService = new GeminiService();
