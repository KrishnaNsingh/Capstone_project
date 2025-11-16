import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage.js";
import { ragService } from "./lib/rag-service.js";
import { chatRequestSchema } from "@shared/schema.js";

// Add CORS middleware for all routes
const addCORSHeaders = (req: any, res: any, next: any) => {
  // For production, use specific origin instead of wildcard when credentials are included
  const origin = process.env.NODE_ENV === "production" 
    ? req.get('Origin') || '*'
    : '*';
  
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Remove credentials header to avoid CORS issues
  // res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply CORS middleware to all routes
  app.use(addCORSHeaders);
  
  // Health check endpoint for Vercel
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });
  
  // Simple root endpoint for testing
  app.get("/", (_req, res) => {
    res.status(200).json({ 
      message: "RAG Chatbot API Server is running",
      status: "ok"
    });
  });

  // Upload and process a PDF
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { documentId, pageCount } = await ragService.processDocument(
        req.file.buffer,
        req.file.originalname
      );

      const document = await storage.getDocument(documentId);

      res.json({
        id: document!.id,
        filename: document!.filename,
        pageCount,
        uploadedAt: document!.uploadedAt,
      });
    } catch (error) {
      console.error("Upload error:", error);
      
      // Handle specific error types
      let errorMessage = "Failed to process PDF";
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('503')) {
          statusCode = 503;
          errorMessage = "The AI model is temporarily overloaded. Please try again in a few moments.";
        } else if (error.message.includes('429')) {
          statusCode = 429;
          errorMessage = "Rate limit exceeded. Please wait before making another request.";
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(statusCode).json({ 
        error: errorMessage,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Ask a question about a document
  app.post("/api/chat", async (req, res) => {
    try {
      console.log("Received chat request:", req.body);
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error });
      }

      const { documentId, question } = parsed.data;
      console.log("Processing question for document:", documentId);

      // Verify document exists before creating messages
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const { answer, snippets } = await ragService.answerQuestion(documentId, question);

      const userMessage = await storage.createMessage({
        documentId,
        role: "user",
        content: question,
      });

      const assistantMessage = await storage.createMessage({
        documentId,
        role: "assistant",
        content: answer,
        snippets,
      });

      res.json({
        userMessage: {
          id: userMessage.id,
          role: userMessage.role,
          content: userMessage.content,
          timestamp: userMessage.timestamp,
        },
        assistantMessage: {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          timestamp: assistantMessage.timestamp,
          snippets: assistantMessage.snippets,
        },
      });
    } catch (error) {
      console.error("Chat error:", error);
      const message = error instanceof Error ? error.message : "Failed to process question";
      
      // Handle specific error types
      let statusCode = 500;
      let errorMessage = message;
      
      if (message.includes('503')) {
        statusCode = 503;
        errorMessage = "The AI model is temporarily overloaded. Please try again in a few moments.";
      } else if (message.includes('429')) {
        statusCode = 429;
        errorMessage = "Rate limit exceeded. Please wait before making another request.";
      } else if (message === "Document not found") {
        statusCode = 404;
      }
      
      res.status(statusCode).json({ 
        error: errorMessage,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all documents
  app.get("/api/documents", async (_req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        pageCount: doc.pageCount,
        uploadedAt: doc.uploadedAt,
      })));
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ 
        error: "Failed to fetch documents",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get a specific document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json({
        id: document.id,
        filename: document.filename,
        pageCount: document.pageCount,
        uploadedAt: document.uploadedAt,
      });
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({ 
        error: "Failed to fetch document",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Delete a document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      await ragService.deleteDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ 
        error: "Failed to delete document",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get messages for a document
  app.get("/api/messages/:documentId", async (req, res) => {
    try {
      const messages = await storage.getMessagesByDocumentId(req.params.documentId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ 
        error: "Failed to fetch messages",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Clear messages for a document
  app.delete("/api/messages/:documentId", async (req, res) => {
    try {
      await storage.deleteMessagesByDocumentId(req.params.documentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete messages error:", error);
      res.status(500).json({ 
        error: "Failed to delete messages",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}